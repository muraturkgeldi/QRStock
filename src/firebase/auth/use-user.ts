'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirestore } from '../provider';
import type { AppUser } from '@/lib/types';


export function useUser() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        // Auth user exists, now listen to their profile document in Firestore
        const userDocRef = doc(firestore, 'users', authUser.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            // Combine auth data with profile data (role)
            setUser({ ...authUser, role: profileData.role });
          } else {
            // Profile doesn't exist, just use auth data
            setUser(authUser);
          }
          setLoading(false);
        }, (error) => {
           console.error("Error fetching user profile:", error);
           setUser(authUser); // Fallback to auth user
           setLoading(false);
        });
        
        return () => unsubscribeProfile();

      } else {
        // No auth user
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth, firestore]);

  return { user, loading };
}
