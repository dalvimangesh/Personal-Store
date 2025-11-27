import dbConnect from '@/lib/db';
import Snippet from '@/models/Snippet';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();
    const snippets = await Snippet.find({}).sort({ createdAt: -1 });
    // Transform _id to id for frontend consistency
    const formattedSnippets = snippets.map((doc: any) => ({
      id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      tags: doc.tags,
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
    const body = await request.json();
    const snippet = await Snippet.create(body) as any;
    return NextResponse.json({ 
      success: true, 
      data: {
        id: snippet._id.toString(),
        title: snippet.title,
        content: snippet.content,
        tags: snippet.tags,
        createdAt: snippet.createdAt
      } 
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

