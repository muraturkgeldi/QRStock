
export const revalidate = 0;
import { NextResponse } from 'next/server';

export async function GET() {
  const hasGac = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasFsk = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  return new Response(JSON.stringify({ hasGac, hasFsk }), { headers:{'content-type':'application/json'}});
}
