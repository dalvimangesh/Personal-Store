import dbConnect from '@/lib/db';
import TodoStore from '@/models/TodoStore';
import DeletedItem from '@/models/DeletedItem';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';

export async function PUT(request: Request) {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { categoryId, ownerId, category } = body;

    if (!categoryId || !ownerId || !category) {
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const userId = session.userId;

    const todoStore = await TodoStore.findOne({ userId: ownerId });
    
    if (!todoStore) {
        return NextResponse.json({ success: false, error: "Owner not found" }, { status: 404 });
    }

    const categoryIndex = todoStore.categories.findIndex((c: any) => c._id.toString() === categoryId);
    
    if (categoryIndex === -1) {
        return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    }

    const targetCategory = todoStore.categories[categoryIndex];

    const isOwner = ownerId === userId;
    const isShared = targetCategory.sharedWith?.map((id: any) => id.toString()).includes(userId);

    if (!isOwner && !isShared) {
        return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    // Detect deleted items within this category
    const currentItems = targetCategory.items || [];
    const newItems = category.items || [];
    const newItemIds = new Set(
        newItems
            .map((item: any) => (item.id || item._id)?.toString())
            .filter(Boolean)
    );

    const deletedItems = currentItems.filter((item: any) => 
        item._id && !newItemIds.has(item._id.toString())
    );

    if (deletedItems.length > 0) {
        await DeletedItem.insertMany(
            deletedItems.map((item: any) => ({
                userId: session.userId, // The person who did the deletion
                originalId: item._id.toString(),
                type: 'todo',
                content: {
                    ...item.toObject ? item.toObject() : item,
                    title: decrypt(item.title),
                    description: item.description ? decrypt(item.description) : undefined,
                    userId: ownerId // original owner for compatibility
                }
            }))
        );
    }
    
    const encryptedName = encrypt(category.name);
    const encryptedItems = (category.items || []).map((item: any) => {
        const itemData = {
            ...item,
            title: encrypt(item.title),
            description: item.description ? encrypt(item.description) : undefined,
        };
        
        const potentialId = item.id || item._id;
        if (potentialId && /^[0-9a-fA-F]{24}$/.test(potentialId)) {
            itemData._id = potentialId;
        } else {
            delete itemData._id;
            delete itemData.id;
        }
        
        return itemData;
    });

    targetCategory.name = encryptedName;
    targetCategory.items = encryptedItems;
    targetCategory.isHidden = category.isHidden;
    
    todoStore.categories[categoryIndex] = targetCategory;
    
    await todoStore.save();

    return NextResponse.json({ 
        success: true, 
        data: { 
            message: "Category updated"
        } 
    });

  } catch (error) {
    console.error("Update Todo Category Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update category" }, { status: 500 });
  }
}

