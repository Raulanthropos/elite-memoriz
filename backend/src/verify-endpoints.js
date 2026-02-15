"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const schema_1 = require("./db/schema");
const dotenv_1 = __importDefault(require("dotenv"));
const drizzle_orm_1 = require("drizzle-orm");
dotenv_1.default.config();
const BASE_URL = 'http://127.0.0.1:4000/api/events';
const TEST_SLUG = 'test-event-slug';
async function seedData() {
    console.log('🌱 Seeding test data...');
    // Create host if not exists
    const existingHost = await db_1.db.query.hosts.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.hosts.email, 'test@example.com')
    });
    let hostId;
    if (!existingHost) {
        const [host] = await db_1.db.insert(schema_1.hosts).values({
            email: 'test@example.com',
            passwordHash: 'hash',
        }).returning();
        hostId = host.id;
    }
    else {
        hostId = existingHost.id;
    }
    // Check event
    const existingEvent = await db_1.db.query.events.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.events.slug, TEST_SLUG)
    });
    if (!existingEvent) {
        await db_1.db.insert(schema_1.events).values({
            hostId: hostId,
            title: 'Test Wedding',
            slug: TEST_SLUG,
            date: new Date(),
            expiresAt: new Date(Date.now() + 86400000), // +1 day
            package: 'BASIC',
        });
        console.log('✅ Test event created.');
    }
    else {
        console.log('ℹ️ Test event already exists.');
    }
}
async function runTests() {
    try {
        // 1. Get Event
        console.log('\n🔍 Testing GET /:slug ...');
        const res = await fetch(`${BASE_URL}/${TEST_SLUG}`);
        if (res.status !== 200)
            throw new Error(`Failed to get event: ${res.status}`);
        const event = await res.json();
        console.log('✅ Event Fetched:', event.title);
        // 2. Upload File
        console.log('\n📸 Testing POST /:slug/upload ...');
        // Create a dummy file
        const filePath = path_1.default.join(__dirname, 'test-image.txt');
        fs_1.default.writeFileSync(filePath, 'dummy image content');
        const fileBuffer = fs_1.default.readFileSync(filePath);
        const blob = new Blob([fileBuffer], { type: 'text/plain' });
        const form = new FormData();
        form.append('photo', blob, 'test-image.txt');
        form.append('memory', 'This is a beautiful memory!');
        const uploadRes = await fetch(`${BASE_URL}/${TEST_SLUG}/upload`, {
            method: 'POST',
            body: form,
        });
        if (uploadRes.status !== 201) {
            const err = await uploadRes.json();
            throw new Error(`Upload failed: ${uploadRes.status} - ${err.message}`);
        }
        const result = await uploadRes.json();
        console.log('✅ Upload Successful:', result);
        // Clean up
        fs_1.default.unlinkSync(filePath);
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    }
}
// Run
(async () => {
    try {
        await seedData();
        await runTests();
    }
    catch (e) {
        console.error('Test execution failed:', e);
        process.exit(1);
    }
})();
