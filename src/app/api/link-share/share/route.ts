import dbConnect from '@/lib/db';
import LinkShare from '@/models/LinkShare';
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

    const body = await request.json();
    const { categoryId, action, username, ownerId } = body;
    const userId = session.userId;

    if (!categoryId || !action) {
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (action === 'add') {
        // Add a user to my category
        if (!username) return NextResponse.json({ success: false, error: "Username required" }, { status: 400 });

        const linkShare = await LinkShare.findOne({ userId });
        if (!linkShare) return NextResponse.json({ success: false, error: "LinkShare not found" }, { status: 404 });

        const category = linkShare.categories.id(categoryId);
        if (!category) return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });

        const targetUser = await User.findOne({ username });
        if (!targetUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

        if (targetUser._id.toString() === userId) {
            return NextResponse.json({ success: false, error: "Cannot share with yourself" }, { status: 400 });
        }

        if (!category.sharedWith) {
            category.sharedWith = [];
        }

        const alreadyShared = category.sharedWith.some((id: any) => id.toString() === targetUser._id.toString());
        if (!alreadyShared) {
            category.sharedWith.push(targetUser._id);
            await linkShare.save();
        }

        return NextResponse.json({ success: true, data: { message: "User added" } });

    } else if (action === 'remove') {
        // Remove a user from my category
        if (!username) return NextResponse.json({ success: false, error: "Username required" }, { status: 400 });

        const linkShare = await LinkShare.findOne({ userId });
        if (!linkShare) return NextResponse.json({ success: false, error: "LinkShare not found" }, { status: 404 });

        const category = linkShare.categories.id(categoryId);
        if (!category) return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });

        const targetUser = await User.findOne({ username });
        if (!targetUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

        category.sharedWith = category.sharedWith.filter((id: any) => id.toString() !== targetUser._id.toString());
        await linkShare.save();

        return NextResponse.json({ success: true, data: { message: "User removed" } });

    } else if (action === 'leave') {
        // Leave a shared category
        if (!ownerId) return NextResponse.json({ success: false, error: "Owner ID required" }, { status: 400 });

        const linkShare = await LinkShare.findOne({ userId: ownerId });
        if (!linkShare) return NextResponse.json({ success: false, error: "Owner LinkShare not found" }, { status: 404 });

        const category = linkShare.categories.id(categoryId);
        if (!category) return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });

        category.sharedWith = category.sharedWith.filter((id: any) => id.toString() !== userId);
        await linkShare.save();

        return NextResponse.json({ success: true, data: { message: "Left category" } });

    } else if (action === 'public_toggle') {
        // Toggle public access
        const linkShare = await LinkShare.findOne({ userId });
        if (!linkShare) return NextResponse.json({ success: false, error: "LinkShare not found" }, { status: 404 });

        const category = linkShare.categories.id(categoryId);
        if (!category) return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });

        category.isPublic = !category.isPublic;
        
        if (category.isPublic && !category.publicToken) {
            category.publicToken = crypto.randomUUID();
        }

        await linkShare.save();

        return NextResponse.json({ 
            success: true, 
            data: { 
                isPublic: category.isPublic, 
                publicToken: category.publicToken 
            } 
        });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("Share Error:", error);
    return NextResponse.json({ success: false, error: error.message || "An unknown error occurred" }, { status: 500 });
  }
}

