import dbConnect from '@/lib/db';
import Todo from '@/models/Todo';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
  try {
    await dbConnect();
    
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;

    const todos = await Todo.find({ userId }).sort({ isCompleted: 1, priority: -1, createdAt: -1 });
    
    const formattedTodos = todos.map((doc: any) => ({
      id: doc._id.toString(),
      title: decrypt(doc.title),
      description: doc.description ? decrypt(doc.description) : undefined,
      priority: doc.priority,
      startDate: doc.startDate,
      deadline: doc.deadline,
      isCompleted: doc.isCompleted,
      status: doc.status || (doc.isCompleted ? 'completed' : 'todo'), // Fallback for existing data
      createdAt: doc.createdAt,
    }));
    return NextResponse.json({ success: true, data: formattedTodos });
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
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = session.userId;
    
    // Validate priority
    if (body.priority !== undefined && (body.priority < 0 || body.priority > 9)) {
        return NextResponse.json({ success: false, error: "Priority must be between 0 and 9" }, { status: 400 });
    }
    
    const todoData = { ...body, userId };
    if (todoData.title) todoData.title = encrypt(todoData.title);
    if (todoData.description) todoData.description = encrypt(todoData.description);

    const todo = await Todo.create(todoData) as any;
    
    return NextResponse.json({  
      success: true, 
      data: {
        id: todo._id.toString(),
        title: decrypt(todo.title),
        description: todo.description ? decrypt(todo.description) : undefined,
        priority: todo.priority,
        startDate: todo.startDate,
        deadline: todo.deadline,
        isCompleted: todo.isCompleted,
        status: todo.status,
        createdAt: todo.createdAt
      } 
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
