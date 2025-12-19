import dbConnect from '@/lib/db';
import TrackerColumn from '@/models/TrackerColumn';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function POST(request: Request) {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = session.userId;
    
    if (!body.title) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    // Find highest order to append to the end
    const lastColumn = await TrackerColumn.findOne({ user: userId }).sort({ order: -1 });
    const newOrder = lastColumn ? lastColumn.order + 1 : 0;
    
    const column = await TrackerColumn.create({
      user: userId,
      title: body.title,
      order: newOrder
    });
    
    return NextResponse.json({  
      success: true, 
      data: {
        id: column._id.toString(),
        title: column.title,
        order: column.order,
        createdAt: column.createdAt
      } 
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

