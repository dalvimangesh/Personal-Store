import dbConnect from '@/lib/db';
import TerminalCommand from '@/models/TerminalCommand';
import TerminalCategory from '@/models/TerminalCategory';
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
    const { commandId, action, username, categoryName } = body;

    if (!action) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Handle Category Public Toggle
    if (action === 'public_toggle' && categoryName) {
        let categoryConfig = await TerminalCategory.findOne({ userId, name: categoryName });
        
        if (!categoryConfig) {
            categoryConfig = await TerminalCategory.create({
                userId,
                name: categoryName,
                isPublic: false
            });
        }

        categoryConfig.isPublic = !categoryConfig.isPublic;
        if (categoryConfig.isPublic && !categoryConfig.publicToken) {
            categoryConfig.publicToken = crypto.randomUUID();
        }
        await categoryConfig.save();

        return NextResponse.json({
            success: true,
            data: {
                isPublic: categoryConfig.isPublic,
                publicToken: categoryConfig.publicToken
            }
        });
    }

    // Handle Category Sharing (User Access)
    if (action === 'share_category' || action === 'unshare_category') {
        if (!categoryName) return NextResponse.json({ error: "Category name required" }, { status: 400 });
        
        const userToShareWith = await User.findOne({ username });
        if (!userToShareWith) return NextResponse.json({ error: "User not found" }, { status: 404 });
        if (userToShareWith._id.toString() === userId) return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });

        if (action === 'share_category') {
            await TerminalCommand.updateMany(
                { userId, category: categoryName },
                { $addToSet: { sharedWith: userToShareWith._id } }
            );
        } else {
            await TerminalCommand.updateMany(
                { userId, category: categoryName },
                { $pull: { sharedWith: userToShareWith._id } }
            );
        }
        return NextResponse.json({ success: true });
    }

    // Handle Individual Command Sharing
    if (!commandId) {
        return NextResponse.json({ error: "Command ID required" }, { status: 400 });
    }

    const command = await TerminalCommand.findById(commandId);
    if (!command) {
        return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }

    // Permission check
    // For 'leave', user must be in sharedWith. For others, user must be owner.
    if (action === 'leave') {
        // command.sharedWith is array of ObjectIds
        const isShared = command.sharedWith.some((id: any) => id.toString() === userId);
        if (!isShared) return NextResponse.json({ error: "Not shared with you" }, { status: 403 });
    } else {
        if (command.userId.toString() !== userId) {
             return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }
    }

    if (action === 'add') {
        const userToShareWith = await User.findOne({ username });
        if (!userToShareWith) return NextResponse.json({ error: "User not found" }, { status: 404 });
        if (userToShareWith._id.toString() === userId) return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
        
        if (!command.sharedWith.includes(userToShareWith._id)) {
            command.sharedWith.push(userToShareWith._id);
        }
    } else if (action === 'remove') {
        const userToRemove = await User.findOne({ username });
        if (userToRemove) {
            command.sharedWith = command.sharedWith.filter((id: any) => id.toString() !== userToRemove._id.toString());
        }
    } else if (action === 'leave') {
        command.sharedWith = command.sharedWith.filter((id: any) => id.toString() !== userId);
    } else if (action === 'public_toggle') {
        command.isPublic = !command.isPublic;
        if (command.isPublic && !command.publicToken) {
            command.publicToken = crypto.randomUUID();
        }
    }

    await command.save();

    return NextResponse.json({ 
        success: true, 
        data: { 
            isPublic: command.isPublic, 
            publicToken: command.publicToken,
            sharedWith: command.sharedWith
        } 
    });

  } catch (error) {
    console.error("Share Terminal Command Error:", error);
    return NextResponse.json({ error: "Failed to perform share action" }, { status: 500 });
  }
}
