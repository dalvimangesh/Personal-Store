import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Secret from "@/models/Secret";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    // First, find the secret to check expiration
    const secret = await Secret.findById(id);

    if (!secret) {
      return NextResponse.json({ error: "Secret not found or already viewed" }, { status: 404 });
    }

    // Check if expired
    if (secret.expiresAt && new Date() > new Date(secret.expiresAt)) {
      await Secret.findByIdAndDelete(id);
      return NextResponse.json({ error: "Secret expired" }, { status: 410 });
    }

    // Handle Burn After Reading (maxViews = 1)
    if (secret.maxViews === 1) {
        const deletedSecret = await Secret.findByIdAndDelete(id);
        if (!deletedSecret) {
             return NextResponse.json({ error: "Secret not found or already viewed" }, { status: 404 });
        }
        return NextResponse.json({ content: deletedSecret.content, burned: true });
    }

    // Handle Multiple Views
    if (secret.viewCount + 1 >= secret.maxViews) {
        // This is the last view, delete it
        const deletedSecret = await Secret.findByIdAndDelete(id);
         if (!deletedSecret) {
             return NextResponse.json({ error: "Secret not found or already viewed" }, { status: 404 });
        }
        return NextResponse.json({ content: deletedSecret.content, burned: true });
    } else {
        // Increment view count
        secret.viewCount += 1;
        await secret.save();
        return NextResponse.json({ 
            content: secret.content, 
            burned: false, 
            viewsLeft: secret.maxViews - secret.viewCount 
        });
    }

  } catch (error) {
    console.error("Get secret error:", error);
    return NextResponse.json({ error: "Failed to fetch secret" }, { status: 500 });
  }
}

