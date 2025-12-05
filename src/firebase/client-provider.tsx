'use client';

import React, { useEffect } from 'react';
import { initFirebase, app, auth, firestore } from '.';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  
  // This ensures emulators are initialized once on the client, if enabled.
  useEffect(() => {
    initFirebase();
  }, []);

  // We need to ensure that the app, auth, and firestore are initialized before rendering the provider.
  // The initFirebase function handles the singleton pattern.
  if (!app || !auth || !firestore) {
    initFirebase();
  }

  return (
    <FirebaseProvider
      app={app}
      auth={auth}
      firestore={firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
