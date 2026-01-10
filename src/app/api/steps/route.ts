import dbConnect from '@/lib/db';
import TerminalCommand from '@/models/TerminalCommand';
import TerminalCategory from '@/models/TerminalCategory';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;

    const [commands, categoryConfigs] = await Promise.all([
        TerminalCommand.find({
            $or: [
                { userId: userId },
                { sharedWith: userId }
            ]
        })
        .populate('userId', 'username')
        .populate('sharedWith', 'username')
        .sort({ category: 1, title: 1 }),
        
        TerminalCategory.find({ userId })
    ]);
    
    const formattedCommands = commands.map((doc: any) => ({
      id: doc._id.toString(),
      title: decrypt(doc.title),
      command: doc.command ? decrypt(doc.command) : '',
      description: doc.description ? decrypt(doc.description) : '',
      category: doc.category || 'General',
      os: doc.os,
      tags: doc.tags,
      steps: doc.steps?.map((s: any) => ({
        order: s.order,
        instruction: decrypt(s.instruction),
        command: s.command ? decrypt(s.command) : '',
        warning: s.warning ? decrypt(s.warning) : ''
      })) || [],
      variables: doc.variables?.map((v: any) => ({
        name: v.name,
        description: v.description,
        defaultValue: v.defaultValue ? decrypt(v.defaultValue) : ''
      })) || [],
      isOwner: doc.userId._id.toString() === userId,
      author: doc.userId.username,
      sharedWith: doc.sharedWith?.map((u: any) => ({ userId: u._id.toString(), username: u.username })) || [],
      isPublic: doc.isPublic,
      publicToken: doc.publicToken,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    const formattedCategories = categoryConfigs.map((doc: any) => ({
        name: doc.name,
        isPublic: doc.isPublic,
        publicToken: doc.publicToken
    }));

    return NextResponse.json({ success: true, data: formattedCommands, categories: formattedCategories });
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
    
    const commandData = {
      ...body,
      userId,
      title: encrypt(body.title),
      command: body.command ? encrypt(body.command) : encrypt(''),
      description: body.description ? encrypt(body.description) : encrypt(''),
      steps: body.steps?.map((s: any) => ({
        order: s.order,
        instruction: encrypt(s.instruction),
        command: s.command ? encrypt(s.command) : encrypt(''),
        warning: s.warning ? encrypt(s.warning) : encrypt('')
      })) || [],
      variables: body.variables?.map((v: any) => ({
        name: v.name,
        description: v.description,
        defaultValue: v.defaultValue ? encrypt(v.defaultValue) : encrypt('')
      })) || []
    };

    const newCommand = await TerminalCommand.create(commandData) as any;
    
    return NextResponse.json({  
      success: true, 
      data: {
        id: newCommand._id.toString(),
        title: decrypt(newCommand.title),
        command: newCommand.command ? decrypt(newCommand.command) : '',
        description: newCommand.description ? decrypt(newCommand.description) : '',
        category: newCommand.category,
        os: newCommand.os,
        tags: newCommand.tags,
        steps: newCommand.steps?.map((s: any) => ({
            order: s.order,
            instruction: decrypt(s.instruction),
            command: s.command ? decrypt(s.command) : '',
            warning: s.warning ? decrypt(s.warning) : ''
        })) || [],
        variables: newCommand.variables?.map((v: any) => ({
            name: v.name,
            description: v.description,
            defaultValue: decrypt(v.defaultValue)
        })) || [],
        createdAt: newCommand.createdAt,
        updatedAt: newCommand.updatedAt,
      } 
    }, { status: 201 });
  } catch (error) {
    console.error("Create Error:", error);
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
