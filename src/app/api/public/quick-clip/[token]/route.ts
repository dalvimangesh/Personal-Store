import dbConnect from '@/lib/db';
import QuickClip from '@/models/QuickClip';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  await dbConnect();
  const { token } = await params;

  try {
    const quickClip = await QuickClip.findOne({ 
      'clipboards.publicToken': token 
    });

    if (!quickClip) {
      return NextResponse.json({ error: 'Clipboard not found' }, { status: 404 });
    }

    const clipboard = quickClip.clipboards.find((c: any) => c.publicToken === token);

    if (!clipboard) {
        return NextResponse.json({ error: 'Clipboard not found' }, { status: 404 });
    }

    if (!clipboard.isPublic) {
        return NextResponse.json({ error: 'This clipboard is no longer public' }, { status: 403 });
    }

    return NextResponse.json({ 
        success: true, 
        data: {
            name: decrypt(clipboard.name),
            content: decrypt(clipboard.content),
            updatedAt: quickClip.updatedAt
        } 
    });

  } catch (error) {
    console.error("Public Clipboard Fetch Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

