
import admin from 'firebase-admin';

function loadServiceAccount() {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.warn('WARNING: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Admin features will be disabled.');
      return null;
    }
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const serviceAccount = JSON.parse(serviceAccountString);
    
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    return serviceAccount;
  } catch (error: any) {
    console.error('Failed to load or parse Firebase service account key:', error.message);
    return null;
  }
}

export function getAdminApp() {
  if (admin.apps.length) return admin.app();
  
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    // Return a dummy object or handle this case as per your app's needs
    // For now, we can't initialize the app.
    return null;
  }

  return admin.initializeApp({ 
    credential: admin.credential.cert(serviceAccount) 
  });
}

export const adminAuth = () => {
    const app = getAdminApp();
    if (!app) throw new Error("Firebase Admin SDK not initialized.");
    return app.auth();
};

export const adminDb   = () => {
    const app = getAdminApp();
    if (!app) throw new Error("Firebase Admin SDK not initialized.");
    return app.firestore();
};
