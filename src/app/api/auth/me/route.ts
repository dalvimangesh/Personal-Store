import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    const session = await verifySession(sessionCookie?.value);

    if (!session?.userId) {
      return NextResponse.json({ user: null });
    }

    await dbConnect();
    const user = await User.findById(session.userId).select('username');

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: { username: user.username } });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}


