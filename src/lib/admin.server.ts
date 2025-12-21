// src/lib/admin.server.ts
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App | null = null;

function loadServiceAccount(): any {
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!envKey) return null;

  try {
    // base64 ise decode et
    const raw = envKey.includes("{")
      ? envKey
      : Buffer.from(envKey, "base64").toString("utf-8");

    const parsed = JSON.parse(raw);
    if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    return parsed;
  } catch (e) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY parse edilemedi:", e);
    return null;
  }
}

function initAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length) return (adminApp = getApps()[0]);

  // 🔥 ADC/metadata/file-path yolunu tamamen kapat
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      "Firebase Admin başlatılamadı: FIREBASE_SERVICE_ACCOUNT_KEY eksik veya geçersiz. Lütfen Firebase Studio > Secrets paneline eklediğinizden emin olun."
    );
  }

  adminApp = initializeApp({ 
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  return adminApp;
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
