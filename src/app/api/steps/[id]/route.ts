import dbConnect from '@/lib/db';
import TerminalCommand from '@/models/TerminalCommand';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

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
    const userId = session.userId;

    const updateData: any = {};
    if (body.title) updateData.title = encrypt(body.title);
    if (body.command !== undefined) updateData.command = encrypt(body.command);
    if (body.description !== undefined) updateData.description = encrypt(body.description);
    
    if (body.category !== undefined) updateData.category = body.category;
    if (body.os !== undefined) updateData.os = body.os;
    if (body.tags !== undefined) updateData.tags = body.tags;
    
    if (body.variables) {
        updateData.variables = body.variables.map((v: any) => ({
            name: v.name,
            description: v.description,
            defaultValue: v.defaultValue ? encrypt(v.defaultValue) : encrypt('')
        }));
    }

    if (body.steps) {
        updateData.steps = body.steps.map((s: any) => ({
            order: s.order,
            instruction: encrypt(s.instruction),
            command: s.command ? encrypt(s.command) : encrypt(''),
            warning: s.warning ? encrypt(s.warning) : encrypt('')
        }));
    }

    const updatedCommand = await TerminalCommand.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );

    if (!updatedCommand) {
      return NextResponse.json({ success: false, error: 'Command not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedCommand._id.toString(),
        title: decrypt(updatedCommand.title),
        command: updatedCommand.command ? decrypt(updatedCommand.command) : '',
        description: updatedCommand.description ? decrypt(updatedCommand.description) : '',
        category: updatedCommand.category,
        os: updatedCommand.os,
        tags: updatedCommand.tags,
        steps: updatedCommand.steps?.map((s: any) => ({
            order: s.order,
            instruction: decrypt(s.instruction),
            command: s.command ? decrypt(s.command) : '',
            warning: s.warning ? decrypt(s.warning) : ''
        })) || [],
        variables: updatedCommand.variables?.map((v: any) => ({
            name: v.name,
            description: v.description,
            defaultValue: decrypt(v.defaultValue)
        })) || [],
        createdAt: updatedCommand.createdAt,
        updatedAt: updatedCommand.updatedAt,
      },
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

    const deletedCommand = await TerminalCommand.findOneAndDelete({ _id: id, userId: session.userId });

    if (!deletedCommand) {
      return NextResponse.json({ success: false, error: 'Command not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
