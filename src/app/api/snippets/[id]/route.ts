import dbConnect from '@/lib/db';
import Snippet from '@/models/Snippet';
import DeletedItem from '@/models/DeletedItem';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

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
    const snippet = await Snippet.findOneAndUpdate(
      { _id: id, userId: session.userId },
      body,
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
        title: s.title,
        content: s.content,
        tags: s.tags,
        isHidden: s.isHidden,
        createdAt: s.createdAt
      } 
    });
  } catch (error) {
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
    await DeletedItem.create({
      userId: session.userId,
      originalId: id,
      type: 'snippet',
      content: {
        title: snippet.title,
        content: snippet.content,
        ...snippet.toObject()
      },
    });

    await Snippet.deleteOne({ _id: id });
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
