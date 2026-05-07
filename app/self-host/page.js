'use client';

import LegalLayout from '@/components/dashboard/LegalLayout';
import Link from 'next/link';

export default function SelfHostPage() {
  return (
    <LegalLayout title="Self-host Filey" updated="2026-04-25">
      <p>
        Filey runs comfortably on a single small VPS, a Raspberry Pi, or your dev machine.
        Because the app is offline-first, the server only does two things: serve the Next.js
        bundle, and relay BYOK AI requests to your chosen provider. <strong>Your transactions,
        receipts, invoices, and API keys never touch the server</strong> — they live in your
        browser's <code>localStorage</code>.
      </p>

      <h2>Quick start (Docker Compose)</h2>
      <pre><code>{`# 1. clone and enter
git clone https://github.com/filey-ae/filey.git
cd filey

# 2. (optional) tweak port / fallback model
cp .env.example .env

# 3. build and run
docker compose up -d --build

# 4. open
open http://localhost:3000`}</code></pre>

      <p>
        Filey runs as a non-root user inside the container, exposes port <code>3000</code>,
        and ships with a <code>HEALTHCHECK</code>. To put it behind TLS, uncomment the
        Caddy block in <code>docker-compose.yml</code> and edit the <code>Caddyfile</code>
        to point at your domain.
      </p>

      <h2>Quick start (bare metal / Node)</h2>
      <pre><code>{`# Node 20+, npm 10+
npm install
npm run build
npm run start  # serves on :3000`}</code></pre>
      <p>
        For a development loop with hot reload use <code>npm run dev</code>. On Windows
        use <code>npm run dev:win</code>.
      </p>

      <h2>Environment variables</h2>
      <p>None are required. The interesting ones:</p>
      <table>
        <thead><tr><th>Variable</th><th>Purpose</th><th>Default</th></tr></thead>
        <tbody>
          <tr><td><code>FILEY_PORT</code></td><td>Host port</td><td><code>3000</code></td></tr>
          <tr><td><code>NEXT_PUBLIC_BASE_URL</code></td><td>Public origin (used in share links)</td><td><code>http://localhost:3000</code></td></tr>
          <tr><td><code>CORS_ORIGINS</code></td><td>Allow-list. Use <code>*</code> for personal, comma-list for multi-tenant</td><td><code>*</code></td></tr>
          <tr><td><code>FILEY_DEFAULT_PROVIDER</code></td><td>Fallback LLM (anthropic/openai/google/openai-compat)</td><td>—</td></tr>
          <tr><td><code>FILEY_DEFAULT_MODEL</code></td><td>Fallback model id</td><td>—</td></tr>
          <tr><td><code>FILEY_DEFAULT_API_KEY</code></td><td>Fallback API key (never logged)</td><td>—</td></tr>
        </tbody>
      </table>

      <h2>What gets sent to the server?</h2>
      <ul>
        <li><strong>Static bundle</strong> — Next.js HTML/JS/CSS, lazy-loaded on demand.</li>
        <li><strong><code>/api/chat</code></strong> — when you use the AI assistant. Filey forwards your prompt + your BYOK key to the provider, streams the response back, and forgets it. Nothing is logged or stored.</li>
        <li><strong><code>/api/extract</code></strong> — same shape, but for receipt vision extraction.</li>
      </ul>
      <p>
        Everything else — transactions, OCR, PDFs, custom fields, categories — runs
        entirely in your browser. You can verify this by opening DevTools → Network
        and watching that no requests are made when you scan, edit, or export.
      </p>

      <h2>Backups</h2>
      <p>
        Because data lives in <code>localStorage</code>, backups are per-browser. To
        snapshot your ledger:
      </p>
      <ol>
        <li>Open Filey → <code>Settings</code> → <strong>Export everything</strong></li>
        <li>Save the <code>.json</code> file somewhere safe</li>
        <li>To restore, open Filey on any device and use <strong>Import</strong> in Settings</li>
      </ol>
      <p>
        For multi-device sync (and proper encrypted cloud backup), upgrade to <Link href="/pricing">Filey Pro</Link>
        — sync uses end-to-end encryption with keys derived from your passphrase.
      </p>

      <h2>Updating</h2>
      <pre><code>{`git pull
docker compose up -d --build`}</code></pre>
      <p>
        Or watch <Link href="/changelog">/changelog</Link> for release notes. Filey
        follows SemVer for the storage schema — minor releases never break your local
        data.
      </p>

      <h2>Hardening checklist (multi-tenant)</h2>
      <ul>
        <li>Set <code>CORS_ORIGINS</code> to your exact domain(s)</li>
        <li>Run behind a TLS proxy (Caddy / Nginx / Cloudflare)</li>
        <li>Disable the AI fallback env vars unless you've metered them per-user</li>
        <li>Mount the container with <code>read_only: true</code> + <code>tmpfs</code> for <code>/tmp</code></li>
        <li>Pin the image digest (<code>filey:self-host@sha256:…</code>) in your compose file</li>
      </ul>

      <h2>FAQ</h2>
      <h3>Can I use my own LLM (Ollama / vLLM / LM Studio)?</h3>
      <p>
        Yes. In Settings → AI Provider, pick <strong>OpenAI-compatible</strong>, paste
        the local endpoint (e.g. <code>http://localhost:11434</code>), and a dummy key.
        Filey relays the request unchanged.
      </p>

      <h3>How is this different from TaxHacker?</h3>
      <p>
        See <Link href="/vs-taxhacker">/vs-taxhacker</Link> for a feature-by-feature
        comparison. Short version: TaxHacker is a great Postgres-backed self-host;
        Filey is browser-native, UAE/FTA-aware, and works without any server-side
        database.
      </p>

      <p className="mt-12 text-sm text-slate-500">
        Issues or questions? <a href="mailto:hello@filey.ae">hello@filey.ae</a> · <a href="https://github.com/filey-ae/filey/issues" target="_blank" rel="noreferrer">GitHub issues</a>
      </p>
    </LegalLayout>
  );
}
