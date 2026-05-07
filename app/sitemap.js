import { POSTS } from '@/lib/blog';

export default function sitemap() {
  const base = 'https://filey.ae';
  const now = new Date().toISOString();
  const pages = [
    { path: '/welcome',       priority: 1.0, freq: 'weekly' },
    { path: '/pricing',       priority: 0.9, freq: 'weekly' },
    { path: '/',              priority: 0.8, freq: 'weekly' },
    { path: '/blog',          priority: 0.7, freq: 'weekly' },
    { path: '/about',         priority: 0.6, freq: 'monthly' },
    { path: '/vs-taxhacker',  priority: 0.7, freq: 'monthly' },
    { path: '/self-host',     priority: 0.6, freq: 'monthly' },
    { path: '/changelog',     priority: 0.5, freq: 'weekly' },
    { path: '/security',      priority: 0.5, freq: 'monthly' },
    { path: '/privacy',       priority: 0.5, freq: 'monthly' },
    { path: '/terms',         priority: 0.5, freq: 'monthly' },
  ];

  const blog = POSTS.map((p) => ({
    path: `/blog/${p.slug}`,
    priority: 0.7,
    freq: 'monthly',
    lastModified: new Date(p.updated || p.date).toISOString(),
  }));

  return [...pages, ...blog].map((p) => ({
    url: `${base}${p.path}`,
    lastModified: p.lastModified || now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));
}
