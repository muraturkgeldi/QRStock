'use client';

import { useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/firebase';

export default function DebugPage() {
  useEffect(() => {
    async function test() {
      try {
        console.log('FIRESTORE APP OPTIONS:', firestore.app.options);

        const snap = await getDocs(collection(firestore, 'products'));
        console.log('DEBUG products size:', snap.size);
      } catch (e) {
        console.error('DEBUG FIRESTORE ERROR:', e);
      }
    }
    test();
  }, []);

  return <div style={{ padding: 20 }}>Debug sayfası çalışıyor, konsola bak 🧐</div>;
}
