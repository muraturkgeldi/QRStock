
'use server';
import 'server-only';
import * as jose from 'jose';
import { adminAuth, adminDb } from './admin.server';
import { cookies } from 'next/headers';

type VerifyResult = {
  isAdmin: boolean;
  uid: string | null;
};

async function getUidFromSessionCookie(cookie?: string): Promise<string | null> {
    if (!cookie) return null;
    try {
        const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-secret');
        const { payload } = await jose.jwtVerify(cookie, SECRET);
        return payload.uid as string;
    } catch (e) {
        console.error("Session verification failed:", e);
        return null;
    }
}


export async function verifyFirebaseToken(): Promise<{uid: string} | null> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return null;
    const uid = await getUidFromSessionCookie(sessionCookie);
    if (!uid) return null;
    return { uid };
}

export async function verifyAdminRole(sessionCookie?: string | null): Promise<VerifyResult> {
  const resolvedSessionCookie = sessionCookie ?? cookies().get('session')?.value;
  if (!resolvedSessionCookie) {
    return { isAdmin: false, uid: null };
  }

  const uid = await getUidFromSessionCookie(resolvedSessionCookie);
  if (!uid) return { isAdmin: false, uid: null };

  try {
    const db = adminDb(); // Will throw if not initialized
    const userDoc = await db.collection('users').doc(uid).get();

    if (userDoc.exists && userDoc.data()?.role === 'admin') {
      return { isAdmin: true, uid };
    }
    
    // Fallback check for custom claims, in case they are used
    const userAuth = await adminAuth().getUser(uid);
    if (userAuth.customClaims?.role === 'admin' || userAuth.customClaims?.admin === true) {
      return { isAdmin: true, uid };
    }

    return { isAdmin: false, uid };
  } catch (err) {
    // This catch block will now also handle the error from adminDb() or adminAuth() if SDK is not initialized.
    console.error('verifyAdminRole error:', err);
    return { isAdmin: false, uid: null };
  }
}
