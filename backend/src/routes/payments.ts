import type { Request, Response } from 'express';
import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import {
  chargeToken,
  createIrisSession,
  ensureHostProfile,
  getCreationPathForTier,
  getEveryPayCallbackUrl,
  getEveryPayPublicKey,
  getPaymentOverview,
  getPurchaseById,
  getTierPrice,
  insertPendingPurchase,
  markPurchaseFailed,
  markPurchasePaid,
  verifyIrisHash,
  type PurchaseRecord,
} from '../lib/payments';
import { parseNullableTier, parseTier, type Tier } from '../lib/tiers';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildPurchaseResponse = (purchase: PurchaseRecord) => {
  const selectedTier = parseNullableTier(purchase.selected_tier);
  const unlockedTier = parseNullableTier(purchase.unlocked_tier);
  const isUnlocked = purchase.payment_status === 'PAID' && Boolean(unlockedTier);

  return {
    purchaseId: purchase.id,
    selectedTier,
    unlockedTier,
    paymentStatus: purchase.payment_status,
    paymentMethodType: purchase.payment_method_type,
    isUnlocked,
    creationPath: unlockedTier ? getCreationPathForTier(unlockedTier) : null,
  };
};

// ---------------------------------------------------------------------------
// Authenticated routes
// ---------------------------------------------------------------------------

router.use(authMiddleware);

/**
 * GET /status — payment overview for the authenticated user.
 */
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

/**
 * GET /quote — price quote for a given tier.
 */
router.get('/quote', async (req: AuthRequest, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const tier = parseTier(req.query.tier);

    if (!tier) {
      return res.status(400).json({ message: 'Invalid tier selection' });
    }

    const quote = getTierPrice(tier);

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

/**
 * POST /create-session — create a pending payment record.
 *
 * Body: { tier: string, paymentMethod?: 'card' | 'iris' }
 *
 * For card payments:
 *   Returns { purchaseId, publicKey, amount, currency } so the frontend can
 *   initialize the EveryPay payform and collect the card token.
 *
 * For IRIS payments:
 *   Creates an IRIS session with EveryPay and returns
 *   { purchaseId, signature, publicKey, amount, currency } so the frontend
 *   can redirect the user to their banking app.
 */
router.post('/create-session', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const tier = parseTier(req.body?.tier);
    const paymentMethod: string = req.body?.paymentMethod ?? 'card';

    if (!tier) {
      return res.status(400).json({ message: 'Invalid tier selection' });
    }

    if (paymentMethod !== 'card' && paymentMethod !== 'iris') {
      return res.status(400).json({ message: 'paymentMethod must be "card" or "iris"' });
    }

    const quote = getTierPrice(tier);
    if (quote.amount <= 0) {
      return res.status(400).json({ message: 'BASIC tier does not require payment' });
    }

    const overview = await getPaymentOverview(userId);
    if (overview.hasPaidTier && overview.entitledTier) {
      return res.status(409).json({
        message: 'A paid tier is already unlocked for this account',
        ...overview,
      });
    }

    await ensureHostProfile(userId, userEmail);

    const purchase = await insertPendingPurchase({
      userId,
      selectedTier: tier,
      paymentMethodType: paymentMethod,
      customerEmail: userEmail,
    });

    const baseResponse = {
      purchaseId: purchase.id,
      publicKey: getEveryPayPublicKey(),
      amount: quote.amount,
      currency: quote.currency,
    };

    if (paymentMethod === 'iris') {
      const md = JSON.stringify({
        purchaseId: purchase.id,
        userId,
        userEmail,
        tier,
      });

      const irisSession = await createIrisSession(
        quote.amount,
        quote.currency,
        getEveryPayCallbackUrl(),
        md,
      );

      return res.status(201).json({
        ...baseResponse,
        paymentMethod: 'iris',
        signature: irisSession.signature,
      });
    }

    res.status(201).json({
      ...baseResponse,
      paymentMethod: 'card',
    });
  } catch (error) {
    console.error('Error creating payment session:', error);
    res.status(500).json({ message: 'Failed to create payment session' });
  }
});

/**
 * POST /charge — charge a card token obtained from the EveryPay payform.
 *
 * Body: { purchaseId: number, token: string }
 *
 * The backend calls EveryPay POST /payments to finalize the charge,
 * then updates the purchase record accordingly.
 */
router.post('/charge', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const { purchaseId, token } = req.body ?? {};

    if (!purchaseId || !token) {
      return res.status(400).json({ message: 'purchaseId and token are required' });
    }

    const purchase = await getPurchaseById(Number(purchaseId));
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    if (purchase.user_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    if (purchase.payment_status !== 'PENDING') {
      return res.status(409).json({
        message: `Purchase is already ${purchase.payment_status}`,
        ...buildPurchaseResponse(purchase),
      });
    }

    const tier = parseTier(purchase.selected_tier);
    if (!tier) {
      return res.status(400).json({ message: 'Invalid tier on purchase record' });
    }

    const quote = getTierPrice(tier);
    const description = `Elite Memoriz ${tier} one-time purchase`;

    const paymentResult = await chargeToken(
      token,
      quote.amount,
      description,
      userEmail,
      { purchaseId: String(purchase.id), userId, tier },
    );

    if (paymentResult.status === 'Captured') {
      await markPurchasePaid(
        purchase.id,
        paymentResult.token,
        tier,
        userId,
        userEmail,
      );

      const updated = await getPurchaseById(purchase.id);
      return res.json({
        success: true,
        ...buildPurchaseResponse(updated!),
      });
    }

    await markPurchaseFailed(purchase.id);
    const failed = await getPurchaseById(purchase.id);
    res.status(402).json({
      success: false,
      message: 'Payment failed',
      ...buildPurchaseResponse(failed!),
    });
  } catch (error: any) {
    console.error('Error charging card token:', error);

    if (error.statusCode === 402) {
      const { purchaseId } = req.body ?? {};
      if (purchaseId) {
        try { await markPurchaseFailed(Number(purchaseId)); } catch {}
      }
      return res.status(402).json({
        success: false,
        message: error.everypayError?.message ?? 'Payment was declined',
      });
    }

    res.status(500).json({ message: 'Failed to process payment' });
  }
});

/**
 * GET /purchase-status — check the status of a specific purchase.
 */
router.get('/purchase-status', async (req: AuthRequest, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const rawPurchaseId = typeof req.query.purchase_id === 'string' ? req.query.purchase_id.trim() : '';
    const purchaseId = Number(rawPurchaseId);

    if (!rawPurchaseId || !Number.isInteger(purchaseId) || purchaseId <= 0) {
      return res.status(400).json({ message: 'purchase_id is required' });
    }

    const purchase = await getPurchaseById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ message: 'Payment attempt not found' });
    }
    if (purchase.user_id !== req.user!.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(buildPurchaseResponse(purchase));
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ message: 'Failed to verify payment status' });
  }
});

// ---------------------------------------------------------------------------
// EveryPay webhook / IRIS callback handler (unauthenticated)
// ---------------------------------------------------------------------------

/**
 * Handles both:
 *  - IRIS callback POST (form-urlencoded from EveryPay to callback_url)
 *  - IRIS webhook POST (JSON from EveryPay dashboard-configured webhook)
 *
 * Successful body contains: token, md, type, hash
 * Failed body contains: error_status, error_code, error_message, hash, md
 */
export const everyPayWebhookHandler = async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};

    const hash: string | undefined = body.hash;
    const md: string | undefined = body.md;
    const sourceToken: string | undefined = body.token;
    const errorStatus: string | undefined = body.error_status;

    if (!hash) {
      return res.status(400).json({ message: 'Missing hash parameter' });
    }

    const verification = verifyIrisHash(hash);
    if (!verification.valid) {
      console.error('EveryPay webhook: hash verification failed');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    let merchantData: {
      purchaseId?: number;
      userId?: string;
      userEmail?: string;
      tier?: string;
    } = {};

    if (md) {
      try {
        merchantData = JSON.parse(md);
      } catch {
        console.error('EveryPay webhook: failed to parse md field');
        return res.status(400).json({ message: 'Invalid merchant data' });
      }
    }

    const { purchaseId, userId, userEmail, tier } = merchantData;

    if (!purchaseId || !userId || !tier) {
      console.error('EveryPay webhook: missing required merchant data fields');
      return res.status(400).json({ message: 'Incomplete merchant data' });
    }

    if (errorStatus) {
      console.log(`EveryPay webhook: IRIS payment failed for purchase ${purchaseId}`, {
        errorStatus,
        errorCode: body.error_code,
        errorMessage: body.error_message,
      });
      await markPurchaseFailed(purchaseId);
      return res.json({ received: true, status: 'failed' });
    }

    if (!sourceToken) {
      return res.status(400).json({ message: 'Missing source token' });
    }

    const purchase = await getPurchaseById(purchaseId);
    if (!purchase) {
      console.error(`EveryPay webhook: purchase ${purchaseId} not found`);
      return res.status(404).json({ message: 'Purchase not found' });
    }

    if (purchase.payment_status === 'PAID') {
      return res.json({ received: true, status: 'already_paid' });
    }

    const parsedTier = parseTier(tier);
    if (!parsedTier) {
      return res.status(400).json({ message: 'Invalid tier in merchant data' });
    }

    const quote = getTierPrice(parsedTier);
    const description = `Elite Memoriz ${parsedTier} IRIS purchase`;

    try {
      const paymentResult = await chargeToken(
        sourceToken,
        quote.amount,
        description,
        userEmail,
        { purchaseId: String(purchaseId), userId, tier: parsedTier },
      );

      if (paymentResult.status === 'Captured') {
        await markPurchasePaid(
          purchaseId,
          paymentResult.token,
          parsedTier,
          userId,
          userEmail ?? '',
        );
        console.log(`EveryPay webhook: IRIS payment captured for purchase ${purchaseId}`);
        return res.json({ received: true, status: 'captured' });
      }

      await markPurchaseFailed(purchaseId);
      return res.json({ received: true, status: 'failed' });
    } catch (chargeError: any) {
      if (chargeError.statusCode === 400 && chargeError.everypayError?.code === 41001) {
        console.log(`EveryPay webhook: source token already used for purchase ${purchaseId} (idempotent)`);
        return res.json({ received: true, status: 'already_processed' });
      }
      throw chargeError;
    }
  } catch (error) {
    console.error('EveryPay webhook handling failed:', error);
    res.status(500).json({ message: 'Webhook handling failed' });
  }
};

export const paymentRoutes = router;
