// Blog post registry — keep in sync with `app/blog/[slug]/page.js`.
// Static MDX-style content, no CMS yet — fastest path to indexable pages.

export const POSTS = [
  {
    slug: 'uae-vat-guide-freelancers-2026',
    title: 'UAE VAT for freelancers in 2026 — the no-fluff guide',
    description: 'Everything UAE freelancers and solo SMBs need to know about VAT registration, 5% tax, TRN, and FTA reporting in 2026.',
    date: '2026-04-18',
    updated: '2026-04-22',
    readingMinutes: 9,
    tag: 'Compliance',
    author: 'Filey Team',
    image: '/og.png',
  },
  {
    slug: 'track-receipts-as-uae-freelancer',
    title: 'How UAE freelancers actually track receipts (without losing their mind)',
    description: 'A practical workflow for capturing, categorising and exporting business receipts in the UAE — built around the FTA 5-year retention rule.',
    date: '2026-04-10',
    updated: '2026-04-21',
    readingMinutes: 7,
    tag: 'Workflow',
    author: 'Filey Team',
    image: '/og.png',
  },
];

export const POST_MAP = Object.fromEntries(POSTS.map((p) => [p.slug, p]));
