import dbConnect from '@/lib/db';
import TrackerCard from '@/models/TrackerCard';
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
    
    if (!body.title || !body.columnId) {
      return NextResponse.json({ success: false, error: "Title and Column ID are required" }, { status: 400 });
    }

    // Find highest order in the column
    const lastCard = await TrackerCard.findOne({ user: userId, columnId: body.columnId }).sort({ order: -1 });
    const newOrder = lastCard ? lastCard.order + 1 : 0;
    
    const card = await TrackerCard.create({
      user: userId,
      columnId: body.columnId,
      title: body.title,
      description: body.description || '',
      link: body.link || '',
      order: newOrder
    });
    
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
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

