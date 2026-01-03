import dbConnect from '@/lib/db';
import Habit from '@/models/Habit';
import HabitLog from '@/models/HabitLog';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';

export async function PUT(
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

    const { id } = await params;
    const body = await request.json();
    const userId = session.userId;

    const habitData = { ...body };
    if (habitData.title) habitData.title = encrypt(habitData.title);
    if (habitData.description) habitData.description = encrypt(habitData.description);
    if (habitData.goalUnit) habitData.goalUnit = encrypt(habitData.goalUnit);

    const habit = await Habit.findOneAndUpdate(
      { _id: id, userId },
      habitData,
      { new: true }
    ) as any;

    if (!habit) {
      return NextResponse.json({ success: false, error: "Habit not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: habit._id.toString(),
        title: decrypt(habit.title),
        description: habit.description ? decrypt(habit.description) : undefined,
        goalValue: habit.goalValue,
        goalUnit: habit.goalUnit ? decrypt(habit.goalUnit) : undefined,
        frequency: habit.frequency,
        isHidden: habit.isHidden,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
      }
    });
  } catch (error) {
    console.error("Error updating habit:", error);
    return NextResponse.json({ success: false, error: "Failed to update habit" }, { status: 400 });
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

    const { id } = await params;
    const userId = session.userId;

    const habit = await Habit.findOneAndDelete({ _id: id, userId });

    if (!habit) {
      return NextResponse.json({ success: false, error: "Habit not found" }, { status: 404 });
    }

    // Delete all logs associated with this habit
    await HabitLog.deleteMany({ habitId: id, userId });

    return NextResponse.json({ success: true, message: "Habit deleted" });
  } catch (error) {
    console.error("Error deleting habit:", error);
    return NextResponse.json({ success: false, error: "Failed to delete habit" }, { status: 400 });
  }
}

