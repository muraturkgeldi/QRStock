'use client';

import React, { createContext, useContext } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

const FirebaseContext = createContext<{
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} | null>(null);

export const FirebaseProvider = ({
  children,
  app,
  auth,
  firestore,
}: {
  children: React.ReactNode;
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}) => {
  return (
    <FirebaseContext.Provider value={{ app, auth, firestore }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const useFirebaseApp = () => useFirebase().app;
export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;
