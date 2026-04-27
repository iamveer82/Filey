import BlogShell from '@/components/BlogShell';
import { POST_MAP } from '@/lib/blog';

const post = POST_MAP['uae-vat-guide-freelancers-2026'];

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
  twitter: {
    card: 'summary_large_image',
    title: post.title,
    description: post.description,
  },
};

export default function Page() {
  return (
    <BlogShell post={post}>
      <p className="lead">
        If you freelance in the UAE — design, dev, consulting, content, marketing — VAT is the rule everyone tells you about <em>after</em> you've already missed something. Here is the short version, in plain English, accurate as of 2026.
      </p>

      <h2>The 30-second answer</h2>
      <ul>
        <li><strong>Mandatory VAT registration</strong> when your taxable supplies + imports cross <strong>AED 375,000</strong> in a rolling 12-month window.</li>
        <li><strong>Voluntary registration</strong> from <strong>AED 187,500</strong> — useful if your clients are VAT-registered and want input-tax invoices.</li>
        <li><strong>VAT rate</strong> is <strong>5%</strong> on most B2B and B2C services. Some categories are zero-rated or exempt (education, healthcare, certain financial services).</li>
        <li><strong>TRN</strong> (Tax Registration Number) is 15 digits, starts with <code>100</code>, and must appear on every tax invoice.</li>
        <li><strong>Filing</strong> happens through the FTA's EmaraTax portal. Most freelancers are on a <strong>quarterly</strong> cycle.</li>
        <li><strong>Records</strong> must be retained for <strong>5 years</strong> (real-estate-related: 15 years).</li>
      </ul>

      <h2>Do you actually need to register?</h2>
      <p>
        Three checks. If any one is true, register.
      </p>
      <ol>
        <li>Trailing 12 months of <em>taxable</em> revenue ≥ AED 375,000.</li>
        <li>You expect the <em>next</em> 30 days to push you over AED 375,000.</li>
        <li>Your largest clients are VAT-registered businesses asking for tax invoices — voluntary registration is genuinely useful here, even below the mandatory threshold.</li>
      </ol>
      <p>
        If you're under AED 187,500, you usually <em>cannot</em> register voluntarily, and that is fine — you simply do not charge VAT.
      </p>

      <h2>What goes on a UAE-compliant tax invoice</h2>
      <p>
        The FTA's executive regulation lists the mandatory fields. Skip one and the invoice is technically defective:
      </p>
      <ul>
        <li>The words <strong>"Tax Invoice"</strong> in a clearly visible place.</li>
        <li>Supplier name, address, and <strong>TRN</strong>.</li>
        <li>Customer name and address (and customer TRN if they're registered).</li>
        <li>A <strong>sequential invoice number</strong>.</li>
        <li><strong>Issue date</strong>, and the <strong>date of supply</strong> if it differs.</li>
        <li>Line items with description, quantity, unit price.</li>
        <li>The <strong>rate</strong> and <strong>amount</strong> of VAT charged, in AED.</li>
        <li>The <strong>gross amount</strong> in AED.</li>
        <li>The exchange rate used if invoiced in another currency.</li>
      </ul>
      <p className="rounded-xl bg-blue-50 p-4 text-blue-900">
        Filey injects every one of these fields automatically — including a unique sequential number per business — so you stop white-knuckling Word templates the night before a filing.
      </p>

      <h2>Reverse charge mechanism (the bit that confuses everyone)</h2>
      <p>
        If you import services from a non-UAE supplier (say, you pay a US software vendor or a UK contractor), the UAE applies a <strong>reverse charge</strong>: you self-account for the 5% VAT on your return. You report it as both <em>output</em> and <em>input</em> tax on the same return — the net cash effect is zero, but the entry must be there.
      </p>
      <p>
        This is the single most common audit trigger for solo freelancers: forgetting to reverse-charge SaaS subscriptions paid to overseas vendors.
      </p>

      <h2>Filing schedule and deadlines</h2>
      <p>
        After registering, the FTA assigns you a quarterly tax period. Your VAT return (Form VAT201) is due <strong>28 days</strong> after the period ends. So a Jan–Mar period is due 28 April. Pay on EmaraTax via GIBAN — don't wait for the bank holiday.
      </p>
      <p>
        Late filing penalty: <strong>AED 1,000</strong> first time, <strong>AED 2,000</strong> repeated within 24 months. Late payment penalty: <strong>2%</strong> immediately, <strong>4%</strong> after the 7th day, then <strong>1% daily</strong> capped at 300%. The math is brutal — get the date in your calendar twice.
      </p>

      <h2>Bookkeeping that survives an audit</h2>
      <p>
        FTA audits in 2025–2026 have shifted toward sample requests for source documents — receipts, bank statements, customer correspondence. The standard for "good enough" is now:
      </p>
      <ul>
        <li>Every business expense has a <strong>receipt or invoice image</strong>, captured within 30 days.</li>
        <li>Each transaction is reconciled to a bank statement line.</li>
        <li>VAT is split out per transaction so the return is mechanical, not interpretive.</li>
        <li>Records are stored in a system that can be exported to PDF/CSV on request.</li>
      </ul>

      <h2>Tools — what we'd actually recommend</h2>
      <p>
        We're biased (Filey is built exactly for this), so here's the honest comparison:
      </p>
      <ul>
        <li><strong>Spreadsheet + Google Drive</strong>: free, painful to scale, fails on receipt retention.</li>
        <li><strong>Zoho Books / QuickBooks</strong>: capable, expensive, designed for accountants more than for the operator.</li>
        <li><strong>Filey</strong>: privacy-first, on-device receipt OCR, FTA-ready invoices, AI assistant. Free for 5 invoices a month and 50 receipt scans. <a href="/welcome?ref=blog-vat-guide">Start free</a>.</li>
      </ul>

      <h2>Five-minute checklist</h2>
      <ol>
        <li>Calculate your trailing 12-month revenue. If &gt; AED 375,000 — register on EmaraTax.</li>
        <li>Add your TRN to every invoice template you use.</li>
        <li>Set quarterly filing reminders 7 days <em>and</em> 1 day before the deadline.</li>
        <li>Capture receipts within 30 days. Phone camera + cloud backup is the floor; OCR + categorisation is the right answer.</li>
        <li>Reverse-charge any imported services on the return.</li>
      </ol>

      <p className="text-sm text-slate-500">
        This article is general guidance, not personalised tax advice. For nuanced cases (real estate, financial services, e-commerce VAT on platforms), talk to a registered FTA agent.
      </p>
    </BlogShell>
  );
}
