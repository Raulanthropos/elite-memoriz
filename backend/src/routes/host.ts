import { Router, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { StorageService } from '../services/storage';
import { getEventExpirationDate, TIER_LIMITS, parseTier } from '../lib/tiers';
import { getLatestPaidPurchaseForUser } from '../lib/payments';
import { deleteEventWithAssets } from '../services/eventCleanup';

const router = Router();
const MAX_AI_STORY_LENGTH = 5_000;

// Apply auth middleware to all host routes
router.use(authMiddleware);

// POST /register-profile - Create specific profile after Supabase Auth
router.post('/register-profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { email } = req.body;

    // Check if exists
    const existing = await db.query.profiles.findFirst({
        where: eq(schema.profiles.id, userId)
    });

    if (existing) {
        return res.json(existing);
    }

    const [newProfile] = await db.insert(schema.profiles).values({
        id: userId,
        email,
        role: 'host',
        tier: 'BASIC'
    }).returning();

    res.status(201).json(newProfile);
  } catch (error) {
    console.error('Profile creation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /profile - Fetch current user profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await db.query.profiles.findFirst({
        where: eq(schema.profiles.id, userId)
    });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json({
      ...profile,
      tier: parseTier(profile.tier) ?? 'BASIC',
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /events - List events (Admin sees all, Host sees own)
router.get('/events', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const traceId = req.requestTraceId ?? `host-events-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();

    console.log(`[HOST_EVENTS_TRACE ${traceId}] route:start`, {
      userId,
    });

    // Fetch Profile
    const profile = await db.query.profiles.findFirst({
        where: eq(schema.profiles.id, userId)
    });

    console.log(`[HOST_EVENTS_TRACE ${traceId}] route:profile-result`, {
      found: Boolean(profile),
      role: profile?.role ?? null,
      tier: profile?.tier ?? null,
    });

    if (!profile) {
        // Auto-create if missing (fallback) or 404
        console.log(`[HOST_EVENTS_TRACE ${traceId}] route:profile-missing`);
        return res.status(404).json({ message: 'Profile not found. Please register.' });
    }

    let userEvents;
    if (profile.role === 'admin') {
        console.log(`[HOST_EVENTS_TRACE ${traceId}] route:querying-admin-events`);
        userEvents = await db.query.events.findMany({
            orderBy: [desc(schema.events.date)],
            with: { memories: true }
        });
    } else {
        console.log(`[HOST_EVENTS_TRACE ${traceId}] route:querying-host-events`);
        userEvents = await db.query.events.findMany({
            where: eq(schema.events.userId, userId),
            orderBy: [desc(schema.events.date)],
            with: { memories: true }
        });
    }

    console.log(`[HOST_EVENTS_TRACE ${traceId}] route:success`, {
      eventCount: Array.isArray(userEvents) ? userEvents.length : null,
      durationMs: Date.now() - startedAt,
    });

    res.json(
      userEvents.map((event) => ({
        ...event,
        package: parseTier(event.package) ?? 'BASIC',
      }))
    );
  } catch (error) {
    console.error('Error fetching host events:', error);
    console.error(`[HOST_EVENTS_TRACE ${req.requestTraceId ?? 'unknown'}] route:exception`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /events/:id/memories - Fetch all memories for a specific event
router.get('/events/:id/memories', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const eventId = req.params.id;
    
    if (!eventId) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    // Fetch Profile for RBAC
    const profile = await db.query.profiles.findFirst({
         where: eq(schema.profiles.id, userId)
    });

    // Verify ownership or Admin
    const event = await db.query.events.findFirst({
      where: eq(schema.events.id, eventId)
    });

    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.userId !== userId && profile?.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    // Fetch memories
    const eventMemories = await db.query.memories.findMany({
      where: eq(schema.memories.eventId, eventId),
      orderBy: [desc(schema.memories.createdAt)]
    });

    res.json(eventMemories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /events - Create a new event with Tier Check
router.post('/events', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, date, category, coverImage, package: reqPackage } = req.body;

    if (!title || !date || !category) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const profile = await db.query.profiles.findFirst({
        where: eq(schema.profiles.id, userId)
    });

    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const requestedTier = reqPackage == null ? null : parseTier(reqPackage);
    if (reqPackage != null && !requestedTier) {
      return res.status(400).json({ message: 'Invalid package tier' });
    }

    const latestPaidPurchase = await getLatestPaidPurchaseForUser(userId);
    if (!latestPaidPurchase) {
      return res.status(403).json({ message: 'Complete payment before creating an event.' });
    }

    const entitledTier = parseTier(latestPaidPurchase.unlockedTier ?? latestPaidPurchase.selectedTier);
    if (!entitledTier) {
      return res.status(500).json({ message: 'Paid entitlement has invalid tier configuration' });
    }

    if (requestedTier && requestedTier !== entitledTier) {
      return res.status(403).json({ message: 'Requested package does not match your unlocked tier.' });
    }

    const eventTier = entitledTier;

    // Check Limits
    const existingEventsCount = await db.select({ count: sql<number>`count(*)` })
        .from(schema.events)
        .where(eq(schema.events.userId, userId));
    const count = Number(existingEventsCount[0].count);

    if (count >= TIER_LIMITS[eventTier].maxEvents) {
        return res.status(403).json({ 
            message: `${eventTier.charAt(0)}${eventTier.slice(1).toLowerCase()} plan limit reached. Please upgrade to create more.` 
        });
    }

    // Generate Slug
    const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${slugBase}-${randomSuffix}`;

    const eventDate = new Date(date);

    const [newEvent] = await db.insert(schema.events).values({
      userId,
      title,
      slug,
      date: eventDate,
      category: category as 'wedding' | 'baptism' | 'party' | 'other',
      coverImage, // Save the cover image (path or URL)
      expiresAt: getEventExpirationDate(eventDate, eventTier),
      package: eventTier, // Inherit tier from profile unless explicitly requested
    }).returning();

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /events/:id - Delete an event (Admin or Owner)
router.delete('/events/:id', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id; // Authenticated User
        const eventId = req.params.id; // Event UUID

        // 1. Fetch Requesting User Profile (to check for admin)
        const profile = await db.query.profiles.findFirst({
            where: eq(schema.profiles.id, userId)
        });

        // 2. Fetch Event
        const event = await db.query.events.findFirst({
            where: eq(schema.events.id, eventId)
        });

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // 3. Permission Check: Must be Owner OR Admin
        const isOwner = event.userId === userId;
        const isAdmin = profile?.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Unauthorized. Only the host or an admin can delete this event.' });
        }

        const { cleanupFailures } = await deleteEventWithAssets(eventId);

        if (cleanupFailures.length > 0) {
            return res.status(200).json({
                message: 'Event deleted successfully, but some stored files could not be removed.',
                cleanupFailures,
            });
        }

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PATCH /memories/:id - Update memory approval status
router.patch('/memories/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id; // Host's Supabase UUID
    const memoryId = parseInt(req.params.id);
    const { isApproved, is360ViewEnabled } = req.body;

    if (
      isNaN(memoryId)
      || (typeof isApproved !== 'boolean' && typeof is360ViewEnabled !== 'boolean')
    ) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    // Fetch Profile
    const profile = await db.query.profiles.findFirst({
        where: eq(schema.profiles.id, userId)
    });

    // 1. Verify ownership: The memory must belong to an event owned by the host
    const memory = await db.query.memories.findFirst({
        where: eq(schema.memories.id, memoryId),
        with: {
            event: true
        }
    });

    if (!memory) {
        return res.status(404).json({ message: 'Memory not found' });
    }

    // Check event ownership
    const associatedEvent = memory.event; 
    
    if (associatedEvent) {
        if (associatedEvent.userId !== userId && profile?.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
    } else {
         // Fallback if relation load failed (unlikely with 'with')
         return res.status(404).json({ message: 'Event not found' });
    }

    const updates: Partial<typeof schema.memories.$inferInsert> = {};

    if (typeof isApproved === 'boolean') {
      updates.isApproved = isApproved;
    }

    if (typeof is360ViewEnabled === 'boolean') {
      const eventTier = parseTier(associatedEvent.package);

      if (eventTier !== 'LUXURY') {
        return res.status(403).json({ message: '360 view is only available for luxury-tier events.' });
      }

      if (memory.type !== 'photo') {
        return res.status(400).json({ message: '360 view can only be enabled for image uploads.' });
      }

      updates.is360ViewEnabled = is360ViewEnabled;
    }

    // 2. Update status
    await db.update(schema.memories)
      .set(updates)
      .where(eq(schema.memories.id, memoryId));

    res.json({ message: 'Success', ...updates });
  } catch (error) {
    console.error('Error updating memory:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /events/:slug/memories/:id - Update a memory AI story
router.patch('/events/:slug/memories/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const slug = typeof req.params.slug === 'string' ? req.params.slug.trim() : '';
    const memoryId = Number.parseInt(req.params.id, 10);
    const aiStory = typeof req.body?.aiStory === 'string' ? req.body.aiStory.trim() : null;

    if (!slug || Number.isNaN(memoryId) || memoryId <= 0 || aiStory == null) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(schema.profiles.id, userId)
    });

    const event = await db.query.events.findFirst({
      where: eq(schema.events.slug, slug)
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.userId !== userId && profile?.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const memory = await db.query.memories.findFirst({
      where: and(
        eq(schema.memories.id, memoryId),
        eq(schema.memories.eventId, event.id)
      )
    });

    if (!memory) {
      return res.status(404).json({ message: 'Memory not found' });
    }

    const nextAiStory = aiStory.slice(0, MAX_AI_STORY_LENGTH) || null;

    await db.update(schema.memories)
      .set({ aiStory: nextAiStory })
      .where(eq(schema.memories.id, memoryId));

    res.json({ message: 'AI story updated', aiStory: nextAiStory, memoryId });
  } catch (error) {
    console.error('Error updating AI story:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /memories/:id - Hard delete memory
router.delete('/memories/:id', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const memoryId = parseInt(req.params.id);
  
      if (isNaN(memoryId)) {
        return res.status(400).json({ message: 'Invalid memory ID' });
      }
  
      const profile = await db.query.profiles.findFirst({
        where: eq(schema.profiles.id, userId)
      });

      // 1. Verify ownership
      const memory = await db.query.memories.findFirst({
          where: eq(schema.memories.id, memoryId),
          with: { event: true }
      });
  
      if (!memory) return res.status(404).json({ message: 'Memory not found' });
  
      const associatedEvent = memory.event;
      
      if (!associatedEvent || (associatedEvent.userId !== userId && profile?.role !== 'admin')) {
          return res.status(403).json({ message: 'Unauthorized' });
      }
  
      // 2. Delete from Storage
      try {
          if (memory.storagePath) {
              await StorageService.deleteFile(memory.storagePath);
          }
      } catch (storageErr) {
          console.error('Storage deletion failed, but proceeding with DB delete:', storageErr);
      }
      
      // 3. Delete from DB
      await db.delete(schema.memories).where(eq(schema.memories.id, memoryId));
  
      res.json({ message: 'Memory deleted permanently' });
    } catch (error) {
      console.error('Error deleting memory:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

export const hostRoutes = router;
