import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LinkShare from '@/models/LinkShare';
import QuickClip from '@/models/QuickClip';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || '';
  const text = searchParams.get('text') || '';
  const urlParam = searchParams.get('url') || '';

  // Attempt to find a URL in the shared data
  let sharedUrl = urlParam;
  if (!sharedUrl) {
    // LinkedIn often puts the URL in the text field
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    if (matches) {
      sharedUrl = matches[0];
    }
  }

  // Determine if this is a link or just text for the clipboard
  const isLink = !!sharedUrl || title.toLowerCase().includes('http') || text.toLowerCase().includes('http');
  const redirectPath = isLink ? '/mobileview/links' : '/mobileview/clipboard';

  try {
    await dbConnect();
    const cookieStore = await cookies();
    const session = await verifySession(cookieStore.get('session')?.value);

    if (!session?.userId) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(redirectPath)}`, request.url));
    }

    const userId = session.userId;

    if (isLink) {
      // Save to LinkStore
      const label = title || 'Shared Link';
      const value = sharedUrl || text;

      const newItem = {
        label: encrypt(label),
        value: encrypt(value)
      };

      let linkShare = await LinkShare.findOne({ userId });
      if (!linkShare) {
        linkShare = new LinkShare({
          userId,
          categories: [{ name: encrypt('Default'), items: [newItem] }]
        });
      } else {
        if (linkShare.categories.length === 0 && linkShare.items && linkShare.items.length > 0) {
          linkShare.categories.push({ name: encrypt('Default'), items: [...linkShare.items, newItem] });
          linkShare.items = [];
        } else {
          const defaultCat = linkShare.categories.find((cat: { name: string }) => {
            try { return decrypt(cat.name) === 'Default'; } catch { return false; }
          });
          if (defaultCat) {
            defaultCat.items.push(newItem);
          } else if (linkShare.categories.length > 0) {
            linkShare.categories[0].items.push(newItem);
          } else {
            linkShare.categories.push({ name: encrypt('Default'), items: [newItem] });
          }
        }
      }
      await linkShare.save();
    } else {
      // Save to QuickClip (Clipboard)
      const content = text || title;
      if (content) {
        let quickClip = await QuickClip.findOne({ userId });
        const newClipboard = {
          name: encrypt(`Shared: ${new Date().toLocaleDateString()}`),
          content: encrypt(content)
        };

        if (!quickClip) {
          quickClip = new QuickClip({
            userId,
            clipboards: [newClipboard]
          });
        } else {
          // Push to the beginning of clipboards
          quickClip.clipboards.unshift(newClipboard);
        }
        await quickClip.save();
      }
    }
  } catch (error) {
    console.error('Share Target Error:', error);
  }

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
