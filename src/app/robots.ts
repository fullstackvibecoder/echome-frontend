import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app/', '/auth/', '/onboarding/', '/api/'],
      },
    ],
    sitemap: 'https://www.tryechome.com/sitemap.xml',
  };
}
