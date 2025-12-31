import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { createSession } from '@/lib/auth';
import { cookies } from 'next/headers';

const client = new OAuth2Client(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

export async function POST(request: Request) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json({ error: 'Credential is required' }, { status: 400 });
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });
    }

    const { sub: googleId, email, name, picture } = payload;

    await dbConnect();

    // Check if user exists by googleId
    let user = await User.findOne({ googleId });

    // If not found, check by email (to link account if it already exists with same email)
    if (!user && email) {
      user = await User.findOne({ email });
      if (user) {
        // Link the existing account
        user.googleId = googleId;
        await user.save();
      }
    }

    // If still not found, create a new user
    if (!user) {
      // For username, we'll use the Google name. 
      // We need to ensure it's unique.
      let baseUsername = name?.replace(/\s+/g, '').toLowerCase() || `user_${googleId.substring(0, 10)}`;
      let username = baseUsername;
      let counter = 1;

      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await User.create({
        username,
        email,
        googleId,
        // picture // optionally store picture if model is updated
      });
    }

    // Create session
    const duration = '30d'; // We'll default to 30 days for Google login
    const token = await createSession({ userId: user._id.toString(), username: user.username }, duration);

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ 
      success: true, 
      user: { 
        username: user.username,
        email: user.email,
        picture: picture
      } 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Google Auth Error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

