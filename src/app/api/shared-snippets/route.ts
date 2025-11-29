import dbConnect from '@/lib/db';
import SharedSnippet from '@/models/SharedSnippet';
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

    const userId = session.userId;

    // Fetch snippets created by the user
    const snippets = await SharedSnippet.find({ userId }).sort({ createdAt: -1 });
    
    const formattedSnippets = snippets.map((doc: any) => ({
      id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      tags: doc.tags,
      allowedUsers: doc.allowedUsers,
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
    const userId = session.userId;
    
    const snippet = await SharedSnippet.create({ ...body, userId }) as any;
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
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

