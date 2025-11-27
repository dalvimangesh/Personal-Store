import dbConnect from '@/lib/db';
import Snippet from '@/models/Snippet';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  
  try {
    const body = await request.json();
    const snippet = await Snippet.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    
    if (!snippet) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    const s = snippet as any;
    
    return NextResponse.json({ 
      success: true, 
      data: {
        id: s._id.toString(),
        title: s.title,
        content: s.content,
        tags: s.tags,
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
    const deletedSnippet = await Snippet.deleteOne({ _id: id });
    
    if (!deletedSnippet) {
      return NextResponse.json({ success: false }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}

