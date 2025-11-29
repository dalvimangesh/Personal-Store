import dbConnect from '@/lib/db';
import SharedSnippet from '@/models/SharedSnippet';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const snippet = await SharedSnippet.findById(id);
    if (!snippet) {
      return NextResponse.json({ error: 'Snippet not found' }, { status: 404 });
    }

    // Check access
    const isOwner = snippet.userId.toString() === session.userId;
    
    if (isOwner) {
      return NextResponse.json({ 
        success: true, 
        data: {
          id: snippet._id.toString(),
          title: snippet.title,
          content: snippet.content,
          tags: snippet.tags,
          allowedUsers: snippet.allowedUsers,
          createdAt: snippet.createdAt,
          isOwner: true
        } 
      });
    }

    // If not owner, check sharing rules
    const currentUser = await User.findById(session.userId);
    if (!currentUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const allowedUsers = snippet.allowedUsers || [];
    const isAllowed = allowedUsers.length === 0 || allowedUsers.includes(currentUser.username);

    if (!isAllowed) {
       return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
    }

    // Return limited data for viewers (maybe same data but good to be explicit)
    return NextResponse.json({ 
        success: true, 
        data: {
          id: snippet._id.toString(),
          title: snippet.title,
          content: snippet.content,
          tags: snippet.tags,
          // allowedUsers not strictly needed for viewer, but maybe useful
          createdAt: snippet.createdAt,
          isOwner: false,
          author: snippet.userId // Maybe we want to show who shared it?
        } 
      });

  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, error: "Database Connection Failed" }, { status: 500 });
  }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    await dbConnect();
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const session = await verifySession(cookieStore.get('session')?.value);

        if (!session?.userId || typeof session.userId !== 'string') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        
        // Only owner can update
        const snippet = await SharedSnippet.findOne({ _id: id, userId: session.userId });
        
        if (!snippet) {
            return NextResponse.json({ error: 'Snippet not found or unauthorized' }, { status: 404 });
        }

        snippet.title = body.title || snippet.title;
        snippet.content = body.content || snippet.content;
        snippet.tags = body.tags || snippet.tags;
        snippet.allowedUsers = body.allowedUsers || snippet.allowedUsers;

        await snippet.save();

        return NextResponse.json({
            success: true,
            data: {
                id: snippet._id.toString(),
                title: snippet.title,
                content: snippet.content,
                tags: snippet.tags,
                allowedUsers: snippet.allowedUsers,
                createdAt: snippet.createdAt
            }
        });

    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    await dbConnect();
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const session = await verifySession(cookieStore.get('session')?.value);

        if (!session?.userId || typeof session.userId !== 'string') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await SharedSnippet.deleteOne({ _id: id, userId: session.userId });

        if (result.deletedCount === 0) {
             return NextResponse.json({ error: 'Snippet not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}

