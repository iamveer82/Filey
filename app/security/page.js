import LegalLayout from '@/components/dashboard/LegalLayout';

export const metadata = {
  title: 'Security · Filey',
  description: 'How Filey protects your financial data — on-device-first architecture, encrypted sync, BYOK AI, no plaintext logging.',
  alternates: { canonical: '/security' },
};

export default function SecurityPage() {
  return (
    <LegalLayout title="Security at Filey" updated="April 24, 2026">
      <p>
        Filey is built around one rule: <strong>your finances stay yours</strong>. Every architectural decision starts with that, then we add features. This page is a candid description of how the system actually works in 2026.
      </p>

      <h2>Architecture in one paragraph</h2>
      <p>
        Filey is offline-first. Receipt OCR, recurring detection, invoice generation, and every piece of UI render in your browser or on your device. Data sits in <code>localStorage</code> or local SQLite (mobile). Sync is opt-in: when you enable it, we use end-to-end encrypted blobs sealed with a key derived from your account password — Filey servers never see plaintext.
      </p>

      <h2>What lives where</h2>
      <ul>
        <li><strong>On your device:</strong> transactions, receipts, invoices, projects, AI chat history, settings.</li>
        <li><strong>Edge function:</strong> AI prompt relay (we forward your message to your chosen LLM provider with your BYOK key — we don't log the body).</li>
        <li><strong>Filey cloud (only when you opt in to sync):</strong> encrypted ciphertext blobs + an opaque key index.</li>
      </ul>

      <h2>Your data, your keys</h2>
      <p>
        Filey is BYOK (Bring Your Own Key) for AI. You add a key from Anthropic, OpenAI, Google, Groq, Mistral, OpenRouter, Together, or run Ollama locally. The key is stored in your browser's <code>localStorage</code>. It is sent only when you ask Filey to make a call to that provider, through our edge relay (so we don't have to embed your key in client JS for CORS reasons).
      </p>
      <p>
        We do not store the key, the prompts, or the model responses on Filey servers. The relay is a stateless edge function.
      </p>

      <h2>Encryption</h2>
      <ul>
        <li><strong>In transit:</strong> TLS 1.3 everywhere. HSTS preloaded.</li>
        <li><strong>At rest (sync):</strong> AES-256-GCM with a key derived from your password via Argon2id. Even Filey staff cannot decrypt your synced blobs without your password.</li>
        <li><strong>On device:</strong> we rely on your OS-level encryption (FileVault, BitLocker, iOS data protection). For mobile, sensitive secrets like API keys are kept in the platform Keychain / Keystore.</li>
      </ul>

      <h2>What we log</h2>
      <p>
        Minimal, anonymised metrics: page views, error stack traces (PII-stripped), feature usage counters. No transaction text, no client names, no receipt content. Logs auto-expire after 14 days.
      </p>

      <h2>Compliance</h2>
      <ul>
        <li><strong>UAE PDPL (Personal Data Protection Law)</strong>: data subject rights honoured; UAE-resident processing for EU/UK customers available on Pro+.</li>
        <li><strong>FTA record retention</strong>: tools to export 5 years of transaction data on demand.</li>
        <li><strong>SOC 2 Type II</strong>: in progress, target Q4 2026.</li>
      </ul>

      <h2>Reporting a vulnerability</h2>
      <p>
        We run a coordinated disclosure programme. Email <a href="mailto:security@filey.ae">security@filey.ae</a> with a description and reproduction. We acknowledge within 48 hours and aim to triage within 5 business days. Bounties are paid in AED for valid in-scope reports.
      </p>

      <h2>Things we deliberately do not do</h2>
      <ul>
        <li>We do not sell or share your data with advertisers, brokers or analytics resellers.</li>
        <li>We do not train AI on your prompts or your data.</li>
        <li>We do not require an account to use the core dashboard — you can keep everything local forever.</li>
      </ul>

      <p className="text-sm text-slate-500">
        Questions? <a href="mailto:hello@filey.ae">hello@filey.ae</a>.
      </p>
    </LegalLayout>
  );
}
