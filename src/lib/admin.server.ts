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
        throw new Error('Firebase Admin SDK not initialized: no service account file found.');
    }
    const raw = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(raw);
  } catch (e: any) {
    console.error('serviceAccount.json okunamadı:', jsonPath, e.message);
    throw new Error('Firebase Admin SDK not initialized: no valid credentials found.');
  }
}

function initAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }
  
  try {
      const serviceAccount = loadServiceAccount();

      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });

      return adminApp;
  } catch(e: any) {
      console.error("Firebase Admin SDK başlatılamadı:", e.message);
      // Hata durumunda null bir app döndürmek yerine hata fırlatmak
      // sorunun kaynağını daha net gösterir.
      throw new Error("Could not initialize Firebase Admin SDK. " + e.message);
  }
}

export function adminAuth() {
  try {
    return getAuth(initAdminApp());
  } catch (e) {
    console.error("adminAuth() çağrılırken hata oluştu. Admin SDK başlatılamamış olabilir.");
    // Bu fonksiyonu çağıran yerin hatayı yakalaması için tekrar fırlat.
    throw e;
  }
}

export function adminDb() {
  try {
    return getFirestore(initAdminApp());
  } catch (e) {
    console.error("adminDb() çağrılırken hata oluştu. Admin SDK başlatılamamış olabilir.");
    throw e;
  }
}