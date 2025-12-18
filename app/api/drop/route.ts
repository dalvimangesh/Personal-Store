import dbConnect from '@/lib/db';
import Drop from '@/models/Drop';
import User from '@/models/User'; // Import User model to ensure registration
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';

export async function GET() {
  await dbConnect(); // Ensure DB is connected first
  
  try {
    // Force User model registration if not already done
    // This prevents "Schema hasn't been registered for model 'User'" errors during populate
    const _ = User; 

    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;

    // Populate senderId to get username
    const drops = await Drop.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'senderId',
        model: 'User', // Explicitly specify model name string to be safe
        select: 'username',
        strictPopulate: false // Allow populating fields not in schema (for hot-reload resilience)
      }); 
    
    const formattedDrops = drops.map((doc: any) => ({
      id: doc._id.toString(),
      content: decrypt(doc.content),
      createdAt: doc.createdAt,
      // Safety check for senderId being null (old records) or populated user being null (deleted user)
      sender: doc.senderId && doc.senderId.username ? doc.senderId.username : 'Anonymous', 
    }));

    return NextResponse.json({ success: true, data: formattedDrops, userId });
  } catch (error: any) {
    console.error("Drop Fetch Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Database Connection Failed" }, { status: 500 });
  }
}
