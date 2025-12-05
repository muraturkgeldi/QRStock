import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// Uygulama tarafı burayı çağırıyor
// Sunucu tarafında çalışmasını engellemek için `typeof window` kontrolü eklendi.
export function initFirebase() {
  if (typeof window !== 'undefined' && !getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
  } else if (getApps().length > 0) {
    app = getApp();
    auth = getAuth(app);
    firestore = getFirestore(app);
  }
}


// Diğer yerler için export
export { app, auth, firestore };

export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useUser } from './auth/use-user';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
