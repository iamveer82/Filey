export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/app/'] },
    ],
    sitemap: 'https://filey.ae/sitemap.xml',
    host: 'https://filey.ae',
  };
}
