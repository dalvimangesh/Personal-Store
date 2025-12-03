import dbConnect from '@/lib/db';
import DeletedItem, { IDeletedItem } from '@/models/DeletedItem';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';

export async function GET() {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await DeletedItem.find({ userId: session.userId }).sort({ createdAt: -1 });
    
    const decryptedItems = items.map((item: IDeletedItem) => {
        const itemObj = item.toObject ? item.toObject() : item;
        const content = itemObj.content || {};

        // Decrypt based on type
        if (itemObj.type === 'snippet') {
            content.title = decrypt(content.title);
            content.content = decrypt(content.content);
        } else if (itemObj.type === 'todo') {
            content.title = decrypt(content.title);
            if (content.description) {
                content.description = decrypt(content.description);
            }
        } else if (itemObj.type === 'link') {
            // Link deletion logic maps label -> title, value -> content
            content.title = decrypt(content.title);
            content.content = decrypt(content.content);
        } else if (itemObj.type === 'drop') {
            content.content = decrypt(content.content);
            // title is hardcoded "Drop Item" usually
        }

        return {
            ...itemObj,
            content
        };
    });

    return NextResponse.json({ success: true, data: decryptedItems });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const result = await DeletedItem.deleteMany({ 
        _id: { $in: ids },
        userId: session.userId 
    });

    return NextResponse.json({ 
        success: true, 
        count: result.deletedCount 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
