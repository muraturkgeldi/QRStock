
// src/lib/admin.server.ts

// HARD SAFETY: ignore invalid injected credential paths from stale caches or misconfigurations
if (
  process.env.GOOGLE_APPLICATION_CREDENTIALS &&
  process.env.GOOGLE_APPLICATION_CREDENTIALS.includes('account_key.json')
) {
  console.warn('Firebase Admin: Unsetting problematic GOOGLE_APPLICATION_CREDENTIALS pointing to account_key.json.');
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}


import { getApps, initializeApp, cert, App, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

function loadServiceAccount(): any {
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!envKey) {
    return null;
  }
  
  try {
    // Check if the key is base64 encoded or a raw JSON string
    if (!envKey.trim().startsWith('{')) {
        const decodedKey = Buffer.from(envKey, 'base64').toString('utf-8');
        const parsedKey = JSON.parse(decodedKey);
        // Important: newlines in private keys must be un-escaped
        if (parsedKey.private_key) {
           parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');
        }
        return parsedKey;
    }
    // It's a raw JSON string
    const parsedKey = JSON.parse(envKey);
    if (parsedKey.private_key) {
      parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');
    }
    return parsedKey;
  } catch (e) {
    console.error('Firebase Admin: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is valid JSON or a base64-encoded version of it.', e);
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
  const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

  try {
    const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'demo-qrstock';

    adminApp = initializeApp({
      // Use cert if serviceAccount is available, otherwise fall back to ADC
      // In an emulator environment, no credential is required.
      credential: usingEmulator
        ? undefined
        : serviceAccount
          ? cert(serviceAccount)
          : applicationDefault(),
      projectId: serviceAccount?.project_id ?? projectId
    });
    return adminApp;
  } catch(e: any) {
    console.error("Firebase Admin SDK initialization failed. This can happen if credentials (FIREBASE_SERVICE_ACCOUNT_KEY or ADC) are not available in this environment. Check your configuration.", e);
    return null;
  }
}

export function adminAuth() {
  const app = initAdminApp();
  if (!app) {
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
