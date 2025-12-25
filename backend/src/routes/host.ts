import { Router, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

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
    // Accessing relation if loaded, otherwise query
    const associatedEvent = memory.event; 
    
    // Safety check just in case relation wasn't returned
    if (!associatedEvent) {
         // Fallback manual query
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

export const hostRoutes = router;
