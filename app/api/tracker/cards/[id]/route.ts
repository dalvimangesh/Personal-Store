import dbConnect from '@/lib/db';
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
    
    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.link !== undefined) updates.link = body.link;
    if (body.columnId !== undefined) updates.columnId = body.columnId;
    if (body.order !== undefined) updates.order = body.order;

    const card = await TrackerCard.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: updates },
      { new: true }
    );
    
    if (!card) {
      return NextResponse.json({ success: false, error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({  
      success: true, 
      data: {
        id: card._id.toString(),
        columnId: card.columnId.toString(),
        title: card.title,
        description: card.description,
        link: card.link,
        order: card.order,
        createdAt: card.createdAt
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
    
    const card = await TrackerCard.findOneAndDelete({ _id: id, user: userId });
    
    if (!card) {
      return NextResponse.json({ success: false, error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Card deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

