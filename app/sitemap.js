export default function sitemap() {
  const base = 'https://filey.ae';
  const now = new Date().toISOString();
  const pages = [
    { path: '/welcome',       priority: 1.0, freq: 'weekly' },
    { path: '/pricing',       priority: 0.9, freq: 'weekly' },
    { path: '/',              priority: 0.8, freq: 'weekly' },
    { path: '/privacy',       priority: 0.5, freq: 'monthly' },
    { path: '/terms',         priority: 0.5, freq: 'monthly' },
  ];
  return pages.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));
}
