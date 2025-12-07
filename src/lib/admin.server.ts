// src/lib/admin.server.ts

import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let adminApp: App | null = null;

function loadServiceAccount(): any {
  // 1) Önce ortam değişkenine bak (deploy vs için)
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (envKey) {
    try {
      const parsedKey = JSON.parse(envKey);
      if (parsedKey.private_key) {
        parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');
      }
      return parsedKey;
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT_KEY JSON değil:', e);
      throw new Error('Firebase Admin: invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON');
    }
  }

  // 2) Lokal / Firebase Studio için: proje kökünden serviceAccount.json oku
  const jsonPath = path.join(process.cwd(), 'serviceAccount.json');
  try {
    if (!fs.existsSync(jsonPath)) {
        console.warn(`Uyarı: serviceAccount.json dosyası şurada bulunamadı: ${jsonPath}. Bazı sunucu özellikleri çalışmayabilir.`);
        return null; // Return null if file doesn't exist
    }
    const raw = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(raw);
  } catch (e: any) {
    console.error('serviceAccount.json okunamadı:', jsonPath, e.message);
    return null; // Return null on any error
  }
}

function initAdminApp(): App | null {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }
  
  try {
      const serviceAccount = loadServiceAccount();
      
      // If serviceAccount is null (file not found or error reading), don't initialize
      if (!serviceAccount) {
        console.warn("Firebase Admin SDK başlatılamadı: serviceAccount.json bulunamadı veya geçersiz.");
        return null;
      }

      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });

      return adminApp;
  } catch(e: any) {
      console.error("Firebase Admin SDK başlatılamadı:", e.message);
      return null;
  }
}

export function adminAuth() {
  const app = initAdminApp();
  if (!app) {
    throw new Error("Firebase Admin SDK not initialized. Check server logs for details.");
  }
  return getAuth(app);
}

export function adminDb() {
  const app = initAdminApp();
  if (!app) {
    throw new Error("Firebase Admin SDK not initialized. Check server logs for details.");
  }
  return getFirestore(app);
}
