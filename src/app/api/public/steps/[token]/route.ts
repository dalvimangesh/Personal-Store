import dbConnect from '@/lib/db';
import TerminalCommand from '@/models/TerminalCommand';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await dbConnect();
    const { token } = await params;

    const command = await TerminalCommand.findOne({
      publicToken: token,
      isPublic: true
    }).populate('userId', 'username');

    if (!command) {
      return NextResponse.json({ error: "Command not found or no longer public" }, { status: 404 });
    }

    const formattedCommand = {
      id: command._id.toString(),
      title: decrypt(command.title),
      command: command.command ? decrypt(command.command) : '',
      description: command.description ? decrypt(command.description) : '',
      category: command.category || 'General',
      os: command.os,
      tags: command.tags,
      steps: command.steps?.map((s: any) => ({
        order: s.order,
        instruction: decrypt(s.instruction),
        command: s.command ? decrypt(s.command) : '',
        warning: s.warning ? decrypt(s.warning) : ''
      })) || [],
      variables: command.variables?.map((v: any) => ({
        name: v.name,
        description: v.description,
        defaultValue: v.defaultValue ? decrypt(v.defaultValue) : ''
      })) || [],
      author: command.userId.username,
      createdAt: command.createdAt,
      updatedAt: command.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: formattedCommand
    });

  } catch (error) {
    console.error("Public GET Terminal Error:", error);
    return NextResponse.json({ error: "Failed to fetch public command" }, { status: 500 });
  }
}
