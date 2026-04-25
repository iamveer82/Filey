import BlogShell from '@/components/BlogShell';
import { POST_MAP } from '@/lib/blog';

const post = POST_MAP['track-receipts-as-uae-freelancer'];

export const metadata = {
  title: `${post.title} · Filey Blog`,
  description: post.description,
  alternates: { canonical: `/blog/${post.slug}` },
  openGraph: {
    title: post.title,
    description: post.description,
    type: 'article',
    publishedTime: post.date,
    modifiedTime: post.updated,
  },
};

export default function Page() {
  return (
    <BlogShell post={post}>
      <p className="lead">
        Most UAE freelancers we talk to lose an hour a week digging through WhatsApp screenshots and crumpled Carrefour receipts at quarter-end. There is a better workflow. Here it is.
      </p>

      <h2>The rule you can't ignore</h2>
      <p>
        The FTA requires you to keep <strong>5 years</strong> of records for every taxable transaction. That includes the original receipt — not just the bank line. If you can't produce it during an audit, the input VAT you reclaimed is reversed and a penalty is added.
      </p>
      <p>
        Translation: every coffee with a client, every Adobe subscription, every Careem ride to a meeting — the image of the receipt has to live somewhere retrievable for half a decade.
      </p>

      <h2>The four-step workflow that actually works</h2>

      <h3>1. Capture at the point of sale</h3>
      <p>
        The biggest leak is "I'll do it later." You won't. The minute the receipt prints, snap it. With Filey, that's tap → camera → on-device OCR pulls merchant, total, VAT and date in &lt;3 seconds. No upload, no cloud, no waiting.
      </p>

      <h3>2. Categorise immediately, not at quarter-end</h3>
      <p>
        Standard UAE-relevant categories that map cleanly to FTA returns:
      </p>
      <ul>
        <li><strong>Software & SaaS</strong> (most reverse-charged from overseas vendors)</li>
        <li><strong>Travel & transport</strong> (Careem, fuel, flights)</li>
        <li><strong>Meals & client entertainment</strong> (be cautious — entertainment is partially blocked)</li>
        <li><strong>Office & utilities</strong> (DEWA, Etisalat, internet)</li>
        <li><strong>Professional services</strong> (legal, accounting, agents)</li>
        <li><strong>Marketing & ads</strong></li>
        <li><strong>Bank fees & interest</strong> (zero-rated/exempt — flag separately)</li>
      </ul>

      <h3>3. Reconcile to the bank weekly</h3>
      <p>
        Every Friday, take 10 minutes. Open your bank statement, open your expense list. Anything in the bank that has no matching receipt → either it isn't business, or you're missing a record. Anything in the receipt list that isn't on the bank → it's reimbursable cash and needs an entry.
      </p>
      <p>
        Filey automates the matching with a simple amount + date + merchant fingerprint. The leftover items are the ones that need a human decision.
      </p>

      <h3>4. Export at quarter-end</h3>
      <p>
        Two outputs your accountant or future-you will thank you for:
      </p>
      <ul>
        <li><strong>CSV</strong> with date, merchant, category, amount, VAT, reference. Open in Excel or hand to an accountant.</li>
        <li><strong>PDF backup</strong> with a thumbnail of every receipt, organised by category. Drop in Google Drive, encrypted.</li>
      </ul>

      <h2>What about cash receipts?</h2>
      <p>
        Cash receipts are still valid — you just need the image. Photograph it, write a one-line memo on the back if the merchant scrawl is unreadable, and treat it like every other expense. The FTA does not care whether you paid in cash or card; it cares whether you can prove the transaction happened and was business-related.
      </p>

      <h2>Mixed business / personal cards</h2>
      <p>
        Don't. Get a separate card. The hours you save each quarter on disentangling personal Spotify from business Spotify will pay for the card fee a hundred times over. If you absolutely cannot, tag every personal transaction in your tracking tool the same week it lands.
      </p>

      <h2>Where most freelancers go wrong</h2>
      <ul>
        <li><strong>"I'll just keep the email"</strong> — emails get archived, providers change addresses, and the FTA wants the actual document.</li>
        <li><strong>Photographs without metadata</strong> — a JPEG of a receipt with no merchant or amount entry means hours of re-keying at audit time.</li>
        <li><strong>Storing only in the bank app</strong> — banks rotate transaction history past 12 months on most UAE retail accounts.</li>
        <li><strong>Forgetting reverse-charge</strong> on SaaS — Adobe, Figma, GitHub, Notion: all overseas, all reverse-charged.</li>
      </ul>

      <h2>One-button setup with Filey</h2>
      <p>
        We built Filey because we had this exact problem. Here is what the workflow looks like in our app:
      </p>
      <ol>
        <li>Tap <strong>Scan</strong> → camera opens → photograph the receipt.</li>
        <li>On-device OCR fills merchant, total, VAT, date. You confirm the category.</li>
        <li>Recurring expenses (Etisalat, Adobe) are auto-detected and turned into bills.</li>
        <li>Quarterly export → CSV + per-category PDF, ready for the accountant.</li>
      </ol>
      <p>
        Free plan covers 50 scans a month — enough for most solo freelancers. Pro is AED 29/mo for unlimited scans, premium templates and bank sync. <a href="/welcome?ref=blog-receipts">Try it free</a>.
      </p>

      <p className="text-sm text-slate-500">
        Not financial advice. For complex cases (mixed-use property, e-commerce platforms, partnerships) talk to a registered FTA agent.
      </p>
    </BlogShell>
  );
}
