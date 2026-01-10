import dbConnect from '@/lib/db';
import QuickClip from '@/models/QuickClip';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';

export async function PUT(request: Request) {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clipboardId, ownerId, clipboard } = body;

    if (!clipboardId || !ownerId || !clipboard) {
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const userId = session.userId;

    // Find the owner's QuickClip document
    const quickClip = await QuickClip.findOne({ userId: ownerId });
    
    if (!quickClip) {
        return NextResponse.json({ success: false, error: "Owner not found" }, { status: 404 });
    }

    // Find the specific clipboard
    const clipboardIndex = quickClip.clipboards.findIndex((c: any) => c._id.toString() === clipboardId);
    
    if (clipboardIndex === -1) {
        return NextResponse.json({ success: false, error: "Clipboard not found" }, { status: 404 });
    }

    const targetClipboard = quickClip.clipboards[clipboardIndex];

    // Check permissions
    const isOwner = ownerId === userId;
    const isShared = targetClipboard.sharedWith?.map((id: any) => id.toString()).includes(userId);

    if (!isOwner && !isShared) {
        return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    // Update the clipboard
    const encryptedName = encrypt(clipboard.name);
    const encryptedContent = encrypt(clipboard.content);

    targetClipboard.name = encryptedName;
    targetClipboard.content = encryptedContent;
    targetClipboard.isHidden = clipboard.isHidden;
    targetClipboard.isBold = clipboard.isBold;
    targetClipboard.color = clipboard.color;
    
    quickClip.clipboards[clipboardIndex] = targetClipboard;
    
    await quickClip.save();

    return NextResponse.json({ 
        success: true, 
        data: { 
            message: "Clipboard updated"
        } 
    });

  } catch (error) {
    console.error("Update Clipboard Error:", error);
    return NextResponse.json({ success: false, error: error }, { status: 500 });
  }
}

