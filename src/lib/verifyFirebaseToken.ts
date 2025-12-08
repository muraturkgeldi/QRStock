
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
  if (!sessionCookie) {
    return { isAdmin: false, uid: null };
  }

  try {
    const uid = await getUidFromSessionCookie(sessionCookie);
    if(!uid) return { isAdmin: false, uid: null };
    
    const db = adminDb();
    if (!db) return { isAdmin: false, uid: null };

    const userDoc = await db.collection('users').doc(uid).get();

    if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.role === 'admin') {
            return { isAdmin: true, uid };
        }
    }
    
    // Fallback for custom claims if still used elsewhere
    try {
        const userAuth = await adminAuth().getUser(uid);
        if(userAuth.customClaims?.role === 'admin' || userAuth.customClaims?.admin === true){
          return { isAdmin: true, uid };
        }
    } catch (authError) {
        console.warn("Could not verify via adminAuth, probably service account is not set up.", authError);
    }


    return { isAdmin: false, uid };
  } catch (err) {
    console.error('verifyAdminRole error', err);
    return { isAdmin: false, uid: null };
  }
}
