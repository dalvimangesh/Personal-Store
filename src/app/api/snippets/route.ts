import dbConnect from '@/lib/db';
import Snippet from '@/models/Snippet';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // userId is guaranteed to be a string now
    const userId = session.userId;

    const snippets = await Snippet.find({ userId }).sort({ createdAt: -1 });
    
    // Transform _id to id for frontend consistency
    const formattedSnippets = snippets.map((doc: any) => ({
      id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      tags: doc.tags,
      isHidden: doc.isHidden || false,
      createdAt: doc.createdAt,
    }));
    return NextResponse.json({ success: true, data: formattedSnippets });
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
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // userId is guaranteed to be a string now
    const userId = session.userId;
    
    const snippet = await Snippet.create({ ...body, userId }) as any;
    return NextResponse.json({  
      success: true, 
      data: {
        id: snippet._id.toString(),
        title: snippet.title,
        content: snippet.content,
        tags: snippet.tags,
        isHidden: snippet.isHidden,
        createdAt: snippet.createdAt
      } 
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
