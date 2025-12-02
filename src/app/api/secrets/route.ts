import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Secret, { ISecret } from "@/models/Secret";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { content, maxViews, expirationInMinutes } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const secretData: Partial<ISecret> = {
      content,
      maxViews: maxViews || 1,
    };

    if (expirationInMinutes) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(expirationInMinutes));
        secretData.expiresAt = expiresAt;
    }

    const secret = await Secret.create(secretData) as ISecret;

    return NextResponse.json({ 
        success: true, 
        id: secret._id,
        message: "Secret link created" 
    });

  } catch (error) {
    console.error("Create secret error:", error);
    return NextResponse.json({ error: "Failed to create secret" }, { status: 500 });
  }
}
