import { and, eq, isNotNull, lt, or } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { getEventExpirationDate, parseTier } from '../lib/tiers';
import { deleteSupabaseUploadFile, StorageService } from './storage';

const isManagedUploadPath = (value: string | null | undefined): value is string => {
  return Boolean(value && !value.startsWith('http'));
};

export type EventDeletionResult = {
  deleted: boolean;
  cleanupFailures: string[];
};

export const deleteEventWithAssets = async (eventId: string): Promise<EventDeletionResult> => {
  const event = await db.query.events.findFirst({
    where: eq(schema.events.id, eventId),
  });

  if (!event) {
    return {
      deleted: false,
      cleanupFailures: [],
    };
  }

  let memoryStoragePaths: string[] = [];
  let coverImagePath: string | null = null;

  await db.transaction(async (tx) => {
    const eventMemories = await tx.query.memories.findMany({
      where: eq(schema.memories.eventId, eventId),
      columns: {
        storagePath: true,
      },
    });

    memoryStoragePaths = eventMemories
      .map((memory) => memory.storagePath)
      .filter((path): path is string => Boolean(path));

    coverImagePath = isManagedUploadPath(event.coverImage) ? event.coverImage : null;

    await tx.delete(schema.eventGuests).where(eq(schema.eventGuests.eventId, eventId));
    await tx.delete(schema.memories).where(eq(schema.memories.eventId, eventId));
    await tx.delete(schema.events).where(eq(schema.events.id, eventId));
  });

  const cleanupFailures: string[] = [];

  const memoryCleanupResults = await Promise.allSettled(
    memoryStoragePaths.map((path) => StorageService.deleteFile(path))
  );

  memoryCleanupResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      const path = memoryStoragePaths[index];
      cleanupFailures.push(`memory:${path}`);
      console.error('Event delete storage cleanup failed:', path, result.reason);
    }
  });

  if (coverImagePath) {
    try {
      await deleteSupabaseUploadFile(coverImagePath);
    } catch (error) {
      cleanupFailures.push(`cover:${coverImagePath}`);
      console.error('Event delete cover cleanup failed:', coverImagePath, error);
    }
  }

  return {
    deleted: true,
    cleanupFailures,
  };
};

export const deleteExpiredEvents = async (now = new Date()) => {
  const expiredEvents = await db.query.events.findMany({
    where: or(
      eq(schema.events.isExpired, true),
      and(
        isNotNull(schema.events.expiresAt),
        lt(schema.events.expiresAt, now)
      )
    ),
    columns: {
      id: true,
      slug: true,
      expiresAt: true,
      isExpired: true,
    },
  });

  if (expiredEvents.length === 0) {
    return {
      checkedAt: now,
      deletedCount: 0,
      cleanupFailures: [] as string[],
    };
  }

  const cleanupFailures: string[] = [];
  let deletedCount = 0;

  for (const event of expiredEvents) {
    try {
      const result = await deleteEventWithAssets(event.id);

      if (result.deleted) {
        deletedCount += 1;
      }

      cleanupFailures.push(...result.cleanupFailures.map((failure) => `${event.id}:${failure}`));
    } catch (error) {
      const failure = `${event.id}:delete`;
      cleanupFailures.push(failure);
      console.error('Expired event cleanup failed:', {
        eventId: event.id,
        slug: event.slug,
        error,
      });
    }
  }

  return {
    checkedAt: now,
    deletedCount,
    cleanupFailures,
  };
};

export const syncEventExpirations = async () => {
  const events = await db.query.events.findMany({
    where: eq(schema.events.isExpired, false),
    columns: {
      id: true,
      date: true,
      package: true,
      expiresAt: true,
    },
  });

  let updatedCount = 0;

  for (const event of events) {
    const tier = parseTier(event.package);
    if (!tier) {
      continue;
    }

    const nextExpiresAt = getEventExpirationDate(event.date, tier);
    const currentExpiresAtMs = event.expiresAt?.getTime() ?? null;
    const nextExpiresAtMs = nextExpiresAt.getTime();

    if (currentExpiresAtMs === nextExpiresAtMs) {
      continue;
    }

    await db.update(schema.events)
      .set({ expiresAt: nextExpiresAt })
      .where(eq(schema.events.id, event.id));

    updatedCount += 1;
  }

  return {
    checkedCount: events.length,
    updatedCount,
  };
};
