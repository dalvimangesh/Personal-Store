import dbConnect from '@/lib/db';
import Drop from '@/models/Drop';
import DeletedItem from '@/models/DeletedItem';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.userId;
    
    const drop = await Drop.findOne({ _id: id, userId });

    if (!drop) {
      return NextResponse.json({ error: 'Drop not found or unauthorized' }, { status: 404 });
    }

    // Move to trash
    await DeletedItem.create({
      userId,
      originalId: id,
      type: 'drop',
      content: {
        title: 'Drop Item', // Drops don't really have titles, so we give a generic one
        content: drop.content,
        ...drop.toObject()
      },
    });

    await Drop.deleteOne({ _id: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

