// scripts/test-firebase-init.ts
import { adminDb } from '../src/lib/admin.server';

(async () => {
  try {
    const db = adminDb();
    if (!db) {
      throw new Error("adminDb() returned null or undefined.");
    }
    console.log('✅ Firebase Admin initialized successfully.');
    const collections = await db.listCollections();
    console.log(`Found ${collections.length} collections in Firestore.`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Firebase Admin init failed', e);
    process.exit(1);
  }
})();
