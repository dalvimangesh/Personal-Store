import dbConnect from '@/lib/db';
import HabitLog from '@/models/HabitLog';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: habitId } = await params;
    const body = await request.json();
    const { date, value, completed = true } = body;
    const userId = session.userId;

    if (!date) {
      return NextResponse.json({ success: false, error: "Date is required" }, { status: 400 });
    }

    // Upsert the log for the given habit and date
    const log = await HabitLog.findOneAndUpdate(
      { habitId, date, userId },
      { value, completed },
      { upsert: true, new: true }
    ) as any;

    return NextResponse.json({
      success: true,
      data: {
        id: log._id.toString(),
        habitId: log.habitId.toString(),
        date: log.date,
        value: log.value,
        completed: log.completed,
        createdAt: log.createdAt,
      }
    });
  } catch (error) {
    console.error("Error logging habit:", error);
    return NextResponse.json({ success: false, error: "Failed to log habit" }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: habitId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const userId = session.userId;

    if (!date) {
      return NextResponse.json({ success: false, error: "Date is required" }, { status: 400 });
    }

    const result = await HabitLog.findOneAndDelete({ habitId, date, userId });

    if (!result) {
      return NextResponse.json({ success: false, error: "Log not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Log deleted" });
  } catch (error) {
    console.error("Error deleting log:", error);
    return NextResponse.json({ success: false, error: "Failed to delete log" }, { status: 400 });
  }
}

