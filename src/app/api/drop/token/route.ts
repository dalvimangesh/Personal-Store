import dbConnect from '@/lib/db';
import DropToken from '@/models/DropToken';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = uuidv4();
    
    const dropToken = await DropToken.create({
      token,
      userId: session.userId,
    });

    return NextResponse.json({ success: true, token: dropToken.token });
  } catch (error) {
    console.error('Token Generation Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate token' }, { status: 500 });
  }
}

