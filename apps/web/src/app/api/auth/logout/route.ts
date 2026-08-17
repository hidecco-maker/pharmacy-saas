import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '@/lib/session';

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.destroy();
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(`${origin}/login`);
}
