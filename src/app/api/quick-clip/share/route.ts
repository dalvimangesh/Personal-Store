import dbConnect from '@/lib/db';
import QuickClip from '@/models/QuickClip';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function POST(request: Request) {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clipboardId, action, username, ownerId } = body;
    const userId = session.userId;

    if (!clipboardId || !action) {
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (action === 'add') {
        if (!username) return NextResponse.json({ success: false, error: "Username required" }, { status: 400 });

        const quickClip = await QuickClip.findOne({ userId });
        if (!quickClip) return NextResponse.json({ success: false, error: "QuickClip not found" }, { status: 404 });

        const clipboard = quickClip.clipboards.id(clipboardId);
        if (!clipboard) return NextResponse.json({ success: false, error: "Clipboard not found" }, { status: 404 });

        const targetUser = await User.findOne({ username });
        if (!targetUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

        if (targetUser._id.toString() === userId) {
            return NextResponse.json({ success: false, error: "Cannot share with yourself" }, { status: 400 });
        }

        if (!clipboard.sharedWith) {
            clipboard.sharedWith = [];
        }

        const alreadyShared = clipboard.sharedWith.some((id: any) => id.toString() === targetUser._id.toString());
        if (!alreadyShared) {
            clipboard.sharedWith.push(targetUser._id);
            await quickClip.save();
        }

        return NextResponse.json({ success: true, data: { message: "User added" } });

    } else if (action === 'remove') {
        if (!username) return NextResponse.json({ success: false, error: "Username required" }, { status: 400 });

        const quickClip = await QuickClip.findOne({ userId });
        if (!quickClip) return NextResponse.json({ success: false, error: "QuickClip not found" }, { status: 404 });

        const clipboard = quickClip.clipboards.id(clipboardId);
        if (!clipboard) return NextResponse.json({ success: false, error: "Clipboard not found" }, { status: 404 });

        const targetUser = await User.findOne({ username });
        if (!targetUser) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

        clipboard.sharedWith = clipboard.sharedWith.filter((id: any) => id.toString() !== targetUser._id.toString());
        await quickClip.save();

        return NextResponse.json({ success: true, data: { message: "User removed" } });

    } else if (action === 'leave') {
        if (!ownerId) return NextResponse.json({ success: false, error: "Owner ID required" }, { status: 400 });

        const quickClip = await QuickClip.findOne({ userId: ownerId });
        if (!quickClip) return NextResponse.json({ success: false, error: "Owner QuickClip not found" }, { status: 404 });

        const clipboard = quickClip.clipboards.id(clipboardId);
        if (!clipboard) return NextResponse.json({ success: false, error: "Clipboard not found" }, { status: 404 });

        clipboard.sharedWith = clipboard.sharedWith.filter((id: any) => id.toString() !== userId);
        await quickClip.save();

        return NextResponse.json({ success: true, data: { message: "Left clipboard" } });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("Share Error:", error);
    return NextResponse.json({ success: false, error: error.message || "An unknown error occurred" }, { status: 500 });
  }
}

