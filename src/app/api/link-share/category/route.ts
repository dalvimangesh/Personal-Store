import dbConnect from '@/lib/db';
import LinkShare from '@/models/LinkShare';
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

    // Find the owner's LinkShare document
    const linkShare = await LinkShare.findOne({ userId: ownerId });
    
    if (!linkShare) {
        return NextResponse.json({ success: false, error: "Owner not found" }, { status: 404 });
    }

    // Find the specific category
    const categoryIndex = linkShare.categories.findIndex((c: any) => c._id.toString() === categoryId);
    
    if (categoryIndex === -1) {
        return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    }

    const targetCategory = linkShare.categories[categoryIndex];

    // Check permissions
    const isOwner = ownerId === userId;
    const isShared = targetCategory.sharedWith?.map((id: any) => id.toString()).includes(userId);

    if (!isOwner && !isShared) {
        return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    // Update the category
    // If shared user, they can modify items and name. They cannot change sharedWith (unless we allow it).
    // For now, let's restrict sharedWith modification to owner via separate endpoint.
    // So we take items and name from body.
    
    const encryptedName = encrypt(category.name);
    const encryptedItems = (category.items || []).map((item: any) => ({
        ...item,
        label: encrypt(item.label),
        value: encrypt(item.value)
    }));

    // Update fields
    targetCategory.name = encryptedName;
    targetCategory.items = encryptedItems;
    targetCategory.isHidden = category.isHidden || false;
    // Preserve sharedWith from DB to prevent overwrite by shared user
    // (Owner updates to sharedWith should go through share endpoint or be carefully handled here)
    
    linkShare.categories[categoryIndex] = targetCategory;
    
    await linkShare.save();

    return NextResponse.json({ 
        success: true, 
        data: { 
            message: "Category updated"
        } 
    });

  } catch (error) {
    console.error("Update Category Error:", error);
    return NextResponse.json({ success: false, error: error }, { status: 500 });
  }
}

