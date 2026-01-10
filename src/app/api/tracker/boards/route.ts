import dbConnect from '@/lib/db';
import TrackerBoard from '@/models/TrackerBoard';
import TrackerColumn from '@/models/TrackerColumn';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;

    // Fetch existing boards
    let boards = await TrackerBoard.find({ user: userId }).sort({ createdAt: 1 });

    // Migration: If no boards exist, check if there are columns.
    // If there are columns (or even if not), create a default board.
    if (boards.length === 0) {
      const defaultBoard = await TrackerBoard.create({
        user: userId,
        title: 'Main Board',
      });
      
      // Assign existing orphan columns to this board
      await TrackerColumn.updateMany(
        { user: userId, boardId: { $exists: false } },
        { $set: { boardId: defaultBoard._id } }
      );

      boards = [defaultBoard];
    }

    const formattedBoards = boards.map((board: any) => ({
      id: board._id.toString(),
      title: board.title,
      isHidden: board.isHidden,
      createdAt: board.createdAt,
    }));

    return NextResponse.json({ 
      success: true, 
      data: formattedBoards
    });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, error: "Database Connection Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await request.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const board = await TrackerBoard.create({
      user: session.userId,
      title: title.trim(),
      isHidden: false,
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        id: board._id.toString(),
        title: board.title,
        isHidden: board.isHidden,
        createdAt: board.createdAt,
      }
    });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create board" }, { status: 500 });
  }
}

