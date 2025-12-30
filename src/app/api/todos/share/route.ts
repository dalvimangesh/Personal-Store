import dbConnect from '@/lib/db';
import TodoStore from '@/models/TodoStore';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request: Request) {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;
    const body = await request.json();
    const { categoryId, action, username, ownerId } = body;

    if (!categoryId || !action) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // If leaving a shared category, ownerId is required
    const targetUserId = (action === 'leave' && ownerId) ? ownerId : userId;
    const todoStore = await TodoStore.findOne({ userId: targetUserId });

    if (!todoStore) {
        return NextResponse.json({ error: "Todo Store not found" }, { status: 404 });
    }

    const categoryIndex = todoStore.categories.findIndex((c: any) => c._id.toString() === categoryId);
    if (categoryIndex === -1) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const category = todoStore.categories[categoryIndex];

    // Permission Check
    if (action !== 'leave' && targetUserId.toString() !== userId) {
         return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    if (action === 'add') {
        const userToShareWith = await User.findOne({ username });
        if (!userToShareWith) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        if (userToShareWith._id.toString() === userId) {
            return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
        }
        
        if (!category.sharedWith) category.sharedWith = [];
        if (!category.sharedWith.includes(userToShareWith._id)) {
            category.sharedWith.push(userToShareWith._id);
        }
    } else if (action === 'remove') {
        const userToRemove = await User.findOne({ username });
        if (userToRemove) {
            category.sharedWith = (category.sharedWith || []).filter((id: any) => id.toString() !== userToRemove._id.toString());
        }
    } else if (action === 'leave') {
        category.sharedWith = (category.sharedWith || []).filter((id: any) => id.toString() !== userId);
    } else if (action === 'public_toggle') {
        category.isPublic = !category.isPublic;
        if (category.isPublic && !category.publicToken) {
            category.publicToken = crypto.randomUUID();
        }
    }

    todoStore.categories[categoryIndex] = category;
    await todoStore.save();

    return NextResponse.json({ 
        success: true, 
        data: { 
            isPublic: category.isPublic, 
            publicToken: category.publicToken 
        } 
    });

  } catch (error) {
    console.error("Share Todo Error:", error);
    return NextResponse.json({ error: "Failed to perform share action" }, { status: 500 });
  }
}

