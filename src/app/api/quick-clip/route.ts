import dbConnect from '@/lib/db';
import QuickClip from '@/models/QuickClip';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

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
        clipboards = [{ name: "Main", content: quickClip.content }];
    } else if (!clipboards || clipboards.length === 0) {
        clipboards = [{ name: "Main", content: "" }];
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

    // Update content field for legacy support (using first clipboard)
    const mainContent = clipboards.length > 0 ? clipboards[0].content : "";

    const quickClip = await QuickClip.findOneAndUpdate(
        { userId },
        { 
            clipboards: clipboards,
            content: mainContent 
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      data: {
        clipboards: quickClip.clipboards,
        updatedAt: quickClip.updatedAt
      } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
