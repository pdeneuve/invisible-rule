import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/voice-test', '/processing', '/share', '/report'],
    },
    sitemap: 'https://invisible-rule.vercel.app/sitemap.xml',
  };
}
