import type { Request, Response } from 'express';
import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { db } from '../db';
import * as schema from '../db/schema';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import {
  getCreationPathForTier,
  getFrontendAppUrl,
  getPaymentOverview,
  getPurchaseById,
  getPurchaseBySessionId,
  getStripeClient,
  getStripePriceId,
  getStripeTierPrice,
  getStripeWebhookSecret,
} from '../lib/payments';
import { parseNullableTier, parseTier, type Tier } from '../lib/tiers';

const router = Router();

const CARD_PAYMENT_METHOD_TYPE = 'card';

type PurchaseStatusUpdate = 'FAILED' | 'EXPIRED';

type PaidPurchaseInput = {
  userId: string;
  userEmail: string;
  tier: Tier;
  paymentMethodType: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeCustomerEmail?: string | null;
  expiresAt?: Date | null;
};

const getSessionPaymentIntentId = (session: Stripe.Checkout.Session) => {
  if (typeof session.payment_intent === 'string') {
    return session.payment_intent;
  }

  return session.payment_intent?.id ?? null;
};

const getPaymentIntentEmail = (paymentIntent: Stripe.PaymentIntent) => {
  if (typeof paymentIntent.receipt_email === 'string' && paymentIntent.receipt_email.trim()) {
    return paymentIntent.receipt_email.trim();
  }

  if (paymentIntent.metadata?.userEmail?.trim()) {
    return paymentIntent.metadata.userEmail.trim();
  }

  return '';
};

const ensureHostProfile = async (userId: string, email: string) => {
  await db
    .insert(schema.profiles)
    .values({
      id: userId,
      email,
      role: 'host',
      tier: 'BASIC',
    })
    .onConflictDoNothing();
};

const findExistingPurchase = async (
  tx: typeof db,
  ids: { stripeCheckoutSessionId?: string | null; stripePaymentIntentId?: string | null }
) => {
  if (ids.stripePaymentIntentId) {
    const rows = await tx
      .select()
      .from(schema.paymentPurchases)
      .where(eq(schema.paymentPurchases.stripePaymentIntentId, ids.stripePaymentIntentId))
      .limit(1);

    if (rows[0]) {
      return rows[0];
    }
  }

  if (ids.stripeCheckoutSessionId) {
    const rows = await tx
      .select()
      .from(schema.paymentPurchases)
      .where(eq(schema.paymentPurchases.stripeCheckoutSessionId, ids.stripeCheckoutSessionId))
      .limit(1);

    return rows[0] ?? null;
  }

  return null;
};

const markPurchaseStatusBySession = async (
  checkoutSession: Stripe.Checkout.Session,
  nextStatus: PurchaseStatusUpdate
) => {
  const sessionId = checkoutSession.id;
  const now = new Date();

  await db
    .update(schema.paymentPurchases)
    .set({
      paymentStatus: nextStatus,
      expiresAt: checkoutSession.expires_at ? new Date(checkoutSession.expires_at * 1000) : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.paymentPurchases.stripeCheckoutSessionId, sessionId),
        eq(schema.paymentPurchases.paymentStatus, 'PENDING')
      )
    );
};

const markPurchaseStatusByPaymentIntent = async (
  paymentIntentId: string,
  nextStatus: Exclude<PurchaseStatusUpdate, 'EXPIRED'>
) => {
  await db
    .update(schema.paymentPurchases)
    .set({
      paymentStatus: nextStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.paymentPurchases.stripePaymentIntentId, paymentIntentId),
        eq(schema.paymentPurchases.paymentStatus, 'PENDING')
      )
    );
};

const markPurchasePaid = async ({
  userId,
  userEmail,
  tier,
  paymentMethodType,
  stripeCheckoutSessionId = null,
  stripePaymentIntentId = null,
  stripeCustomerEmail = null,
  expiresAt = null,
}: PaidPurchaseInput) => {
  if (!stripeCheckoutSessionId && !stripePaymentIntentId) {
    throw new Error('Paid purchase update requires a Stripe session or payment intent identifier');
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    const existingPurchase = await findExistingPurchase(tx, {
      stripeCheckoutSessionId,
      stripePaymentIntentId,
    });

    const nextValues = {
      userId,
      selectedTier: tier,
      unlockedTier: tier,
      paymentMethodType: paymentMethodType || existingPurchase?.paymentMethodType || CARD_PAYMENT_METHOD_TYPE,
      stripeCheckoutSessionId: stripeCheckoutSessionId ?? existingPurchase?.stripeCheckoutSessionId ?? null,
      stripePaymentIntentId: stripePaymentIntentId ?? existingPurchase?.stripePaymentIntentId ?? null,
      stripeCustomerEmail: stripeCustomerEmail || existingPurchase?.stripeCustomerEmail || null,
      paymentStatus: 'PAID' as const,
      paidAt: now,
      expiresAt: expiresAt ?? existingPurchase?.expiresAt ?? null,
      updatedAt: now,
    };

    if (existingPurchase?.paymentStatus !== 'PAID') {
      if (existingPurchase) {
        await tx
          .update(schema.paymentPurchases)
          .set(nextValues)
          .where(eq(schema.paymentPurchases.id, existingPurchase.id));
      } else {
        await tx.insert(schema.paymentPurchases).values(nextValues);
      }
    }

    await tx
      .insert(schema.profiles)
      .values({
        id: userId,
        email: userEmail || stripeCustomerEmail || `${userId}@local.invalid`,
        role: 'host',
        tier,
      })
      .onConflictDoUpdate({
        target: schema.profiles.id,
        set: userEmail || stripeCustomerEmail
          ? {
              email: userEmail || stripeCustomerEmail!,
              tier,
            }
          : {
              tier,
            },
      });
  });
};

const extractCheckoutPaymentInput = (checkoutSession: Stripe.Checkout.Session): PaidPurchaseInput => {
  const userId = checkoutSession.metadata?.userId?.trim();
  const userEmail = checkoutSession.metadata?.userEmail?.trim() || '';
  const tier = parseTier(checkoutSession.metadata?.selectedTier);

  if (!userId || !tier) {
    throw new Error(`Stripe Checkout session ${checkoutSession.id} is missing required metadata`);
  }

  return {
    userId,
    userEmail,
    tier,
    paymentMethodType: CARD_PAYMENT_METHOD_TYPE,
    stripeCheckoutSessionId: checkoutSession.id,
    stripePaymentIntentId: getSessionPaymentIntentId(checkoutSession),
    stripeCustomerEmail:
      checkoutSession.customer_details?.email?.trim()
      || checkoutSession.customer_email?.trim()
      || userEmail
      || null,
    expiresAt: checkoutSession.expires_at ? new Date(checkoutSession.expires_at * 1000) : null,
  };
};

const extractPaymentIntentInput = (paymentIntent: Stripe.PaymentIntent): PaidPurchaseInput => {
  const userId = paymentIntent.metadata?.userId?.trim();
  const userEmail = paymentIntent.metadata?.userEmail?.trim() || '';
  const tier = parseTier(paymentIntent.metadata?.selectedTier);

  if (!userId || !tier) {
    throw new Error(`Stripe PaymentIntent ${paymentIntent.id} is missing required metadata`);
  }

  return {
    userId,
    userEmail,
    tier,
    paymentMethodType: CARD_PAYMENT_METHOD_TYPE,
    stripePaymentIntentId: paymentIntent.id,
    stripeCustomerEmail: getPaymentIntentEmail(paymentIntent) || userEmail || null,
  };
};

const buildPurchaseResponse = (
  purchase: typeof schema.paymentPurchases.$inferSelect,
  stripeState?: {
    stripeCheckoutStatus?: string | null;
    stripePaymentStatus?: string | null;
    stripePaymentIntentStatus?: string | null;
  }
) => {
  const selectedTier = parseNullableTier(purchase.selectedTier);
  const unlockedTier = parseNullableTier(purchase.unlockedTier);
  const isUnlocked = purchase.paymentStatus === 'PAID' && Boolean(unlockedTier);

  return {
    purchaseId: purchase.id,
    selectedTier,
    unlockedTier,
    paymentStatus: purchase.paymentStatus,
    paymentMethodType: purchase.paymentMethodType,
    isUnlocked,
    creationPath: unlockedTier ? getCreationPathForTier(unlockedTier) : null,
    stripeCheckoutStatus: stripeState?.stripeCheckoutStatus ?? null,
    stripePaymentStatus: stripeState?.stripePaymentStatus ?? null,
    stripePaymentIntentStatus: stripeState?.stripePaymentIntentStatus ?? null,
  };
};

router.use(authMiddleware);

router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const overview = await getPaymentOverview(req.user!.id);
    res.json(overview);
  } catch (error) {
    console.error('Error fetching payment overview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/quote', async (req: AuthRequest, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const tier = parseTier(req.query.tier);

    if (!tier) {
      return res.status(400).json({ message: 'Invalid tier selection' });
    }

    const quote = await getStripeTierPrice(tier);

    res.json({
      tier,
      amount: quote.amount,
      currency: quote.currency,
    });
  } catch (error) {
    console.error('Error fetching payment quote:', error);
    res.status(500).json({ message: 'Failed to load payment configuration' });
  }
});

router.post('/payment-intents', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const tier = parseTier(req.body?.tier);

    if (!tier) {
      return res.status(400).json({ message: 'Invalid tier selection' });
    }

    const overview = await getPaymentOverview(userId);
    if (overview.hasPaidTier && overview.entitledTier) {
      return res.status(409).json({
        message: 'A paid tier is already unlocked for this account',
        ...overview,
      });
    }

    await ensureHostProfile(userId, userEmail);

    const quote = await getStripeTierPrice(tier);
    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: quote.amount,
      currency: quote.currency,
      payment_method_types: [CARD_PAYMENT_METHOD_TYPE],
      receipt_email: userEmail,
      metadata: {
        userId,
        userEmail,
        selectedTier: tier,
      },
      description: `Elite Memoriz ${tier} one-time purchase`,
    });

    const [purchase] = await db.insert(schema.paymentPurchases).values({
      userId,
      selectedTier: tier,
      paymentMethodType: CARD_PAYMENT_METHOD_TYPE,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerEmail: userEmail,
      paymentStatus: 'PENDING',
      updatedAt: new Date(),
    }).returning({
      id: schema.paymentPurchases.id,
    });

    res.status(201).json({
      purchaseId: purchase.id,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: quote.amount,
      currency: quote.currency,
    });
  } catch (error) {
    console.error('Error creating Stripe PaymentIntent:', error);
    res.status(500).json({ message: 'Failed to initialize payment' });
  }
});

router.post('/checkout-sessions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const tier = parseTier(req.body?.tier);

    if (!tier) {
      return res.status(400).json({ message: 'Invalid tier selection' });
    }

    const overview = await getPaymentOverview(userId);
    if (overview.hasPaidTier && overview.entitledTier) {
      return res.status(409).json({
        message: 'A paid tier is already unlocked for this account',
        ...overview,
      });
    }

    await ensureHostProfile(userId, userEmail);

    const stripe = getStripeClient();
    const frontendUrl = getFrontendAppUrl(req.get('origin'));
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: userId,
      customer_email: userEmail,
      line_items: [
        {
          price: getStripePriceId(tier),
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/cancel?tier=${encodeURIComponent(tier)}`,
      metadata: {
        userId,
        userEmail,
        selectedTier: tier,
      },
      payment_intent_data: {
        metadata: {
          userId,
          userEmail,
          selectedTier: tier,
        },
      },
    });

    if (!session.url) {
      return res.status(500).json({ message: 'Stripe Checkout session did not return a redirect URL' });
    }

    await db.insert(schema.paymentPurchases).values({
      userId,
      selectedTier: tier,
      paymentMethodType: CARD_PAYMENT_METHOD_TYPE,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: getSessionPaymentIntentId(session),
      stripeCustomerEmail: userEmail,
      paymentStatus: 'PENDING',
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null,
      updatedAt: new Date(),
    });

    res.status(201).json({
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error('Error creating Stripe Checkout session:', error);
    res.status(500).json({ message: 'Failed to create payment session' });
  }
});

router.get('/purchase-status', async (req: AuthRequest, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const rawPurchaseId = typeof req.query.purchase_id === 'string' ? req.query.purchase_id.trim() : '';
    const purchaseId = Number(rawPurchaseId);

    if (!rawPurchaseId || !Number.isInteger(purchaseId) || purchaseId <= 0) {
      return res.status(400).json({ message: 'purchase_id is required' });
    }

    let purchase = await getPurchaseById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ message: 'Payment attempt not found' });
    }

    if (purchase.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    let stripeState: {
      stripeCheckoutStatus?: string | null;
      stripePaymentStatus?: string | null;
      stripePaymentIntentStatus?: string | null;
    } = {};

    if (purchase.stripePaymentIntentId) {
      const paymentIntent = await getStripeClient().paymentIntents.retrieve(purchase.stripePaymentIntentId);

      if (paymentIntent.metadata?.userId && paymentIntent.metadata.userId !== req.user!.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      stripeState = {
        stripePaymentIntentStatus: paymentIntent.status,
      };

      if (purchase.paymentStatus === 'PENDING' && paymentIntent.status === 'succeeded') {
        await markPurchasePaid(extractPaymentIntentInput(paymentIntent));
        purchase = await getPurchaseById(purchaseId);
        if (!purchase) {
          return res.status(404).json({ message: 'Payment attempt not found' });
        }
      }

      if (
        purchase.paymentStatus === 'PENDING'
        && (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method')
      ) {
        await markPurchaseStatusByPaymentIntent(paymentIntent.id, 'FAILED');
        purchase = await getPurchaseById(purchaseId);
        if (!purchase) {
          return res.status(404).json({ message: 'Payment attempt not found' });
        }
      }
    } else if (purchase.stripeCheckoutSessionId) {
      const checkoutSession = await getStripeClient().checkout.sessions.retrieve(purchase.stripeCheckoutSessionId);

      if (checkoutSession.metadata?.userId && checkoutSession.metadata.userId !== req.user!.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      stripeState = {
        stripeCheckoutStatus: checkoutSession.status ?? null,
        stripePaymentStatus: checkoutSession.payment_status ?? null,
      };

      if (
        purchase.paymentStatus === 'PENDING'
        && checkoutSession.status === 'complete'
        && checkoutSession.payment_status === 'paid'
      ) {
        await markPurchasePaid(extractCheckoutPaymentInput(checkoutSession));
        purchase = await getPurchaseById(purchaseId);
        if (!purchase) {
          return res.status(404).json({ message: 'Payment attempt not found' });
        }
      }

      if (purchase.paymentStatus === 'PENDING' && checkoutSession.status === 'expired') {
        await markPurchaseStatusBySession(checkoutSession, 'EXPIRED');
        purchase = await getPurchaseById(purchaseId);
        if (!purchase) {
          return res.status(404).json({ message: 'Payment attempt not found' });
        }
      }
    }

    res.json(buildPurchaseResponse(purchase, stripeState));
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ message: 'Failed to verify payment status' });
  }
});

router.get('/checkout-session-status', async (req: AuthRequest, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id.trim() : '';

    if (!sessionId) {
      return res.status(400).json({ message: 'session_id is required' });
    }

    let purchase = await getPurchaseBySessionId(sessionId);
    if (!purchase) {
      return res.status(404).json({ message: 'Checkout session not found' });
    }

    if (purchase.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.metadata?.userId && checkoutSession.metadata.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (
      purchase.paymentStatus === 'PENDING'
      && checkoutSession.status === 'complete'
      && checkoutSession.payment_status === 'paid'
    ) {
      await markPurchasePaid(extractCheckoutPaymentInput(checkoutSession));
      purchase = await getPurchaseBySessionId(sessionId);
      if (!purchase) {
        return res.status(404).json({ message: 'Checkout session not found' });
      }
    }

    if (purchase.paymentStatus === 'PENDING' && checkoutSession.status === 'expired') {
      await markPurchaseStatusBySession(checkoutSession, 'EXPIRED');
      purchase = await getPurchaseBySessionId(sessionId);
      if (!purchase) {
        return res.status(404).json({ message: 'Checkout session not found' });
      }
    }

    const selectedTier = parseNullableTier(purchase.selectedTier);
    const unlockedTier = parseNullableTier(purchase.unlockedTier);
    const isUnlocked = purchase.paymentStatus === 'PAID' && Boolean(unlockedTier);

    res.json({
      sessionId,
      selectedTier,
      unlockedTier,
      paymentStatus: purchase.paymentStatus,
      isUnlocked,
      creationPath: unlockedTier ? getCreationPathForTier(unlockedTier) : null,
      stripeCheckoutStatus: checkoutSession.status ?? null,
      stripePaymentStatus: checkoutSession.payment_status ?? null,
    });
  } catch (error) {
    console.error('Error checking Checkout session status:', error);
    res.status(500).json({ message: 'Failed to verify payment status' });
  }
});

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || Array.isArray(signature)) {
    return res.status(400).send('Missing Stripe signature');
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);

  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return res.status(400).send('Invalid Stripe signature');
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        await markPurchasePaid(extractPaymentIntentInput(event.data.object as Stripe.PaymentIntent));
        break;
      }
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await markPurchaseStatusByPaymentIntent(paymentIntent.id, 'FAILED');
        break;
      }
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;

        if (checkoutSession.payment_status === 'paid') {
          await markPurchasePaid(extractCheckoutPaymentInput(checkoutSession));
        }
        break;
      }
      case 'checkout.session.async_payment_failed': {
        await markPurchaseStatusBySession(event.data.object as Stripe.Checkout.Session, 'FAILED');
        break;
      }
      case 'checkout.session.expired': {
        await markPurchaseStatusBySession(event.data.object as Stripe.Checkout.Session, 'EXPIRED');
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook handling failed for ${event.type}:`, error);
    res.status(500).send('Webhook handling failed');
  }
};

export const paymentRoutes = router;
