ALTER TABLE "payment_purchases" ALTER COLUMN "stripe_checkout_session_id" DROP NOT NULL;
ALTER TABLE "payment_purchases" ADD COLUMN IF NOT EXISTS "payment_method_type" text DEFAULT 'card' NOT NULL;
