import dbConnect from '@/lib/db';
import TerminalCommand from '@/models/TerminalCommand';
import TerminalCategory from '@/models/TerminalCategory';
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

    const categoryConfig = await TerminalCategory.findOne({
      publicToken: token,
      isPublic: true
    }).populate('userId', 'username');

    if (!categoryConfig) {
      return NextResponse.json({ error: "Category not found or no longer public" }, { status: 404 });
    }

    const commands = await TerminalCommand.find({
        userId: categoryConfig.userId._id,
        category: categoryConfig.name
    }).sort({ title: 1 });

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
      isPublic: doc.isPublic,
      publicToken: doc.publicToken,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        name: categoryConfig.name,
        author: categoryConfig.userId.username,
        commands: formattedCommands
      }
    });

  } catch (error) {
    console.error("Public GET Terminal Category Error:", error);
    return NextResponse.json({ error: "Failed to fetch public category" }, { status: 500 });
  }
}
