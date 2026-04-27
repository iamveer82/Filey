import LegalLayout from '@/components/dashboard/LegalLayout';

export const metadata = {
  title: 'Privacy Policy · Filey',
  description: 'Filey is built privacy-first. Learn exactly what we do and do not collect.',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="April 24, 2026">
      <h2>Our promise</h2>
      <p>
        Filey is designed so your financial data <strong>stays on your device</strong>. We built the
        product because we did not trust existing finance apps with our own money. Our privacy
        practices reflect that belief.
      </p>

      <h2>1. What we collect</h2>
      <p>In normal use (the Free plan, no account), Filey collects:</p>
      <ul>
        <li><strong>Nothing.</strong> All receipts, transactions, invoices, projects and reports are stored in your browser via <code>localStorage</code> / IndexedDB, or on your device file system.</li>
      </ul>
      <p>When you upgrade to Pro or Agency:</p>
      <ul>
        <li><strong>Account basics</strong> (email, password hash, plan tier) — needed to authenticate and bill you.</li>
        <li><strong>Payment metadata</strong> — processed by Stripe. We never see your card number.</li>
        <li><strong>Audit logs</strong> (login timestamps, IP prefix) — retained 90 days for security only.</li>
      </ul>

      <h2>2. What we do NOT collect</h2>
      <ul>
        <li>Your transactions, receipts, invoices, or any financial figures.</li>
        <li>Your AI conversations — those go directly to the LLM provider you chose (bring-your-own-key).</li>
        <li>Behavioural analytics trackers (no Google Analytics, Segment, FB Pixel, etc).</li>
        <li>Any data beyond what is strictly required to run the service you paid for.</li>
      </ul>

      <h2>3. AI providers</h2>
      <p>
        When you use AI chat, your query is sent <em>directly</em> from your browser to the LLM provider
        you configured (OpenAI, Anthropic, Groq, Google, Mistral, Perplexity, Together, OpenRouter, or
        your own Ollama instance). Filey acts only as a thin proxy for CORS reasons on the web — our
        server never persists your prompts or responses.
      </p>

      <h2>4. Optional backup</h2>
      <p>
        If you enable encrypted cloud backup (Pro feature), your ledger is AES-256 encrypted
        <em> before</em> leaving your device, using a passphrase only you know. Filey cannot decrypt your
        backup even in response to a subpoena.
      </p>

      <h2>5. Cookies</h2>
      <p>We use one (1) cookie: your Pro-plan session token. No tracking, no third-party cookies.</p>

      <h2>6. Your rights (UAE PDPL, GDPR, CCPA)</h2>
      <ul>
        <li>Access — request a copy of any data we hold about your account.</li>
        <li>Deletion — request deletion of your account and all associated data, at any time.</li>
        <li>Portability — export your ledger as CSV or JSON from Settings → Data.</li>
        <li>Objection — opt out of any future change you dislike.</li>
      </ul>
      <p>Email <a href="mailto:privacy@filey.ae">privacy@filey.ae</a>. We respond within 30 days.</p>

      <h2>7. Security</h2>
      <ul>
        <li>TLS 1.3 for all API traffic.</li>
        <li>AES-256-GCM for encrypted backups.</li>
        <li>Argon2id for password hashing (Pro accounts).</li>
        <li>Annual third-party penetration tests.</li>
      </ul>

      <h2>8. Changes</h2>
      <p>If we make material changes, we will email Pro/Agency customers and post a notice in-app for 30 days before they take effect. We will never silently reduce your privacy protections.</p>

      <h2>9. Contact</h2>
      <p>
        Filey Technologies FZ-LLC · Dubai, United Arab Emirates ·{' '}
        <a href="mailto:privacy@filey.ae">privacy@filey.ae</a>
      </p>
    </LegalLayout>
  );
}
