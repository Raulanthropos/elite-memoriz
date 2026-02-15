
import { db } from './src/db';
import { events } from './src/db/schema';
import { desc } from 'drizzle-orm';

async function listEvents() {
  const allEvents = await db.select().from(events).orderBy(desc(events.id));
  console.log('--- Events ---');
  allEvents.forEach(e => {
    console.log(`ID: ${e.id} | Slug: ${e.slug} | Title: ${e.title}`);
  });
  process.exit(0);
}

listEvents();
