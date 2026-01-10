import dbConnect from '@/lib/db';
import Snippet from '@/models/Snippet';
import DeletedItem from '@/models/DeletedItem';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const updateData = { ...body };
    if (updateData.title) updateData.title = encrypt(updateData.title);
    if (updateData.content) updateData.content = encrypt(updateData.content);

    const snippet = await Snippet.findOneAndUpdate(
      { _id: id, userId: session.userId },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );
    
    if (!snippet) {
      return NextResponse.json({ success: false, error: 'Snippet not found or unauthorized' }, { status: 404 });
    }

    const s = snippet as any;
    
    return NextResponse.json({ 
      success: true, 
      data: {
        id: s._id.toString(),
        title: decrypt(s.title),
        content: decrypt(s.content),
        tags: s.tags,
        isHidden: s.isHidden,
        isHiding: s.isHiding,
        createdAt: s.createdAt
      } 
    });
  } catch (_error) {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;

  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const snippet = await Snippet.findOne({ _id: id, userId: session.userId });

    if (!snippet) {
      return NextResponse.json({ success: false, error: 'Snippet not found or unauthorized' }, { status: 404 });
    }

    // Move to trash
    const snippetObj = snippet.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, userId: _uid, __v, ...snippetContent } = snippetObj;

    await DeletedItem.create({
      userId: session.userId,
      originalId: id,
      type: 'snippet',
      content: {
        ...snippetContent,
        title: decrypt(snippet.title),
        content: decrypt(snippet.content),
      },
    });

    await Snippet.deleteOne({ _id: id });
    
    return NextResponse.json({ success: true, data: {} });
  } catch (_error) {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
