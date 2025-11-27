import dbConnect from '@/lib/db';
import QuickClip from '@/models/QuickClip';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure userId is a string/ObjectId
    const userId = session.userId;

    let quickClip = await QuickClip.findOne({ userId });
    
    if (!quickClip) {
        // Return empty content if not found, don't create yet to save space/writes
        return NextResponse.json({ success: true, data: { content: "" } });
    }

    return NextResponse.json({ success: true, data: { content: quickClip.content, updatedAt: quickClip.updatedAt } });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, error: "Database Connection Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = session.userId;
    
    const quickClip = await QuickClip.findOneAndUpdate(
        { userId },
        { content: body.content },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      data: {
        content: quickClip.content,
        updatedAt: quickClip.updatedAt
      } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

