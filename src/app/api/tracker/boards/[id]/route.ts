import dbConnect from '@/lib/db';
import TrackerBoard from '@/models/TrackerBoard';
import TrackerColumn from '@/models/TrackerColumn';
import TrackerCard from '@/models/TrackerCard';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const board = await TrackerBoard.findOne({ _id: id, user: session.userId });
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Optional: Prevent deleting the last board? 
    // For now, let's allow it, but frontend should handle it or recreate default.
    // Or we can check count.
    const boardCount = await TrackerBoard.countDocuments({ user: session.userId });
    if (boardCount <= 1) {
       return NextResponse.json({ error: 'Cannot delete the last board' }, { status: 400 });
    }

    // Cascade delete columns and cards
    // First find columns to delete cards associated with them
    const columns = await TrackerColumn.find({ boardId: id });
    const columnIds = columns.map((col: any) => col._id);

    await TrackerCard.deleteMany({ columnId: { $in: columnIds } });
    await TrackerColumn.deleteMany({ boardId: id });
    await TrackerBoard.deleteOne({ _id: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete board" }, { status: 500 });
  }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        const cookieStore = await cookies();
        const session = await verifySession(cookieStore.get('session')?.value);

        if (!session?.userId || typeof session.userId !== 'string') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { title, isHidden } = await request.json();

        const updateFields: any = {};
        if (title !== undefined) updateFields.title = title.trim();
        if (isHidden !== undefined) updateFields.isHidden = isHidden;

        const board = await TrackerBoard.findOneAndUpdate(
            { _id: id, user: session.userId },
            updateFields,
            { new: true }
        );

        if (!board) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

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
        return NextResponse.json({ success: false, error: "Failed to update board" }, { status: 500 });
    }
}

