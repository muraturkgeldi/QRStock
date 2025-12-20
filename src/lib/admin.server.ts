// src/lib/admin.server.ts

import { getApps, initializeApp, cert, App, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

function loadServiceAccount(): any {
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!envKey) {
    // Return null instead of logging a warning here, as ADC is the preferred fallback.
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

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }
  
  const serviceAccount = loadServiceAccount();

  try {
    adminApp = initializeApp({
      // Use cert if serviceAccount is available, otherwise fall back to ADC
      credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    });
    return adminApp;
  } catch(e: any) {
    console.error("Firebase Admin SDK initialization failed. This can happen if FIREBASE_SERVICE_ACCOUNT_KEY is not set or if Application Default Credentials (ADC) are not available in this environment.", e);
    // Log the full error for better debugging, especially for credential issues.
    return null;
  }
}

// These functions will now return null if the Admin SDK is not properly initialized.
export function adminAuth() {
  const app = initAdminApp();
  if (!app) {
    // Throw an error if initialization fails, as auth operations are critical.
    throw new Error("Firebase Admin Auth SDK is not initialized. Check server configuration.");
  }
  return getAuth(app);
}

export function adminDb() {
  const app = initAdminApp();
   if (!app) {
    throw new Error("Firebase Admin SDK is not initialized. Check your FIREBASE_SERVICE_ACCOUNT_KEY environment variable or application default credentials.");
  }
  return getFirestore(app);
}
