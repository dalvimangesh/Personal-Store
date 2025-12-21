import dbConnect from '@/lib/db';
import Habit from '@/models/Habit';
import HabitLog from '@/models/HabitLog';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
  try {
    await dbConnect();
    
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;

    const habits = await Habit.find({ userId }).sort({ createdAt: -1 });
    const logs = await HabitLog.find({ userId }).sort({ date: -1 });

    const formattedHabits = habits.map((doc: any) => {
      const habitLogs = logs
        .filter((log: any) => log.habitId.toString() === doc._id.toString())
        .map((log: any) => ({
          id: log._id.toString(),
          habitId: log.habitId.toString(),
          date: log.date,
          value: log.value,
          completed: log.completed,
          createdAt: log.createdAt,
        }));

      return {
        id: doc._id.toString(),
        title: decrypt(doc.title),
        description: doc.description ? decrypt(doc.description) : undefined,
        goalValue: doc.goalValue,
        goalUnit: doc.goalUnit ? decrypt(doc.goalUnit) : undefined,
        frequency: doc.frequency,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        logs: habitLogs,
      };
    });

    return NextResponse.json({ success: true, data: formattedHabits });
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
    
    const habitData = { ...body, userId };
    if (habitData.title) habitData.title = encrypt(habitData.title);
    if (habitData.description) habitData.description = encrypt(habitData.description);
    if (habitData.goalUnit) habitData.goalUnit = encrypt(habitData.goalUnit);

    const habit = await Habit.create(habitData) as any;
    
    return NextResponse.json({  
      success: true, 
      data: {
        id: habit._id.toString(),
        title: decrypt(habit.title),
        description: habit.description ? decrypt(habit.description) : undefined,
        goalValue: habit.goalValue,
        goalUnit: habit.goalUnit ? decrypt(habit.goalUnit) : undefined,
        frequency: habit.frequency,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
        logs: [],
      } 
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating habit:", error);
    return NextResponse.json({ success: false, error: "Failed to create habit" }, { status: 400 });
  }
}

