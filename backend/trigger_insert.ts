import { db } from './src/db';
import { memories, events } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function testInsert() {
  console.log('Fetching an event...');
  const eventList = await db.query.events.findMany({ limit: 1 });
  
  if (eventList.length === 0) {
    console.log('No events found!');
    process.exit(1);
  }
  
  const event = eventList[0];
  console.log(`Inserting memory for event: ${event.id}`);
  
  const result = await db.insert(memories).values({
    eventId: event.id,
    type: 'photo',
    storagePath: 'test/path/img.jpg',
    originalText: 'Test real-time payload',
    aiStory: 'A test story',
    isApproved: false,
    fileSize: 1024,
  }).returning();
  
  console.log('Inserted:', result[0]);
  process.exit(0);
}

testInsert().catch(console.error);
