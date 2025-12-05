
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

export const runtime = 'nodejs';
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-secret');

// This simplified endpoint bypasses server-side admin verification for development.
// It decodes the token from the client to get the UID and creates a session cookie.
// WARNING: Do not use this in production without re-introducing server-side token verification.
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return new NextResponse('Missing idToken', { status: 400 });

    // Decode the token to get payload without verification (for dev purposes only)
    const decodedPayload = jose.decodeJwt(idToken);
    const uid = decodedPayload.sub;
    const email = decodedPayload.email;

    if (!uid) {
      throw new Error('UID not found in token payload.');
    }
    
    // Create a local HS256 JWT for the session cookie
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    const appJwt = await new jose.SignJWT({ uid: uid, em: email || null })
      .setProtectedHeader({ alg:'HS256' }).setIssuedAt().setExpirationTime(`${maxAge}s`).sign(SECRET);

    const res = NextResponse.json({ ok: true });
    
    res.cookies.set({
      name: 'session',
      value: appJwt,
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      sameSite: req.nextUrl.protocol === 'https' ? 'none' : 'lax',
      path: '/',
      maxAge: maxAge,
      expires: new Date(Date.now() + maxAge * 1000),
    });

    return res;
  } catch (e:any) {
    console.error("Session creation failed:", e.message);
    return new NextResponse(e.message ?? 'Unauthorized', { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('session', '', { maxAge: -1, path: '/' });
    return res;
  } catch (e: any) {
    return new NextResponse(e.message ?? 'Logout failed', { status: 500 });
  }
}
