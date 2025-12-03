import dbConnect from '@/lib/db';
import QuickClip from '@/models/QuickClip';
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

    let quickClip = await QuickClip.findOne({ userId });
    
    if (!quickClip) {
        // Return default structure if not found
        return NextResponse.json({ 
            success: true, 
            data: { 
                clipboards: [{ name: "Main", content: "" }] 
            } 
        });
    }

    // Migration/Legacy handling
    let clipboards = quickClip.clipboards;
    if ((!clipboards || clipboards.length === 0) && quickClip.content) {
        clipboards = [{ name: "Main", content: decrypt(quickClip.content) }];
    } else if (!clipboards || clipboards.length === 0) {
        clipboards = [{ name: "Main", content: "" }];
    } else {
        // Decrypt clipboards
        clipboards = clipboards.map((clip: any) => ({
            ...clip.toObject ? clip.toObject() : clip,
            name: decrypt(clip.name),
            content: decrypt(clip.content)
        }));
    }

    return NextResponse.json({ 
        success: true, 
        data: { 
            clipboards: clipboards,
            updatedAt: quickClip.updatedAt 
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
    
    // Expect clipboards array in body
    const clipboards = body.clipboards;

    if (!Array.isArray(clipboards)) {
        return NextResponse.json({ success: false, error: "Invalid data format" }, { status: 400 });
    }

    // Encrypt clipboards
    const encryptedClipboards = clipboards.map((clip: any) => ({
        name: encrypt(clip.name || "New Clipboard"),
        content: encrypt(clip.content || "")
    }));

    // Update content field for legacy support (using first clipboard)
    // Encrypt mainContent as well
    const mainContent = clipboards.length > 0 ? encrypt(clipboards[0].content || "") : encrypt("");

    const quickClip = await QuickClip.findOneAndUpdate(
        { userId },
        { 
            clipboards: encryptedClipboards,
            content: mainContent 
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Decrypt for response
    const decryptedClipboards = quickClip.clipboards.map((clip: any) => ({
        ...clip.toObject ? clip.toObject() : clip,
        name: decrypt(clip.name),
        content: decrypt(clip.content)
    }));

    return NextResponse.json({ 
      success: true, 
      data: {
        clipboards: decryptedClipboards,
        updatedAt: quickClip.updatedAt
      } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
