import dbConnect from '@/lib/db';
import LinkShare from '@/models/LinkShare';
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
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;

    // 1. Fetch my own LinkShare
    const myLinkShare = await LinkShare.findOne({ userId });
    
    // 2. Fetch LinkShares where I am in sharedWith
    const sharedLinkShares = await LinkShare.find({ 
        "categories.sharedWith": userId 
    }).populate('userId', 'username'); // Populate owner info

    const allCategories = [];

    // Process my own categories
    if (myLinkShare) {
        let myCats = myLinkShare.categories || [];
        
        // Migration: If no categories but we have legacy items
        if (myCats.length === 0 && myLinkShare.items && myLinkShare.items.length > 0) {
            myCats = [{
                name: "Default",
                items: myLinkShare.items,
                sharedWith: []
            }];
        }

        // Decrypt and format my categories
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const myDecryptedCats = await Promise.all(myCats.map(async (cat: any) => {
            const catObj = cat.toObject ? cat.toObject() : cat;
            
            // Fetch sharedWith user details
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let sharedWithUsers: any[] = [];
            if (catObj.sharedWith && catObj.sharedWith.length > 0) {
                sharedWithUsers = await User.find({ _id: { $in: catObj.sharedWith } }).select('username _id');
            }

            return {
                ...catObj,
                name: decrypt(catObj.name),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                items: (catObj.items || []).map((item: any) => ({
                    ...item,
                    label: decrypt(item.label),
                    value: decrypt(item.value)
                })),
                isOwner: true,
                ownerId: userId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                sharedWith: sharedWithUsers.map((u: any) => ({ userId: u._id, username: u.username }))
            };
        }));
        
        allCategories.push(...myDecryptedCats);
    } else {
        // Default for new user
        allCategories.push({ 
            name: "Default", 
            items: [{ label: "", value: "" }],
            isOwner: true,
            ownerId: userId,
            sharedWith: []
        });
    }

    // Process shared categories
    for (const doc of sharedLinkShares) {
        const docOwner = doc.userId; // Populated user object or ID
        const ownerId = docOwner._id || docOwner;
        const ownerUsername = docOwner.username || "Unknown";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sharedCats = doc.categories.filter((cat: any) => 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cat.sharedWith && cat.sharedWith.map((id: any) => id.toString()).includes(userId)
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const decryptedSharedCats = await Promise.all(sharedCats.map(async (cat: any) => {
            const catObj = cat.toObject ? cat.toObject() : cat;
            
             // Fetch sharedWith user details for shared cats too (so I can see who else is there)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let sharedWithUsers: any[] = [];
            if (catObj.sharedWith && catObj.sharedWith.length > 0) {
                sharedWithUsers = await User.find({ _id: { $in: catObj.sharedWith } }).select('username _id');
            }

            return {
                ...catObj,
                name: decrypt(catObj.name),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                items: (catObj.items || []).map((item: any) => ({
                    ...item,
                    label: decrypt(item.label),
                    value: decrypt(item.value)
                })),
                isOwner: false,
                ownerId: ownerId,
                ownerUsername: ownerUsername,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                sharedWith: sharedWithUsers.map((u: any) => ({ userId: u._id, username: u.username }))
            };
        }));

        allCategories.push(...decryptedSharedCats);
    }

    return NextResponse.json({ 
        success: true, 
        data: { 
            categories: allCategories, 
            updatedAt: myLinkShare?.updatedAt || new Date()
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

    // Filter only owned categories
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownedCategories = body.categories.filter((cat: any) => {
        // If it has no ownerId, assume it's new and owned by me.
        // If it has ownerId, it must match userId.
        // Or use the isOwner flag if trusted (backend check is better).
        // We can check if ownerId is present and !== userId.
        if (cat.ownerId && cat.ownerId !== userId) return false;
        // Also exclude if isOwner is explicitly false
        if (cat.isOwner === false) return false;
        return true;
    });

    // Detect deleted items (only for owned categories)
    const currentLinkShare = await LinkShare.findOne({ userId });
    
    if (currentLinkShare) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let currentItems: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let newItems: any[] = [];
        
        // Flatten current items from either categories or legacy items
        if (currentLinkShare.categories && currentLinkShare.categories.length > 0) {
            // Also track deleted categories?
            // For now, let's just track individual links being deleted
            // If a category is deleted, all its links are deleted.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            currentItems = currentLinkShare.categories.flatMap((c: any) => c.items);
        } else if (currentLinkShare.items && currentLinkShare.items.length > 0) {
            currentItems = currentLinkShare.items;
        }

        // Flatten new items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newItems = ownedCategories.flatMap((c: any) => c.items);
        
        if (currentItems.length > 0) {
            
            const newItemsIds = new Set(
                newItems
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((item: any) => item._id)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((item: any) => item._id.toString())
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const deletedItems = currentItems.filter((item: any) => 
                item._id && !newItemsIds.has(item._id.toString())
            );

            if (deletedItems.length > 0) {
                await DeletedItem.insertMany(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                deletedItems.map((item: any) => {
                     // Need to decrypt before saving to trash, as trash expects plain text or handles its own view
                     // But wait, the items in DB are encrypted.
                     // We should decrypt them so they are readable in trash store.
                     return {
                        userId,
                        originalId: item._id.toString(),
                        type: 'link',
                        content: { 
                            title: item.label ? decrypt(item.label) : "No Label", 
                            content: item.value ? decrypt(item.value) : "",
                            // Store other metadata if needed
                        }
                    };
                })
                );
            }
        }
    }
    
    console.log("Saving categories for user", userId, ownedCategories.length);

    // Encrypt incoming categories
    // Preserve sharedWith if it exists in incoming data (though we generally shouldn't modify it here via bulk update if strict, 
    // but for owned categories, we might want to preserve it).
    // Ideally, sharing is done via specific endpoints.
    // But if we send the array back, we should keep the IDs.
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const encryptedCategories = ownedCategories.map((cat: any) => ({
        ...cat,
        name: encrypt(cat.name),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (cat.items || []).map((item: any) => ({
            ...item,
            label: encrypt(item.label),
            value: encrypt(item.value)
        })),
        // Ensure sharedWith is just IDs for DB
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sharedWith: cat.sharedWith ? cat.sharedWith.map((u: any) => u.userId || u) : []
    }));

    // Expecting categories array
    const linkShare = await LinkShare.findOneAndUpdate(
        { userId },
        { 
            categories: encryptedCategories,
            items: [] // Clear legacy items after successful update
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Re-fetch to get populated/formatted return if needed, or just return what we saved (but decrypted).
    // For simplicity and consistency, let's return the decrypted structure of what we just saved.
    // Note: We are NOT returning the shared categories here. The frontend should probably merge them or re-fetch.
    // Or we can just return success and let frontend re-fetch. 
    // The current frontend uses the response to update state. 
    // If we return only owned categories, the shared ones might disappear from UI until refresh.
    // So we should probably return the full set like GET does, OR just return the owned ones and frontend merges.
    // Let's return owned ones + shared ones (by fetching them).
    
    // Re-use GET logic logic partially? Too complex for one function. 
    // Let's just return the owned ones we saved. Frontend can keep shared ones in state.
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseCategories = linkShare.categories.map((cat: any) => {
        const catObj = cat.toObject ? cat.toObject() : cat;
        return {
            ...catObj,
            name: decrypt(catObj.name),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: (catObj.items || []).map((item: any) => ({
                ...item,
                label: decrypt(item.label),
                value: decrypt(item.value)
            })),
            isOwner: true,
            ownerId: userId,
            // sharedWith might need population again if we want to show names immediately
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             sharedWith: (catObj.sharedWith || []).map((id: any) => ({ userId: id })) // Partial info
        };
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        categories: responseCategories,
        updatedAt: linkShare.updatedAt
      } 
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Save Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Save failed" }, { status: 400 });
  }
}
