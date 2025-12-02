import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/secret/'],
    },
    sitemap: 'https://personal-store-alpha.vercel.app/sitemap.xml',
  };
}

