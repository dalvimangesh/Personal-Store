import dbConnect from '@/lib/db';
import TodoStore from '@/models/TodoStore';
import Todo from '@/models/Todo'; // For migration
import DeletedItem from '@/models/DeletedItem';
import User from '@/models/User';
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

    let myTodoStore = await TodoStore.findOne({ userId });

    // Migration logic
    if (!myTodoStore) {
        const oldTodos = await Todo.find({ userId }).sort({ isCompleted: 1, priority: -1, createdAt: -1 });
        if (oldTodos.length > 0) {
            const migratedItems = oldTodos.map(todo => ({
                title: todo.title, // already encrypted in old model
                description: todo.description, // already encrypted in old model
                priority: todo.priority,
                startDate: todo.startDate,
                deadline: todo.deadline,
                isCompleted: todo.isCompleted,
                status: todo.status || (todo.isCompleted ? 'completed' : 'todo'),
                createdAt: todo.createdAt
            }));

            myTodoStore = await TodoStore.create({
                userId,
                categories: [{
                    name: encrypt("Default"),
                    items: migratedItems,
                    sharedWith: []
                }]
            });
            
            // We keep old todos for safety during transition, or we could delete them.
            // For now, let's keep them.
        }
    }

    const sharedTodoStores = await TodoStore.find({
        "categories.sharedWith": userId
    }).populate('userId', 'username');

    const allCategories = [];

    // Process my categories
    if (myTodoStore) {
        const myCats = myTodoStore.categories || [];
        const myDecryptedCats = await Promise.all(myCats.map(async (cat: any) => {
            const catObj = cat.toObject ? cat.toObject() : cat;
            
            let sharedWithUsers: any[] = [];
            if (catObj.sharedWith && catObj.sharedWith.length > 0) {
                sharedWithUsers = await User.find({ _id: { $in: catObj.sharedWith } }).select('username _id');
            }

            return {
                ...catObj,
                name: decrypt(catObj.name),
                isHidden: catObj.isHidden || false,
                items: (catObj.items || []).map((item: any) => ({
                    ...item,
                    title: decrypt(item.title),
                    description: item.description ? decrypt(item.description) : undefined,
                    id: item._id.toString()
                })),
                isOwner: true,
                ownerId: userId,
                sharedWith: sharedWithUsers.map((u: any) => ({ userId: u._id, username: u.username }))
            };
        }));
        allCategories.push(...myDecryptedCats);
    } else {
        // Default empty category for new users without migration data
        allCategories.push({
            name: "Default",
            items: [],
            isOwner: true,
            ownerId: userId,
            sharedWith: []
        });
    }

    // Process shared categories
    for (const doc of sharedTodoStores) {
        const ownerInfo = doc.userId as any;
        for (const cat of doc.categories) {
            if (cat.sharedWith?.map((id: any) => id.toString()).includes(userId)) {
                const catObj = cat.toObject ? cat.toObject() : cat;
                allCategories.push({
                    ...catObj,
                    name: decrypt(catObj.name),
                    isHidden: catObj.isHidden || false,
                    items: (catObj.items || []).map((item: any) => ({
                        ...item,
                        title: decrypt(item.title),
                        description: item.description ? decrypt(item.description) : undefined,
                        id: item._id.toString()
                    })),
                    isOwner: false,
                    ownerId: ownerInfo._id,
                    ownerUsername: ownerInfo.username,
                    sharedWith: [] 
                });
            }
        }
    }

    return NextResponse.json({ success: true, data: { categories: allCategories } });
  } catch (error) {
    console.error("GET TodoStore Error:", error);
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

        if (!body.categories) {
            return NextResponse.json({ success: false, error: "Invalid data: categories missing" }, { status: 400 });
        }

        const currentTodoStore = await TodoStore.findOne({ userId });
        
        // Filter only owned categories for bulk update
        const ownedCategories = body.categories.filter((cat: any) => {
            if (cat.ownerId && cat.ownerId !== userId) return false;
            if (cat.isOwner === false) return false;
            return true;
        });

        // Detect deleted items
        if (currentTodoStore) {
            const currentItems = currentTodoStore.categories.flatMap((c: any) => c.items);
            const newItems = ownedCategories.flatMap((c: any) => c.items || []);
            
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
                    deletedItems.map((item: any) => {
                        const itemObj = item.toObject ? item.toObject() : item;
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { _id, userId: _uid, __v, ...itemContent } = itemObj;
                        
                        return {
                            userId,
                            originalId: item._id.toString(),
                            type: 'todo',
                            content: {
                                ...itemContent,
                                title: decrypt(item.title),
                                description: item.description ? decrypt(item.description) : undefined,
                            }
                        };
                    })
                );
            }
        }

        const encryptedCategories = ownedCategories.map((cat: any) => ({
            ...cat,
            name: encrypt(cat.name),
            isHidden: cat.isHidden || false,
            items: (cat.items || []).map((item: any) => {
                const itemData = {
                    ...item,
                    title: encrypt(item.title),
                    description: item.description ? encrypt(item.description) : undefined,
                };
                
                // Only preserve _id if it's a valid MongoDB ObjectId
                const potentialId = item.id || item._id;
                if (potentialId && /^[0-9a-fA-F]{24}$/.test(potentialId)) {
                    itemData._id = potentialId;
                } else {
                    delete itemData._id;
                    delete itemData.id;
                }
                
                return itemData;
            }),
            sharedWith: cat.sharedWith ? cat.sharedWith.map((u: any) => u.userId || u) : []
        }));

        const todoStore = await TodoStore.findOneAndUpdate(
            { userId },
            { categories: encryptedCategories },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Return decrypted owned categories
        const returnCategories = await Promise.all(todoStore.categories.map(async (cat: any) => {
             const catObj = cat.toObject();
             let sharedWithUsers: any[] = [];
             if (catObj.sharedWith && catObj.sharedWith.length > 0) {
                 sharedWithUsers = await User.find({ _id: { $in: catObj.sharedWith } }).select('username _id');
             }

             return {
                 ...catObj,
                 name: decrypt(catObj.name),
                 isHidden: catObj.isHidden || false,
                 items: (catObj.items || []).map((item: any) => ({
                     ...item,
                     title: decrypt(item.title),
                     description: item.description ? decrypt(item.description) : undefined,
                     id: item._id.toString()
                 })),
                 isOwner: true,
                 ownerId: userId,
                 sharedWith: sharedWithUsers.map((u: any) => ({ userId: u._id, username: u.username }))
             };
        }));

        return NextResponse.json({ success: true, data: { categories: returnCategories } });
    } catch (error) {
        console.error("POST TodoStore Error:", error);
        return NextResponse.json({ success: false, error: "Failed to save todos" }, { status: 400 });
    }
}
