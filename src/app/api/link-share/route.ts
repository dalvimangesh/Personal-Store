import dbConnect from '@/lib/db';
import LinkShare from '@/models/LinkShare';
import DeletedItem from '@/models/DeletedItem';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;

    let linkShare = await LinkShare.findOne({ userId });
    
    if (!linkShare) {
        // Default state for new users
        return NextResponse.json({ 
            success: true, 
            data: { 
                categories: [{ name: "Default", items: [{ label: "", value: "" }] }] 
            } 
        });
    }

    let categories = linkShare.categories || [];
    
    // Migration: If no categories but we have legacy items
    if (categories.length === 0 && linkShare.items && linkShare.items.length > 0) {
        categories = [{
            name: "Default",
            items: linkShare.items
        }];
    } else if (categories.length === 0) {
        // If completely empty, provide default
         categories = [{ name: "Default", items: [{ label: "", value: "" }] }];
    }

    return NextResponse.json({ 
        success: true, 
        data: { 
            categories, 
            updatedAt: linkShare.updatedAt 
        } 
    });
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
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = session.userId;
    
    if (!body.categories) {
         return NextResponse.json({ success: false, error: "Invalid data: categories missing" }, { status: 400 });
    }

    // Detect deleted items
    const currentLinkShare = await LinkShare.findOne({ userId });
    
    if (currentLinkShare) {
        let currentItems: any[] = [];
        
        // Flatten current items from either categories or legacy items
        if (currentLinkShare.categories && currentLinkShare.categories.length > 0) {
            currentItems = currentLinkShare.categories.flatMap((c: any) => c.items);
        } else if (currentLinkShare.items && currentLinkShare.items.length > 0) {
            currentItems = currentLinkShare.items;
        }

        if (currentItems.length > 0) {
             // Flatten new items
            const newItems = body.categories.flatMap((c: any) => c.items);
            
            const newItemsIds = new Set(
                newItems
                .filter((item: any) => item._id)
                .map((item: any) => item._id.toString())
            );

            const deletedItems = currentItems.filter((item: any) => 
                item._id && !newItemsIds.has(item._id.toString())
            );

            if (deletedItems.length > 0) {
                await DeletedItem.insertMany(
                deletedItems.map((item: any) => ({
                    userId,
                    originalId: item._id.toString(),
                    type: 'link',
                    content: { 
                        title: item.label || "No Label", 
                        content: item.value,
                        ...item
                    }
                }))
                );
            }
        }
    }
    
    console.log("Saving categories for user", userId, body.categories.length);

    // Expecting categories array
    const linkShare = await LinkShare.findOneAndUpdate(
        { userId },
        { 
            categories: body.categories,
            items: [] // Clear legacy items after successful update
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      data: {
        categories: linkShare.categories,
        updatedAt: linkShare.updatedAt
      } 
    });
  } catch (error) {
    console.error("Save Error:", error);
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
