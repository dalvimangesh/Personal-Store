import dbConnect from '@/lib/db';
import TrackerColumn from '@/models/TrackerColumn';
import TrackerCard from '@/models/TrackerCard';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    const columnQuery: any = { user: userId };
    if (boardId) {
        columnQuery.boardId = boardId;
    }

    const [columns, cards] = await Promise.all([
      TrackerColumn.find(columnQuery).sort({ order: 1 }),
      TrackerCard.find({ user: userId }).sort({ order: 1 }), // Cards are filtered by columnId, so fetching all for user is fine, but better to filter by column IDs found.
    ]);
    
    const formattedColumns = columns.map((col: any) => ({
      id: col._id.toString(),
      title: col.title,
      order: col.order,
      createdAt: col.createdAt,
    }));

    // Optimization: Only return cards for the fetched columns
    const columnIds = new Set(formattedColumns.map((c: any) => c.id));
    const filteredCards = cards.filter((card: any) => columnIds.has(card.columnId.toString()));

    const formattedCards = filteredCards.map((card: any) => ({
      id: card._id.toString(),
      columnId: card.columnId.toString(),
      title: card.title,
      description: card.description,
      link: card.link,
      order: card.order,
      createdAt: card.createdAt,
    }));

    return NextResponse.json({ 
      success: true, 
      data: {
        columns: formattedColumns,
        cards: formattedCards
      } 
    });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, error: "Database Connection Failed" }, { status: 500 });
  }
}
