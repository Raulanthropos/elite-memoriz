import fs from 'fs';
import path from 'path';
import { db } from './db';
import { events } from './db/schema';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid'; // or just hardcode if uuid not installed

dotenv.config();

const BASE_URL = 'http://127.0.0.1:4000/api/events';
const TEST_SLUG = 'test-event-slug';
// Mock Supabase User ID
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000'; 

async function seedData() {
  console.log('🌱 Seeding test data...');
  
  // Check event
  const existingEvent = await db.query.events.findFirst({
      where: eq(events.slug, TEST_SLUG)
  });

  if (!existingEvent) {
      await db.insert(events).values({
        userId: TEST_USER_ID,
        title: 'Test Wedding',
        slug: TEST_SLUG,
        date: new Date(),
        expiresAt: new Date(Date.now() + 86400000), // +1 day
        package: 'BASIC',
      });
      console.log('✅ Test event created.');
  } else {
      console.log('ℹ️ Test event already exists.');
  }
}

async function runTests() {
  try {
    // 1. Get Event
    console.log('\n🔍 Testing GET /:slug ...');
    const res = await fetch(`${BASE_URL}/${TEST_SLUG}`);
    if (res.status !== 200) throw new Error(`Failed to get event: ${res.status}`);
    const event = await res.json() as any;
    console.log('✅ Event Fetched:', event.title);

    // 2. Upload File
    console.log('\n📸 Testing POST /:slug/upload ...');
    
    // Create a dummy file
    const filePath = path.join(__dirname, 'test-image.txt');
    fs.writeFileSync(filePath, 'dummy image content');

    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });

    const form = new FormData();
    form.append('photo', blob, 'test-image.jpg');
    form.append('memory', 'This is a beautiful memory!');

    const uploadRes = await fetch(`${BASE_URL}/${TEST_SLUG}/upload`, {
      method: 'POST',
      body: form,
    });

    if (uploadRes.status !== 201) {
      const err = await uploadRes.json() as any;
      throw new Error(`Upload failed: ${uploadRes.status} - ${err.message}`);
    }

    const result = await uploadRes.json();
    console.log('✅ Upload Successful:', result);

    // Clean up
    fs.unlinkSync(filePath);
    console.log('\n🎉 All tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  }
}

// Run
(async () => {
    try {
        await seedData();
        await runTests();
    } catch (e) {
        console.error('Test execution failed:', e);
        process.exit(1);
    }
})();
