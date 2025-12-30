import dbConnect from '@/lib/db';
import TodoStore from '@/models/TodoStore';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await dbConnect();
    const { token } = await params;

    // Find the store containing this public category
    const todoStore = await TodoStore.findOne({
      "categories.publicToken": token,
      "categories.isPublic": true
    });

    if (!todoStore) {
      return NextResponse.json({ error: "Category not found or no longer public" }, { status: 404 });
    }

    const category = todoStore.categories.find((c: any) => c.publicToken === token);

    if (!category || !category.isPublic) {
      return NextResponse.json({ error: "Category not found or no longer public" }, { status: 404 });
    }

    // Decrypt data for public view
    const decryptedItems = (category.items || []).map((item: any) => ({
      title: decrypt(item.title),
      description: item.description ? decrypt(item.description) : undefined,
      priority: item.priority,
      startDate: item.startDate,
      deadline: item.deadline,
      isCompleted: item.isCompleted,
      status: item.status,
      id: item._id.toString()
    })).sort((a: any, b: any) => {
        if (a.isCompleted !== b.isCompleted) return Number(a.isCompleted) - Number(b.isCompleted);
        if (a.priority !== b.priority) return b.priority - a.priority;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return NextResponse.json({
      success: true,
      data: {
        name: decrypt(category.name),
        items: decryptedItems
      }
    });

  } catch (error) {
    console.error("Public GET Todo Error:", error);
    return NextResponse.json({ error: "Failed to fetch public todos" }, { status: 500 });
  }
}

