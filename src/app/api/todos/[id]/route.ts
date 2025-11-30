import dbConnect from '@/lib/db';
import Todo from '@/models/Todo';
import DeletedItem from '@/models/DeletedItem';
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

    // Validate priority if present
    if (body.priority !== undefined && (body.priority < 0 || body.priority > 9)) {
        return NextResponse.json({ success: false, error: "Priority must be between 0 and 9" }, { status: 400 });
    }

    const todo = await Todo.findOneAndUpdate(
      { _id: id, userId },
      { ...body },
      { new: true }
    );

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        id: todo._id.toString(),
        title: todo.title,
        description: todo.description,
        priority: todo.priority,
        startDate: todo.startDate,
        deadline: todo.deadline,
        isCompleted: todo.isCompleted,
        status: todo.status,
        createdAt: todo.createdAt
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
    
    const todo = await Todo.findOne({ _id: id, userId });

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found or unauthorized' }, { status: 404 });
    }

    // Move to trash
    await DeletedItem.create({
      userId,
      originalId: id,
      type: 'todo',
      content: {
        ...todo.toObject()
      },
    });

    await Todo.deleteOne({ _id: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
