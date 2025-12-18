import dbConnect from '@/lib/db';
import Drop from '@/models/Drop';
import DropToken from '@/models/DropToken';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt } from '@/lib/encryption';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  await dbConnect();
  try {
    // userId here is actually the TOKEN, because the route is /drop/[userId] (which is confusing, but we are reusing it or creating a new one)
    // Wait, the user asked to change the link logic.
    // If we want to keep /drop/[token], we should create a new route file `src/app/api/public/drop/token/[token]/route.ts` or modify this one.
    // The current file path is `src/app/api/public/drop/[userId]/route.ts`.
    
    const { userId: tokenOrUserId } = await params;
    
    // 1. Verify Sender Session
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
       return NextResponse.json({ error: 'You must be logged in to send a drop.' }, { status: 401 });
    }

    const senderId = session.userId;

    const body = await request.json();
    if (!body.content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Check if it's a Token (UUID) or UserId (ObjectId)
    const isObjectId = tokenOrUserId.match(/^[0-9a-fA-F]{24}$/);
    let recipientId = "";

    if (isObjectId) {
        // Legacy behavior: Direct to User ID (we can keep or disable this)
        // User asked for "Unique, once someone send into it link will expire"
        // So maybe we strictly enforce tokens? But let's support both for backward compat or graceful migration
        recipientId = tokenOrUserId;
    } else {
        // It's a Token!
        const dropToken = await DropToken.findOne({ token: tokenOrUserId, isUsed: false });
        
        if (!dropToken) {
             return NextResponse.json({ error: 'This drop link is invalid or has already been used.' }, { status: 410 }); // 410 Gone
        }

        recipientId = dropToken.userId.toString();

        // Mark token as used immediately
        dropToken.isUsed = true;
        await dropToken.save();
    }

    // Prevent sending to self
    if (senderId === recipientId) {
        return NextResponse.json({ error: 'You cannot drop a message to yourself.' }, { status: 400 });
    }

    // Verify recipient exists
    const recipientExists = await User.findById(recipientId);
    if (!recipientExists) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    await Drop.create({
      content: encrypt(body.content),
      userId: recipientId,
      senderId: senderId,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Drop Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit drop' },
      { status: 500 }
    );
  }
}
