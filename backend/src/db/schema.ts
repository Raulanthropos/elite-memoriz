import { 
  pgTable, 
  serial, 
  text, 
  timestamp, 
  integer, 
  boolean, 
  varchar, 
  uuid
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- ENUMS & CONSTANTS ---
export const packageTiers = ['BASIC', 'PREMIUM', 'VIP'] as const;

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
  type: text('type', { enum: ['photo', 'video', 'story'] }).default('photo').notNull(),
  storagePath: text('storage_path').notNull(), // The path in Azure/Supabase
  originalText: text('original_text'), // For guest's raw memory
  aiStory: text('ai_story'), // The rewritten story
  isApproved: boolean('is_approved').default(false),
  fileSize: integer('file_size').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

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