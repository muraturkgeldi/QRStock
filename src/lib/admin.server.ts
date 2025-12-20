// src/lib/admin.server.ts
import { getApps, initializeApp, cert, App, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

function parseServiceAccount(envValue?: string) {
  if (!envValue) return null;

  try {
    // Ham JSON mu?
    if (envValue.trim().startsWith('{')) {
      const json = JSON.parse(envValue);
      json.private_key = json.private_key?.replace(/\\n/g, '\n');
      return json;
    }

    // Base64 mü?
    const decoded = Buffer.from(envValue, 'base64').toString('utf-8');
    const json = JSON.parse(decoded);
    json.private_key = json.private_key?.replace(/\\n/g, '\n');
    return json;
  } catch (err) {
    console.error('[Firebase Admin] Service account parse failed:', err);
    return null;
  }
}

function initAdminApp(): App | null {
  if (adminApp) return adminApp;
  if (getApps().length > 0) return (adminApp = getApps()[0]);

  const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  try {
    adminApp = initializeApp({
      credential: serviceAccount
        ? cert(serviceAccount)
        : applicationDefault(), // Preview/Cloud fallback
      projectId:
        process.env.GCLOUD_PROJECT ||
        process.env.FIREBASE_PROJECT_ID ||
        undefined,
    });
    return adminApp;
  } catch (e) {
    console.error('[Firebase Admin] init failed:', e);
    return null;
  }
}

export function adminAuth() {
  const app = initAdminApp();
  if (!app) throw new Error('Firebase Admin Auth not initialized');
  return getAuth(app);
}

export function adminDb() {
  const app = initAdminApp();
  if (!app) throw new Error('Firebase Admin DB not initialized');
  return getFirestore(app);
}
