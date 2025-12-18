import dbConnect from '@/lib/db';
import QuickClip from '@/models/QuickClip';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
  try {
    await dbConnect();
    
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;

    // 1. Fetch my own QuickClip
    let myQuickClip = await QuickClip.findOne({ userId });
    
    // 2. Fetch QuickClips where I am in sharedWith
    const sharedQuickClips = await QuickClip.find({ 
        "clipboards.sharedWith": userId 
    }).populate('userId', 'username');

    let allClipboards = [];

    // Process my own clipboards
    if (myQuickClip) {
        let myClips = myQuickClip.clipboards || [];
        
        // Migration: legacy content
        if ((!myClips || myClips.length === 0) && myQuickClip.content) {
            myClips = [{ 
                name: encrypt("Main"), 
                content: myQuickClip.content, 
                sharedWith: [] 
            }];
        } else if (!myClips || myClips.length === 0) {
            myClips = [{ 
                name: encrypt("Main"), 
                content: encrypt(""), 
                sharedWith: [] 
            }];
        }

        // Decrypt and format my clipboards
        const myDecryptedClips = await Promise.all(myClips.map(async (clip: any) => {
            const clipObj = clip.toObject ? clip.toObject() : clip;
            
            let sharedWithUsers: any[] = [];
            if (clipObj.sharedWith && clipObj.sharedWith.length > 0) {
                sharedWithUsers = await User.find({ _id: { $in: clipObj.sharedWith } }).select('username _id');
            }

            return {
                ...clipObj,
                name: decrypt(clipObj.name),
                content: decrypt(clipObj.content),
                isOwner: true,
                ownerId: userId,
                sharedWith: sharedWithUsers.map(u => ({ userId: u._id, username: u.username }))
            };
        }));
        
        allClipboards.push(...myDecryptedClips);
    } else {
        // Default for new user
        allClipboards.push({ 
            name: "Main", 
            content: "",
            isOwner: true,
            ownerId: userId,
            sharedWith: []
        });
    }

    // Process shared clipboards
    for (const doc of sharedQuickClips) {
        const docOwner = doc.userId;
        const ownerId = docOwner._id || docOwner;
        const ownerUsername = docOwner.username || "Unknown";

        const sharedClips = doc.clipboards.filter((clip: any) => 
            clip.sharedWith && clip.sharedWith.map((id: any) => id.toString()).includes(userId)
        );

        const decryptedSharedClips = await Promise.all(sharedClips.map(async (clip: any) => {
            const clipObj = clip.toObject ? clip.toObject() : clip;
            
            let sharedWithUsers: any[] = [];
            if (clipObj.sharedWith && clipObj.sharedWith.length > 0) {
                sharedWithUsers = await User.find({ _id: { $in: clipObj.sharedWith } }).select('username _id');
            }

            return {
                ...clipObj,
                name: decrypt(clipObj.name),
                content: decrypt(clipObj.content),
                isOwner: false,
                ownerId: ownerId,
                ownerUsername: ownerUsername,
                sharedWith: sharedWithUsers.map(u => ({ userId: u._id, username: u.username }))
            };
        }));

        allClipboards.push(...decryptedSharedClips);
    }

    return NextResponse.json({ 
        success: true, 
        data: { 
            clipboards: allClipboards, 
            updatedAt: myQuickClip?.updatedAt || new Date()
        } 
    });
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
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = session.userId;
    
    const clipboards = body.clipboards;

    if (!Array.isArray(clipboards)) {
        return NextResponse.json({ success: false, error: "Invalid data format" }, { status: 400 });
    }

    // Filter only owned clipboards
    const ownedClipboards = clipboards.filter((clip: any) => {
        if (clip.ownerId && clip.ownerId !== userId) return false;
        if (clip.isOwner === false) return false;
        return true;
    });

    // Encrypt clipboards
    const encryptedClipboards = ownedClipboards.map((clip: any) => ({
        ...clip,
        name: encrypt(clip.name || "New Clipboard"),
        content: encrypt(clip.content || ""),
        // Preserve sharedWith IDs
        sharedWith: clip.sharedWith ? clip.sharedWith.map((u: any) => u.userId || u) : []
    }));

    // Legacy content update
    const mainContent = ownedClipboards.length > 0 ? encrypt(ownedClipboards[0].content || "") : encrypt("");

    const quickClip = await QuickClip.findOneAndUpdate(
        { userId },
        { 
            clipboards: encryptedClipboards,
            content: mainContent 
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const decryptedClipboards = quickClip.clipboards.map((clip: any) => ({
        ...clip.toObject ? clip.toObject() : clip,
        name: decrypt(clip.name),
        content: decrypt(clip.content),
        isOwner: true,
        ownerId: userId,
        sharedWith: (clip.sharedWith || []).map((id: any) => ({ userId: id })) 
    }));

    return NextResponse.json({ 
      success: true, 
      data: {
        clipboards: decryptedClipboards,
        updatedAt: quickClip.updatedAt
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Save failed" }, { status: 400 });
  }
}
