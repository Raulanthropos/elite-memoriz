import { 
  pgTable, 
  serial, 
  text, 
  timestamp, 
  integer, 
  boolean, 
  varchar, 
  uuid,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { TIERS } from '../lib/tiers';

// --- ENUMS & CONSTANTS ---
export const packageTiers = TIERS;
export const paymentStatuses = ['PENDING', 'PAID', 'FAILED', 'EXPIRED'] as const;

export const profiles = pgTable('profiles', {
  // FIX: Use uuid, not serial. This ID matches auth.users.id directly.
  id: uuid('id').primaryKey().notNull(), 
  email: text('email').notNull(),
  role: text('role', { enum: ['admin', 'host'] }).default('host').notNull(),
  tier: text('tier', { enum: packageTiers }).default('BASIC').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(), // Better to use UUID for events too
  
  // FIX: Must be uuid to match the database column type
  userId: uuid('user_id').notNull().references(() => profiles.id), 
  
  title: text('title').notNull(),
  date: timestamp('event_date').notNull(),
  coverImage: text('cover_image'),
  welcomeMessage: text('welcome_message'),
  spotifyUrl: text('spotify_url'),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  password: text('password'),
  category: text('category', { enum: ['wedding', 'baptism', 'party', 'other'] }).default('other').notNull(),
  package: text('package', { enum: packageTiers }).default('BASIC').notNull(),
  storageUsed: integer('storage_used').default(0),
  isExpired: boolean('is_expired').default(false),
  expiresAt: timestamp('expires_at'), // Made optional to prevent errors if not set immediately
  createdAt: timestamp('created_at').defaultNow(),
});

export const memories = pgTable('memories', {
  id: serial('id').primaryKey(),
  eventId: uuid('event_id').references(() => events.id),
  type: text('type', { enum: ['photo', 'video', 'audio', 'story'] }).default('photo').notNull(),
  storagePath: text('storage_path').notNull(), // The path in Azure/Supabase
  originalText: text('original_text'), // For guest's raw memory
  aiStory: text('ai_story'), // The rewritten story
  is360ViewEnabled: boolean('is_360_view_enabled').default(false).notNull(),
  isApproved: boolean('is_approved').default(false),
  fileSize: integer('file_size').notNull(),
  likes: integer('likes').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const eventGuests = pgTable('event_guests', {
  id: serial('id').primaryKey(),
  eventId: uuid('event_id').references(() => events.id).notNull(),
  deviceId: varchar('device_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const paymentPurchases = pgTable(
  'payment_purchases',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').notNull().references(() => profiles.id),
    selectedTier: text('selected_tier', { enum: packageTiers }).notNull(),
    unlockedTier: text('unlocked_tier', { enum: packageTiers }),
    stripeCheckoutSessionId: text('stripe_checkout_session_id').notNull().unique(),
    stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
    stripeCustomerEmail: text('stripe_customer_email'),
    paymentStatus: text('payment_status', { enum: paymentStatuses }).default('PENDING').notNull(),
    paidAt: timestamp('paid_at'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    paymentPurchasesUserIdIdx: index('payment_purchases_user_id_idx').on(table.userId),
    paymentPurchasesStatusIdx: index('payment_purchases_status_idx').on(table.paymentStatus),
  })
);

// --- RELATIONS ---

export const eventRelations = relations(events, ({ many }) => ({
  memories: many(memories),
}));

export const memoryRelations = relations(memories, ({ one }) => ({
  event: one(events, {
    fields: [memories.eventId],
    references: [events.id],
  }),
}));
