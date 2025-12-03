import dbConnect from '@/lib/db';
import LinkShare from '@/models/LinkShare';
import DeletedItem from '@/models/DeletedItem';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';
import mongoose from 'mongoose';

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
    let myLinkShare = await LinkShare.findOne({ userId });
    
    // 2. Fetch LinkShares where I am in sharedWith
    const sharedLinkShares = await LinkShare.find({ 
        "categories.sharedWith": userId 
    }).populate('userId', 'username'); // Populate owner info

    let allCategories = [];

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
        const myDecryptedCats = await Promise.all(myCats.map(async (cat: any) => {
            const catObj = cat.toObject ? cat.toObject() : cat;
            
            // Fetch sharedWith user details
            let sharedWithUsers: any[] = [];
            if (catObj.sharedWith && catObj.sharedWith.length > 0) {
                sharedWithUsers = await User.find({ _id: { $in: catObj.sharedWith } }).select('username _id');
            }

            return {
                ...catObj,
                name: decrypt(catObj.name),
                items: (catObj.items || []).map((item: any) => ({
                    ...item,
                    label: decrypt(item.label),
                    value: decrypt(item.value)
                })),
                isOwner: true,
                ownerId: userId,
                sharedWith: sharedWithUsers.map(u => ({ userId: u._id, username: u.username }))
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

        const sharedCats = doc.categories.filter((cat: any) => 
            cat.sharedWith && cat.sharedWith.map((id: any) => id.toString()).includes(userId)
        );

        const decryptedSharedCats = await Promise.all(sharedCats.map(async (cat: any) => {
            const catObj = cat.toObject ? cat.toObject() : cat;
            
             // Fetch sharedWith user details for shared cats too (so I can see who else is there)
            let sharedWithUsers: any[] = [];
            if (catObj.sharedWith && catObj.sharedWith.length > 0) {
                sharedWithUsers = await User.find({ _id: { $in: catObj.sharedWith } }).select('username _id');
            }

            return {
                ...catObj,
                name: decrypt(catObj.name),
                items: (catObj.items || []).map((item: any) => ({
                    ...item,
                    label: decrypt(item.label),
                    value: decrypt(item.value)
                })),
                isOwner: false,
                ownerId: ownerId,
                ownerUsername: ownerUsername,
                sharedWith: sharedWithUsers.map(u => ({ userId: u._id, username: u.username }))
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
        let currentItems: any[] = [];
        
        // Flatten current items from either categories or legacy items
        if (currentLinkShare.categories && currentLinkShare.categories.length > 0) {
            currentItems = currentLinkShare.categories.flatMap((c: any) => c.items);
        } else if (currentLinkShare.items && currentLinkShare.items.length > 0) {
            currentItems = currentLinkShare.items;
        }

        if (currentItems.length > 0) {
             // Flatten new items
            const newItems = ownedCategories.flatMap((c: any) => c.items);
            
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
                        ...item.toObject ? item.toObject() : item
                    }
                }))
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
    
    const encryptedCategories = ownedCategories.map((cat: any) => ({
        ...cat,
        name: encrypt(cat.name),
        items: (cat.items || []).map((item: any) => ({
            ...item,
            label: encrypt(item.label),
            value: encrypt(item.value)
        })),
        // Ensure sharedWith is just IDs for DB
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
    
    const responseCategories = linkShare.categories.map((cat: any) => {
        const catObj = cat.toObject ? cat.toObject() : cat;
        return {
            ...catObj,
            name: decrypt(catObj.name),
            items: (catObj.items || []).map((item: any) => ({
                ...item,
                label: decrypt(item.label),
                value: decrypt(item.value)
            })),
            isOwner: true,
            ownerId: userId,
            // sharedWith might need population again if we want to show names immediately
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
  } catch (error: any) {
    console.error("Save Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Save failed" }, { status: 400 });
  }
}
