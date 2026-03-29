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
  getPurchaseBySessionId,
  getStripeClient,
  getStripePriceId,
  getStripeWebhookSecret,
} from '../lib/payments';
import { parseTier } from '../lib/tiers';

const router = Router();

const getSessionPaymentIntentId = (session: Stripe.Checkout.Session) => {
  if (typeof session.payment_intent === 'string') {
    return session.payment_intent;
  }

  return session.payment_intent?.id ?? null;
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

const markPurchaseStatus = async (
  checkoutSession: Stripe.Checkout.Session,
  nextStatus: 'FAILED' | 'EXPIRED'
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

const markPurchasePaid = async (checkoutSession: Stripe.Checkout.Session) => {
  const userId = checkoutSession.metadata?.userId?.trim();
  const userEmail =
    checkoutSession.metadata?.userEmail?.trim()
    || checkoutSession.customer_details?.email?.trim()
    || checkoutSession.customer_email?.trim()
    || '';
  const tier = parseTier(checkoutSession.metadata?.selectedTier);

  if (!userId || !tier) {
    throw new Error(`Stripe Checkout session ${checkoutSession.id} is missing required metadata`);
  }

  const sessionId = checkoutSession.id;
  const paymentIntentId = getSessionPaymentIntentId(checkoutSession);
  const now = new Date();
  const expiresAt = checkoutSession.expires_at ? new Date(checkoutSession.expires_at * 1000) : null;

  await db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(schema.paymentPurchases)
      .where(eq(schema.paymentPurchases.stripeCheckoutSessionId, sessionId))
      .limit(1);

    const existingPurchase = existingRows[0] ?? null;

    if (existingPurchase?.paymentStatus !== 'PAID') {
      const nextValues = {
        userId,
        selectedTier: tier,
        unlockedTier: tier,
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerEmail: userEmail || null,
        paymentStatus: 'PAID' as const,
        paidAt: now,
        expiresAt,
        updatedAt: now,
      };

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
        email: userEmail || `${userId}@local.invalid`,
        role: 'host',
        tier,
      })
      .onConflictDoUpdate({
        target: schema.profiles.id,
        set: userEmail
          ? {
              email: userEmail,
              tier,
            }
          : {
              tier,
            },
      });
  });
};

router.use(authMiddleware);

router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const overview = await getPaymentOverview(req.user!.id);
    res.json(overview);
  } catch (error) {
    console.error('Error fetching payment overview:', error);
    res.status(500).json({ message: 'Internal server error' });
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

router.get('/checkout-session-status', async (req: AuthRequest, res: Response) => {
  try {
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

    if (purchase.paymentStatus === 'PENDING' && checkoutSession.status === 'expired') {
      await markPurchaseStatus(checkoutSession, 'EXPIRED');
      purchase = await getPurchaseBySessionId(sessionId);
      if (!purchase) {
        return res.status(404).json({ message: 'Checkout session not found' });
      }
    }

    const selectedTier = parseTier(purchase.selectedTier);
    const unlockedTier = parseTier(purchase.unlockedTier);
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
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;

        if (checkoutSession.payment_status === 'paid') {
          await markPurchasePaid(checkoutSession);
        }
        break;
      }
      case 'checkout.session.async_payment_failed': {
        await markPurchaseStatus(event.data.object as Stripe.Checkout.Session, 'FAILED');
        break;
      }
      case 'checkout.session.expired': {
        await markPurchaseStatus(event.data.object as Stripe.Checkout.Session, 'EXPIRED');
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
