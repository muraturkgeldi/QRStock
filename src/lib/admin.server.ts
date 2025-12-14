// src/lib/admin.server.ts

import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

function loadServiceAccount(): any {
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!envKey) {
    console.warn('Firebase Admin SDK: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Server-side features requiring admin privileges will fail.');
    return null;
  }
  
  try {
    // The key might be base64 encoded.
    if (!envKey.includes('{')) {
        const decodedKey = Buffer.from(envKey, 'base64').toString('utf-8');
        const parsedKey = JSON.parse(decodedKey);
        if (parsedKey.private_key) {
           parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');
        }
        return parsedKey;
    }
    const parsedKey = JSON.parse(envKey);
    // The key might be double-escaped in some environments.
    if (parsedKey.private_key) {
      parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');
    }
    return parsedKey;
  } catch (e) {
    console.error('Firebase Admin: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is valid JSON.', e);
    return null;
  }
}

function initAdminApp(): App | null {
  if (adminApp) return adminApp;

  // Do not initialize if another app already exists.
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }
  
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    return null; // Don't initialize if service account is not available
  }

  try {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
    return adminApp;
  } catch(e: any) {
    console.error("Firebase Admin SDK initialization failed:", e.message);
    return null;
  }
}

// These functions will now return null if the Admin SDK is not properly initialized.
export function adminAuth() {
  const app = initAdminApp();
  if (!app) return null;
  return getAuth(app);
}

export function adminDb() {
  const app = initAdminApp();
   if (!app) return null;
  return getFirestore(app);
}
