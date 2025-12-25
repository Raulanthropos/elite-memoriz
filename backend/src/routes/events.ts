import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../db';
import { events, memories } from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { StorageService } from '../services/storage';
import { AIService } from '../services/ai';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Tier Limits
const TIER_LIMITS = {
  BASIC: { maxUploads: 20, maxStorage: 100 * 1024 * 1024 }, // 100MB
  PREMIUM: { maxUploads: 100, maxStorage: 500 * 1024 * 1024 }, // 500MB
  VIP: { maxUploads: Infinity, maxStorage: 2 * 1024 * 1024 * 1024 }, // 2GB
};

// GET /:slug - Retrieve event details
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    // Fetch event
    const event = await db.query.events.findFirst({
      where: eq(events.slug, slug),
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.isExpired || new Date() > event.expiresAt) {
      return res.status(403).json({ message: 'Event has expired' });
    }

    // Return public details
    res.json({
      id: event.id,
      title: event.title,
      welcomeMessage: event.welcomeMessage,
      coverImage: event.coverImage,
      date: event.date,
      spotifyUrl: event.spotifyUrl,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /:slug/upload - Guest upload
router.post('/:slug/upload', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { memory } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    // 1. Fetch Event & Current Stats
    const event = await db.query.events.findFirst({
      where: eq(events.slug, slug),
      with: {
        memories: true, // we need count, simpler to assume relations or separate count query
      }
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check Expiration
    if (event.isExpired || new Date() > event.expiresAt) {
      return res.status(403).json({ message: 'This event has expired. No new memories can be added.' });
    }

    // 2. Check Tier Limits
    // Note: event.memories is array if using `with`, but safer to count explicitly if huge.
    // However, for MVP and these limits, checking `memories.length` or explicit count query is fine.
    // Let's do a fast count query to be safe/scalable.
    const uploadCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(memories)
      .where(eq(memories.eventId, event.id));
    const currentUploadCount = Number(uploadCountResult[0].count);
    const currentStorageUsed = event.storageUsed || 0;

    const limits = TIER_LIMITS[event.package as keyof typeof TIER_LIMITS];

    if (currentUploadCount >= limits.maxUploads) {
      return res.status(403).json({ message: `Upload limit reached for ${event.package} tier.` });
    }

    if (currentStorageUsed + file.size > limits.maxStorage) {
      return res.status(403).json({ message: `Storage limit reached for ${event.package} tier.` });
    }

    // 3. Upload to Storage
    // Generate a unique path: events/{eventId}/{timestamp}-{filename}
    // NOTE: We keep 'events' folder structure as implicitly valid. No change needed for storage bucket, it's 'uploads'.
    const storagePath = `events/${event.id}/${Date.now()}-${file.originalname}`;
    const publicUrl = await StorageService.uploadFile(file, storagePath);

    // 4. AI Processing
    const aiStory = memory ? await AIService.rewriteMemory(memory) : '';

    // 5. Save to DB
    await db.transaction(async (tx) => {
      // Insert memory
      await tx.insert(memories).values({
        eventId: event.id,
        type: 'photo',
        storagePath: storagePath, 
        originalText: memory || '',
        aiStory: aiStory,
        fileSize: file.size,
        isApproved: false,
      });

      // Update event storage usage
      await tx.update(events)
        .set({ storageUsed: currentStorageUsed + file.size })
        .where(eq(events.id, event.id));
    });

    res.status(201).json({ 
      message: 'Memory captured successfully!', 
      story: aiStory 
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({ 
      message: (error as Error).message, 
      stack: (error as Error).stack, 
      detail: error 
    });
  }
});

export const eventRoutes = router;
