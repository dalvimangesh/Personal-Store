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

    // Allow creating without boardId for backward compatibility if needed, 
    // but ideally we enforce it. For now, let's enforce it or check if user has only one board?
    // Frontend will send it.
    
    const query: any = { user: userId };
    if (body.boardId) {
        query.boardId = body.boardId;
    }

    // Find highest order to append to the end
    const lastColumn = await TrackerColumn.findOne(query).sort({ order: -1 });
    const newOrder = lastColumn ? lastColumn.order + 1 : 0;
    
    const columnData: any = {
      user: userId,
      title: body.title,
      order: newOrder
    };
    if (body.boardId) {
        columnData.boardId = body.boardId;
    }

    const column = await TrackerColumn.create(columnData);
    
    // Check if column is an array (handle edge case with create returning array in some mongoose versions or configs)
    const newColumn = Array.isArray(column) ? column[0] : column;
    
    return NextResponse.json({  
      success: true, 
      data: {
        id: newColumn._id.toString(),
        title: newColumn.title,
        order: newColumn.order,
        createdAt: newColumn.createdAt
      } 
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
