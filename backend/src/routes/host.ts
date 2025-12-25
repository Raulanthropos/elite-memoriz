import { Router, Request, Response } from 'express';
import { db } from '../db';
import { events } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all host routes
router.use(authMiddleware);

// GET /events - List all events for the logged-in host
router.get('/events', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id; // Guaranteed by authMiddleware

    const userEvents = await db.query.events.findMany({
      where: eq(events.userId, userId),
      orderBy: [desc(events.date)],
      with: {
        memories: true, // Include count or details if needed?
      }
    });

    res.json(userEvents);
  } catch (error) {
    console.error('Error fetching host events:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export const hostRoutes = router;
