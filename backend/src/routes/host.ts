import { Router, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { StorageService } from '../services/storage';

const router = Router();

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
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /events - List events (Admin sees all, Host sees own)
router.get('/events', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Fetch Profile
    const profile = await db.query.profiles.findFirst({
        where: eq(schema.profiles.id, userId)
    });

    if (!profile) {
        // Auto-create if missing (fallback) or 404
        return res.status(404).json({ message: 'Profile not found. Please register.' });
    }

    let userEvents;
    if (profile.role === 'admin') {
        userEvents = await db.query.events.findMany({
            orderBy: [desc(schema.events.date)],
            with: { memories: true }
        });
    } else {
        userEvents = await db.query.events.findMany({
            where: eq(schema.events.userId, userId),
            orderBy: [desc(schema.events.date)],
            with: { memories: true }
        });
    }

    res.json(userEvents);
  } catch (error) {
    console.error('Error fetching host events:', error);
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
    const { title, date, category, coverImage } = req.body;

    if (!title || !date || !category) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const profile = await db.query.profiles.findFirst({
        where: eq(schema.profiles.id, userId)
    });

    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    // Check Limits
    const existingEventsCount = await db.select({ count: sql<number>`count(*)` })
        .from(schema.events)
        .where(eq(schema.events.userId, userId));
    const count = Number(existingEventsCount[0].count);

    // Basic Plan Limit: 1 Event
    if (profile.tier === 'BASIC' && count >= 1) {
        return res.status(403).json({ 
            message: 'Basic Plan limit reached (1 Event). Please upgrade to create more.' 
        });
    }

    // Generate Slug
    const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${slugBase}-${randomSuffix}`;

    const [newEvent] = await db.insert(schema.events).values({
      userId,
      title,
      slug,
      date: new Date(date),
      category: category as 'wedding' | 'baptism' | 'party' | 'other',
      coverImage, // Save the cover image (path or URL)
      expiresAt: new Date(new Date(date).getTime() + 30 * 24 * 60 * 60 * 1000), // Expire in 30 days
      package: profile.tier, // Inherit tier from profile
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

        // 4. Delete associated memories first (Optional: Cascade usually handles this, but manual clean up of storage is good)
        // For brevity, we assume Cascade Delete on DB or we just delete the event row.
        // If we need to clean up storage, we'd query memories and delete files here.
        
        // Delete Event
        await db.delete(schema.events).where(eq(schema.events.id, eventId));

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
    const { isApproved } = req.body;

    if (isNaN(memoryId) || typeof isApproved !== 'boolean') {
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

    // 2. Update status
    await db.update(schema.memories)
      .set({ isApproved })
      .where(eq(schema.memories.id, memoryId));

    res.json({ message: 'Success', isApproved });
  } catch (error) {
    console.error('Error updating memory:', error);
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
