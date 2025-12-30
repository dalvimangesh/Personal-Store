import dbConnect from '@/lib/db';
import TodoStore from '@/models/TodoStore';
import DeletedItem from '@/models/DeletedItem';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';

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
    
    // Find the todo in the user's TodoStore
    const todoStore = await TodoStore.findOne({ userId });

    if (!todoStore) {
      return NextResponse.json({ error: 'Todo Store not found' }, { status: 404 });
    }

    let foundTodo: any = null;
    let categoryIndex = -1;
    let todoIndex = -1;

    for (let i = 0; i < todoStore.categories.length; i++) {
        const index = todoStore.categories[i].items.findIndex((t: any) => t._id.toString() === id);
        if (index !== -1) {
            foundTodo = todoStore.categories[i].items[index];
            categoryIndex = i;
            todoIndex = index;
            break;
        }
    }

    if (!foundTodo) {
      return NextResponse.json({ error: 'Todo not found in categories' }, { status: 404 });
    }

    // Move to trash
    await DeletedItem.create({
      userId,
      originalId: id,
      type: 'todo',
      content: {
        ...foundTodo.toObject ? foundTodo.toObject() : foundTodo,
        title: decrypt(foundTodo.title),
        description: foundTodo.description ? decrypt(foundTodo.description) : undefined,
        userId // Include userId for compatibility
      },
    });

    // Remove from TodoStore
    todoStore.categories[categoryIndex].items.splice(todoIndex, 1);
    await todoStore.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Todo Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete todo" }, { status: 400 });
  }
}

// PUT is handled by bulk update or category update for now, but we can implement it here if needed
export async function PUT() {
    return NextResponse.json({ error: 'Method not allowed. Use category update or bulk update.' }, { status: 405 });
}
