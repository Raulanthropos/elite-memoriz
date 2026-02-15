import { Router, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { StorageService } from '../services/storage';

const router = Router();

// Apply auth middleware to all host routes
router.use(authMiddleware);

// GET /events - List all events for the logged-in host
router.get('/events', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id; // Guaranteed by authMiddleware

    const userEvents = await db.query.events.findMany({
      where: eq(schema.events.userId, userId),
      orderBy: [desc(schema.events.date)],
      with: {
        memories: true,
      }
    });

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
    const eventId = parseInt(req.params.id);

    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    // Verify ownership
    const event = await db.query.events.findFirst({
      where: and(eq(schema.events.id, eventId), eq(schema.events.userId, userId))
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found or unauthorized' });
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

// POST /events - Create a new event
router.post('/events', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, date, category } = req.body;

    if (!title || !date || !category) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Generate Slug
    // Simple approach: title-lower-random4chars
    const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${slugBase}-${randomSuffix}`;

    // Verify uniqueness (though random suffix makes collision rare for MVP)
    // For production, a while loop check is better, but this suffices for now.

    const [newEvent] = await db.insert(schema.events).values({
      userId,
      title,
      slug,
      date: new Date(date),
      category: category as 'wedding' | 'baptism' | 'party' | 'other',
      expiresAt: new Date(new Date(date).getTime() + 30 * 24 * 60 * 60 * 1000), // Expire in 30 days
      package: 'BASIC', // Default for now
    }).returning();

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
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
    
    if (!associatedEvent) {
         const evt = await db.query.events.findFirst({
            where: eq(schema.events.id, memory.eventId)
         });
         if (!evt || evt.userId !== userId) return res.status(403).json({ message: 'Unauthorized' });
    } else {
        if (associatedEvent.userId !== userId) return res.status(403).json({ message: 'Unauthorized' });
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
  
      // 1. Verify ownership
      const memory = await db.query.memories.findFirst({
          where: eq(schema.memories.id, memoryId),
          with: { event: true }
      });
  
      if (!memory) return res.status(404).json({ message: 'Memory not found' });
  
      // Check event ownership
      const associatedEvent = memory.event 
          || await db.query.events.findFirst({ where: eq(schema.events.id, memory.eventId) });
      
      if (!associatedEvent || associatedEvent.userId !== userId) {
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
