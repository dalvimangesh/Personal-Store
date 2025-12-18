import dbConnect from '@/lib/db';
import LinkShare from '@/models/LinkShare';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  await dbConnect();
  const { token } = await params;

  try {
    // Find the document containing the category with this token
    const linkShare = await LinkShare.findOne({ 
      'categories.publicToken': token 
    });

    if (!linkShare) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Extract the specific category
    const category = linkShare.categories.find((c: any) => c.publicToken === token);

    if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (!category.isPublic) {
        return NextResponse.json({ error: 'This link is no longer public' }, { status: 403 });
    }

    return NextResponse.json({ 
        success: true, 
        data: {
            name: decrypt(category.name),
            items: (category.items || []).map((item: any) => ({
                label: decrypt(item.label),
                value: decrypt(item.value)
            })),
            updatedAt: linkShare.updatedAt
        } 
    });

  } catch (error) {
    console.error("Public Link Fetch Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

