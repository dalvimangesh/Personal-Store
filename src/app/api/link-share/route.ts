import dbConnect from '@/lib/db';
import LinkShare from '@/models/LinkShare';
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

    const userId = session.userId;

    let linkShare = await LinkShare.findOne({ userId });
    
    if (!linkShare) {
        return NextResponse.json({ success: true, data: { items: [] } });
    }

    return NextResponse.json({ success: true, data: { items: linkShare.items, updatedAt: linkShare.updatedAt } });
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
    
    // Expecting items array
    const linkShare = await LinkShare.findOneAndUpdate(
        { userId },
        { items: body.items },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      data: {
        items: linkShare.items,
        updatedAt: linkShare.updatedAt
      } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

