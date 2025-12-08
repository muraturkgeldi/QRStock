// src/lib/firestore.server.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config'; 

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;

function getServerApp(): FirebaseApp {
  if (cachedApp) return cachedApp;

  // Daha önce app var mı bak
  if (getApps().length > 0) {
    cachedApp = getApp();
  } else {
    cachedApp = initializeApp(firebaseConfig);
  }
  return cachedApp;
}

export function getServerDb(): Firestore {
  if (cachedDb) return cachedDb;
  const app = getServerApp();
  cachedDb = getFirestore(app);
  return cachedDb;
}
