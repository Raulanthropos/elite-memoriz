CREATE TABLE IF NOT EXISTS "payment_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"selected_tier" text NOT NULL,
	"unlocked_tier" text,
	"stripe_checkout_session_id" text NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_customer_email" text,
	"payment_status" text DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_purchases_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id"),
	CONSTRAINT "payment_purchases_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_purchases_user_id_idx" ON "payment_purchases" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_purchases_status_idx" ON "payment_purchases" ("payment_status");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_purchases" ADD CONSTRAINT "payment_purchases_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
