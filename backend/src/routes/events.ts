import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { db } from '../db';
import { events, memories, eventGuests } from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { StorageService } from '../services/storage';
import { AIService } from '../services/ai';
import { TIER_LIMITS, Tier, TierLimits, parseTier } from '../lib/tiers';

const router = Router();
const MAX_MEMORY_TEXT_LENGTH = 1_000;
const ALLOWED_UPLOAD_MIME_PREFIXES = ['image/', 'video/', 'audio/'] as const;

type UploadRouteLocals = {
  uploadEvent?: typeof events.$inferSelect;
  uploadTier?: Tier;
  uploadLimits?: TierLimits;
};

const formatUploadLimitLabel = (bytes: number) => `${Math.round(bytes / (1024 * 1024))}MB`;

const isAllowedUploadMimeType = (mimeType: string) =>
  ALLOWED_UPLOAD_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));

const getMemoryTypeFromMimeType = (mimeType: string): 'photo' | 'video' | 'audio' | null => {
  if (mimeType.startsWith('image/')) {
    return 'photo';
  }

  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }

  return null;
};

const uploadSingleMemory = async (
  req: Request,
  res: Response<unknown, UploadRouteLocals>,
  next: (error?: unknown) => void
) => {
  try {
    const slug = getSlugOrRespond(req, res);
    if (!slug) {
      return;
    }

    const event = await db.query.events.findFirst({
      where: eq(events.slug, slug),
    });

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    if (isEventExpired(event)) {
      res.status(403).json({ message: 'This event has expired. No new memories can be added.' });
      return;
    }

    const tier = parseTier(event.package);
    if (!tier) {
      res.status(500).json({ message: 'Event has invalid tier configuration' });
      return;
    }

    const limits = TIER_LIMITS[tier];
    const upload = multer({
      dest: 'uploads/',
      limits: {
        fileSize: limits.maxFileSizeBytes,
      },
      fileFilter: (_uploadReq, file, cb) => {
        if (!isAllowedUploadMimeType(file.mimetype)) {
          cb(new Error('Only image, video, and audio uploads are allowed'));
          return;
        }

        cb(null, true);
      },
    });

    res.locals.uploadEvent = event;
    res.locals.uploadTier = tier;
    res.locals.uploadLimits = limits;

    upload.single('photo')(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        res
          .status(400)
          .json({ message: `File exceeds ${formatUploadLimitLabel(limits.maxFileSizeBytes)} upload limit` });
        return;
      }

      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
        return;
      }

      res.status(400).json({ message: 'Invalid upload request' });
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentEventStorageUsage = async (eventId: string) => {
  const [storageResult] = await db
    .select({
      totalBytes: sql<number>`coalesce(sum(${memories.fileSize}), 0)`,
    })
    .from(memories)
    .where(eq(memories.eventId, eventId));

  return Number(storageResult?.totalBytes ?? 0);
};

const uploadSinglePhoto = (req: Request, res: Response<unknown, UploadRouteLocals>, next: (error?: unknown) => void) => {
  uploadSingleMemory(req, res, next);
};

const getSlugOrRespond = (req: Request, res: Response): string | null => {
  const slug = typeof req.params.slug === 'string' ? req.params.slug.trim() : '';

  // Legacy events may have older slug formats. We only require a non-empty single path segment here
  // because the value is used in a parameterized equality query, not string-concatenated SQL.
  if (!slug || slug.length > 255) {
    res.status(400).json({ message: 'Invalid event slug' });
    return null;
  }

  return slug;
};

const cleanupTempUpload = (file?: Express.Multer.File) => {
  if (file?.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      console.error('Temp upload cleanup failed:', error);
    }
  }
};

const isEventExpired = (event: { isExpired: boolean | null; expiresAt: Date | null }) => {
  return Boolean(event.isExpired) || (event.expiresAt != null && new Date() > event.expiresAt);
};

const parseMemoryIdOrRespond = (req: Request, res: Response): number | null => {
  const memoryId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(memoryId) || memoryId <= 0) {
    res.status(400).json({ message: 'Invalid memory ID format' });
    return null;
  }

  return memoryId;
};

const sanitizeMemoryText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, MAX_MEMORY_TEXT_LENGTH);
};

const getDeviceIdOrRespond = (req: Request, res: Response): string | null => {
  if (typeof req.body?.deviceId !== 'string') {
    res.status(400).json({ message: 'Device ID is required' });
    return null;
  }

  const deviceId = req.body.deviceId.trim();
  if (!deviceId || deviceId.length > 255) {
    res.status(400).json({ message: 'Invalid device ID' });
    return null;
  }

  return deviceId;
};

// GET /:slug - Retrieve event details
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const slug = getSlugOrRespond(req, res);
    if (!slug) {
      return;
    }
    
    // Fetch event
    const event = await db.query.events.findFirst({
      where: eq(events.slug, slug),
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (isEventExpired(event)) {
      return res.status(403).json({ message: 'Event has expired' });
    }

    // Return public details
    res.json({
      id: event.id,
      title: event.title,
      welcomeMessage: event.welcomeMessage,
      coverImage: event.coverImage,
      category: event.category,
      date: event.date,
      spotifyUrl: event.spotifyUrl,
      package: parseTier(event.package) ?? 'BASIC',
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /:slug/memories - Fetch approved memories for public gallery
router.get('/:slug/memories', async (req: Request, res: Response) => {
  try {
    const slug = getSlugOrRespond(req, res);
    if (!slug) {
      return;
    }
    
    const event = await db.query.events.findFirst({
      where: eq(events.slug, slug),
    });

    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (isEventExpired(event)) {
      return res.status(403).json({ message: 'Event has expired' });
    }

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
router.post('/:slug/upload', uploadSinglePhoto, async (req: Request, res: Response<unknown, UploadRouteLocals>) => {
  try {
    const slug = getSlugOrRespond(req, res);
    if (!slug) {
      cleanupTempUpload(req.file);
      return;
    }

    const cleanOriginal = sanitizeMemoryText(req.body?.memory);
    
    console.log('Saving to DB - Original:', cleanOriginal);

    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const event = res.locals.uploadEvent;
    const tier = res.locals.uploadTier;
    const limits = res.locals.uploadLimits;

    if (!event || !tier || !limits) {
      cleanupTempUpload(file);
      return res.status(500).json({ message: 'Upload context was not initialized' });
    }

    const memoryType = getMemoryTypeFromMimeType(file.mimetype);
    if (!memoryType) {
      cleanupTempUpload(file);
      return res.status(400).json({ message: 'Unsupported file type' });
    }

    const currentStorageUsed = await getCurrentEventStorageUsage(event.id);

    if (currentStorageUsed + file.size > limits.maxStorageBytes) {
      cleanupTempUpload(file);
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
    const shouldGenerateAiStory = limits.aiStoriesEnabled && memoryType === 'photo';
    const aiStory = shouldGenerateAiStory
      ? await AIService.rewriteMemory(cleanOriginal, file.buffer, file.mimetype)
      : null;

    // 5. Save to DB
    await db.transaction(async (tx) => {
      // Insert memory
      await tx.insert(memories).values({
        eventId: event.id,
        type: memoryType,
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
    cleanupTempUpload(file);

    res.status(201).json({ 
      message: 'Memory captured successfully!', 
      story: aiStory,
      mediaType: memoryType,
      storagePath: publicUrl,
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    cleanupTempUpload(req.file);
    console.error('[UPLOAD ERROR]:', error);

    res.status(500).json({ message: 'Upload crashed: ' + (error instanceof Error ? error.message : String(error)) });
  }
});

// POST /:slug/memories/:id/like - Increment likes for a memory
router.post('/:slug/memories/:id/like', async (req: Request, res: Response) => {
  try {
    const slug = getSlugOrRespond(req, res);
    if (!slug) {
      return;
    }

    const memoryId = parseMemoryIdOrRespond(req, res);
    if (memoryId == null) {
      return;
    }

    const event = await db.query.events.findFirst({
      where: eq(events.slug, slug),
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (isEventExpired(event)) {
      return res.status(403).json({ message: 'Event has expired' });
    }

    const memory = await db.query.memories.findFirst({
      where: and(
        eq(memories.id, memoryId),
        eq(memories.eventId, event.id),
        eq(memories.isApproved, true)
      ),
    });

    if (!memory) {
      return res.status(404).json({ message: 'Memory not found' });
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
    const slug = getSlugOrRespond(req, res);
    if (!slug) {
      return;
    }

    const deviceId = getDeviceIdOrRespond(req, res);
    if (!deviceId) {
      return;
    }

    const eventResult = await db.select().from(events).where(eq(events.slug, slug));
    
    if (eventResult.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = eventResult[0];
    if (isEventExpired(event)) {
      return res.status(403).json({ message: 'Event has expired' });
    }
    const tier = parseTier(event.package);

    if (!tier) {
      return res.status(500).json({ message: 'Event has invalid tier configuration' });
    }

    if (Number.isFinite(TIER_LIMITS[tier].maxGuests)) {
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
      if (currentGuestCount >= TIER_LIMITS[tier].maxGuests) {
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
