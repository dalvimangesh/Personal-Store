import dbConnect from '@/lib/db';
import DropToken from '@/models/DropToken';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  await dbConnect();
  try {
    const { token } = await params;

    // Check if it's a legacy UserID (ObjectId) - we treat those as "always valid" for now unless we want to block them
    if (token.match(/^[0-9a-fA-F]{24}$/)) {
         const userExists = await User.findById(token);
         if (!userExists) return NextResponse.json({ valid: false, error: 'User not found' }, { status: 404 });
         return NextResponse.json({ valid: true });
    }

    const dropToken = await DropToken.findOne({ token });

    if (!dropToken) {
      return NextResponse.json({ valid: false, error: 'Link invalid' }, { status: 404 });
    }

    if (dropToken.isUsed) {
      return NextResponse.json({ valid: false, error: 'Link expired' }, { status: 410 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Token Check Error:', error);
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 });
  }
}

