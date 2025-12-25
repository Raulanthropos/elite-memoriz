import { 
  pgTable, 
  serial, 
  text, 
  timestamp, 
  integer, 
  boolean, 
  varchar 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- ENUMS & CONSTANTS ---
export const packageTiers = ['BASIC', 'PREMIUM', 'VIP'] as const;

// --- TABLES ---

export const hosts = pgTable('hosts', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  hostId: integer('host_id').references(() => hosts.id),
  title: text('title').notNull(),
  date: timestamp('event_date').notNull(),
  coverImage: text('cover_image'),
  welcomeMessage: text('welcome_message'),
  spotifyUrl: text('spotify_url'),
  slug: varchar('slug', { length: 255 }).notNull().unique(), // The "unguessable" URL
  password: text('password'), // Optional event protection
  package: text('package', { enum: packageTiers }).default('BASIC').notNull(),
  storageUsed: integer('storage_used').default(0), // Tracked in bytes or KB
  isExpired: boolean('is_expired').default(false),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id),
  type: text('type', { enum: ['photo', 'video', 'story'] }).notNull(),
  storagePath: text('storage_path').notNull(), // The path in Azure/Supabase
  originalText: text('original_text'), // For guest's raw memory
  aiStory: text('ai_story'), // The rewritten story
  isApproved: boolean('is_approved').default(false),
  fileSize: integer('file_size').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- RELATIONS ---

export const eventRelations = relations(events, ({ one, many }) => ({
  host: one(hosts, { fields: [events.hostId], references: [hosts.id] }),
  uploads: many(uploads),
}));