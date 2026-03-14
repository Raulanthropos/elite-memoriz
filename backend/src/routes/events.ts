import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { db } from '../db';
import { events, memories, eventGuests } from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { StorageService } from '../services/storage';
import { AIService } from '../services/ai';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // Clean, simple temp storage

// Tier Limits
const TIER_LIMITS = {
  BASIC: { maxUploads: 20, maxStorage: 100 * 1024 * 1024 }, 
  PRO: { maxUploads: 100, maxStorage: 500 * 1024 * 1024 }, 
  LUXURY: { maxUploads: Infinity, maxStorage: 2 * 1024 * 1024 * 1024 }, 
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

// GET /:slug/memories - Fetch approved memories for public gallery
router.get('/:slug/memories', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const event = await db.query.events.findFirst({
      where: eq(events.slug, slug),
    });

    if (!event) return res.status(404).json({ message: 'Event not found' });

    const eventMemories = await db.query.memories.findMany({
      where: and(
        eq(memories.eventId, event.id),
        eq(memories.isApproved, true)
      ),
      orderBy: (memories, { desc }) => [desc(memories.createdAt)],
      limit: 50
    });

    res.json(eventMemories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /:slug/upload - Guest upload
router.post('/:slug/upload', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    let { memory } = req.body; // Multer parses this

// FIX: Trust the raw input. Do not convert manually.
const cleanOriginal = memory || '';
    
    console.log('Saving to DB - Original:', cleanOriginal);

    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    // 1. Fetch Event & Current Stats
    const event = await db.query.events.findFirst({
      where: eq(events.slug, slug),
      with: {
        memories: true, 
      }
    });

    if (!event) {
      // Cleanup file if event not found
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check Expiration
    if (event.isExpired || new Date() > event.expiresAt) {
      fs.unlinkSync(file.path);
      return res.status(403).json({ message: 'This event has expired. No new memories can be added.' });
    }

    // 2. Check Tier Limits
    const uploadCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(memories)
      .where(eq(memories.eventId, event.id));
    const currentUploadCount = Number(uploadCountResult[0].count);
    const currentStorageUsed = event.storageUsed || 0;

    // NEW (Fix)
    // 1. Force uppercase to handle "basic" vs "BASIC"
    // 2. Default to 'BASIC' if the value is missing or weird
    const tierKey = (event.package || 'BASIC').toUpperCase();

    // 3. Lookup the tier, but if it fails, FALLBACK to BASIC limits.
    // This guarantees 'limits' is never undefined.
    const limits = (TIER_LIMITS as any)[tierKey] || TIER_LIMITS.BASIC;

    console.log(`Uploading to Tier: ${tierKey}, Limits found:`, !!limits); // Debug log

    if (currentUploadCount >= limits.maxUploads) {
      fs.unlinkSync(file.path);
      return res.status(403).json({ message: `Upload limit reached for ${event.package} tier.` });
    }

    if (currentStorageUsed + file.size > limits.maxStorage) {
      fs.unlinkSync(file.path);
      return res.status(403).json({ message: `Storage limit reached for ${event.package} tier.` });
    }

    // 3. Upload to Storage (Read from Disk)
    const fileBuffer = fs.readFileSync(file.path);
    // Be careful: StorageService expects 'Express.Multer.File'. 
    // We need to overwrite the 'buffer' property which is missing in diskStorage mode.
    file.buffer = fileBuffer; 

    // Generate a unique path: events/{eventId}/{timestamp}-{filename}
    const storagePath = `events/${event.id}/${Date.now()}-${file.originalname}`;
    const publicUrl = await StorageService.uploadFile(file, storagePath);

    // 4. AI Processing
    const aiStory = await AIService.rewriteMemory(cleanOriginal, file.buffer, file.mimetype);

    // 5. Save to DB
    await db.transaction(async (tx) => {
      // Insert memory
      await tx.insert(memories).values({
        eventId: event.id,
        type: 'photo',
        storagePath: storagePath, 
        originalText: cleanOriginal,
        aiStory: aiStory,
        fileSize: file.size,
        isApproved: false,
      });

      // Update event storage usage
      await tx.update(events)
        .set({ storageUsed: currentStorageUsed + file.size })
        .where(eq(events.id, event.id));
    });

    // Cleanup local file
    fs.unlinkSync(file.path);

    res.status(201).json({ 
      message: 'Memory captured successfully!', 
      story: aiStory 
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    // Attempt cleanup if file exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
    }

    res.status(500).json({ 
      message: (error as Error).message, 
      stack: (error as Error).stack, 
      detail: error 
    });
  }
});

// POST /:slug/memories/:id/like - Increment likes for a memory
router.post('/:slug/memories/:id/like', async (req: Request, res: Response) => {
  try {
    const memoryId = parseInt(req.params.id);
    
    if (isNaN(memoryId)) {
        return res.status(400).json({ message: 'Invalid memory ID format' });
    }

    await db.update(memories)
      .set({ likes: sql`${memories.likes} + 1` })
      .where(eq(memories.id, memoryId));

    res.status(200).json({ message: 'Memory liked successfully' });
  } catch (error) {
    console.error('Error liking memory:', error);
    res.status(500).json({ message: 'Internal server error while liking memory' });
  }
});

// POST /:slug/join - Register a guest device and check capacity limits
router.post('/:slug/join', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }

    const eventResult = await db.select().from(events).where(eq(events.slug, slug));
    
    if (eventResult.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = eventResult[0];
    const tierKey = (event.package || 'BASIC').toUpperCase();

    // Only apply hard 100-guest limit to BASIC tier (or legacy FREE tier)
    if (tierKey === 'BASIC' || tierKey === 'FREE') {
      // 1. Check if this specific device is already in the event_guests table
      const existingGuest = await db.select()
        .from(eventGuests)
        .where(
          and(
            eq(eventGuests.eventId, event.id),
            eq(eventGuests.deviceId, deviceId)
          )
        );

      if (existingGuest.length > 0) {
        return res.status(200).json({ message: 'Welcome back' });
      }

      // 2. Since they are new, count how many total guests exist
      const guestCountResult = await db.select({ count: sql<number>`count(*)` })
        .from(eventGuests)
        .where(eq(eventGuests.eventId, event.id));
        
      const currentGuestCount = Number(guestCountResult[0].count);

      // 3. Prevent new joins if gallery is full
      if (currentGuestCount >= 100) {
        return res.status(403).json({ message: 'Gallery Full' });
      }

      // 4. If space is available, add the new guest device to the DB
      await db.insert(eventGuests).values({
        eventId: event.id,
        deviceId: deviceId
      });
    }

    // Return OK
    res.status(200).json({ message: 'Joined successfully' });
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ message: 'Internal server error while joining event' });
  }
});

export const eventRoutes = router;
