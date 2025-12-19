import dbConnect from '@/lib/db';
import TrackerColumn from '@/models/TrackerColumn';
import TrackerCard from '@/models/TrackerCard';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const userId = session.userId;
    
    const column = await TrackerColumn.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { title: body.title } },
      { new: true }
    );
    
    if (!column) {
      return NextResponse.json({ success: false, error: "Column not found" }, { status: 404 });
    }

    return NextResponse.json({  
      success: true, 
      data: {
        id: column._id.toString(),
        title: column.title,
        order: column.order,
        createdAt: column.createdAt
      } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.userId;
    
    const column = await TrackerColumn.findOneAndDelete({ _id: id, user: userId });
    
    if (!column) {
      return NextResponse.json({ success: false, error: "Column not found" }, { status: 404 });
    }

    // Delete associated cards
    await TrackerCard.deleteMany({ columnId: id, user: userId });

    return NextResponse.json({ success: true, message: "Column deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

