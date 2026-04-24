# Filey — Product Roadmap & Functional Specification

> **Privacy-first AI finance copilot for UAE SMBs & freelancers.**
> Scan. Track. Ask. Your numbers stay yours.

---

## 1. Product vision

Filey is the finance assistant a freelancer or small-business owner in the UAE actually uses — because it doesn't charge them, doesn't require an account, and doesn't ship their receipts to anyone's server. They snap a photo of a receipt, Filey reads it on-device, it lands in a ledger they own, and any LLM they choose (Claude, GPT, Gemini, Ollama — their key, their bill) answers questions grounded in that ledger: *"Is this deductible?"*, *"What's my VAT position this quarter?"*, *"Which bill do I pay first?"*.

**The one-line pitch.** *"Filey turns every receipt into answers, without a subscription and without leaking a single dirham."*

**Why it matters in the UAE.** 5% VAT + FTA PEPPOL e-invoicing + freelancer permits make bookkeeping mandatory even for single-person businesses. Existing SaaS (Zoho Books, QuickBooks, Xero) starts at AED 80–250/month and stores every line item on their servers. Freelancers either pay up, use Excel (losing VAT reclaim), or skip it. Filey fills the gap: free, private, AI-powered, offline-first.

---

## 2. Core principles

1. **Privacy is a feature, not a policy.** No account. No analytics. No telemetry. Ledger lives in `localStorage`. LLM keys are forwarded per-request through a stateless edge relay — never stored server-side.
2. **The user owns their brain.** Filey ships *no* bundled AI. The user brings a key from any supported provider (9 today). Rate limits, costs, model choice = their call.
3. **Grounded, not generative.** The AI never invents numbers. Every response is built on a deterministic context block (`buildFinanceContext`) computed from the user's own transactions + bills.
4. **Free forever on the core.** Capture + ledger + chat + VAT reports stay free. Optional paid tier (future) only for convenience extras (encrypted cloud backup, Arabic OCR model bundle, GPU on-device inference) — never gated behind the essentials.
5. **Offline-first.** OCR runs in the browser (tesseract.js). Insights compute locally. Chat is the only network call — and only if the user initiates it.

---

## 3. Target users & journeys

### 3.1 Persona A — "Riya, the freelance designer"

- Has 5–15 client invoices/month, 30–60 expense receipts.
- Revenue AED 15–40k/month. Required to file VAT.
- Pain: loses 10–15% of reclaimable VAT each quarter because receipts go missing.
- Win with Filey: snaps receipts as they arrive, chat tells her her VAT position anytime, quarter-end PDF exports to FTA in one click.

### 3.2 Persona B — "Ahmed, 2-person SMB"

- Café + catering, ~200 tx/month, one employee.
- Pain: has a Zoho subscription but never opens it. Staff submits receipts in WhatsApp.
- Win with Filey: approvals page lets Ahmed clear staff expenses in 30 seconds; AI flags unusual entries.

### 3.3 Persona C — "Omar, privacy-first indie founder"

- Running SaaS from Dubai.
- Pain: doesn't want US-based SaaS holding his invoice data post-DIFC regulation.
- Win with Filey: backup → encrypted JSON he keeps in iCloud / Drive of his choice. Zero server.

### Primary user journey — first 90 seconds

```
Land on / → Privacy banner visible → "Scan a receipt" card
  → /scan → camera/upload → OCR parses → editable draft → Save
  → Back to /  → Insights card updates with live numbers
  → "Ask AI to explain" → /chat → (if no key) prompt Settings
  → /settings → paste Claude/GPT key → Test connection OK
  → /chat pre-filled with the question → streamed answer using user's own ledger
```

Every step takes <15s after the first key-paste. **No signup. No email verification.**

---

## 4. Screen-by-screen functional spec

### 4.1 `/` — Dashboard (home)

| Block | Behaviour |
|-------|-----------|
| **Privacy banner** | Dismissible emerald banner top of page. "Your data stays on this device." Clicking opens modal with 4 trust tenets. Dismissal persists in `filey.web.privacyBannerDismissed`. |
| **Zero-state onboarding** | Shown if `tx.length < 2` AND no LLM key. 3 action cards: (1) Scan a receipt → `/scan`, (2) Connect AI brain → `/settings`, (3) Import CSV → `/transactions?import=1`. Dismissible to `filey.web.onboardingDismissed`. |
| **AI Insights card** | Live computed from `computeInsights(tx, bills, profile)`. 4 tiles: Net 30d, VAT quarter, Next bill, Outliers. Each tile is a `Link` → `/chat?q=` with a ready prompt. Emerald "Private · on-device" pill. |
| **Stats cards** | Balance / VAT reclaimable / Bills due — each links to its deep view. |
| **Spending summary** | Category breakdown bar + legend. |
| **Annual revenue chart** | Recharts BarChart, lazy-loaded with skeleton so TTI <1s. |
| **Recent transactions** | Last 3 rows, "View all" → `/transactions`. |
| **AI promo card** | Gradient card → `/chat`, animated orb, shows provider status. |

### 4.2 `/scan` — Capture

| Feature | Acceptance |
|---------|------------|
| **Sources** | Drag-and-drop, file picker, webcam (react-webcam). |
| **Local OCR** | tesseract.js on-device — progress bar, cancel button. |
| **Parser** | Regex extracts Total + VAT + merchant name. Computes VAT portion of VAT-inclusive totals: `total * 0.05 / 1.05`. |
| **Category inference** | Regex rules over OCR text — Food/Utilities/Travel/Supplies/Software/Rent/Marketing/Freelance. |
| **Editable draft** | Pre-filled form user can correct before saving. Full CATEGORIES dropdown, type toggle, date picker. |
| **Save → ledger** | Writes to `filey.web.tx`, navigates back with success toast and "View transactions" link. |

### 4.3 `/transactions`

| Feature | Acceptance |
|---------|------------|
| **Filters** | Search by name/merchant, type (all/income/expense), category. |
| **Totals** | Income / Expense / Net / VAT logged — reactive to filters. |
| **Per-row "Ask AI"** | Sparkles icon opens `/chat?q=` with the tx quoted — asks for VAT correctness + anomaly review + better category suggestion. |
| **Add transaction** | Drawer with VAT auto-calc preview. |
| **Bulk CSV import** | Drop a CSV, map fields (Date/Name/Amount/Type/Category/VAT), preview, append. |
| **Export CSV** | One-click download with all current filters applied. |
| **Empty state** | When list empty: illustrated card with 2 CTAs — "Scan a receipt" + "Add manually". |

### 4.4 `/bills`

| Feature | Acceptance |
|---------|------------|
| **Cards grid** | Auto-guessed icon (DEWA/Etisalat/Netflix/etc.), due date pill (overdue/today/in Nd). |
| **Reminder toggle** | Per-bill switch. |
| **"Ask AI"** | Header CTA: `/chat?q=Which bills should I pay first given my 30-day cashflow?` |
| **Empty state** | "No bills tracked yet. Add your first recurring expense." |

### 4.5 `/chat`

| Feature | Acceptance |
|---------|------------|
| **Claude-style UX** | max-w-3xl, flat assistant text (no bubble), user right-aligned grey bubble, react-markdown + GFM + prose. |
| **Thread sidebar** | Collapsible. Auto-title from first message. Delete on hover. |
| **Streaming** | SSE via `/api/chat` edge runtime. Stop button via AbortController. |
| **`?q=` prefill** | New thread, composer pre-filled, URL stripped. Used by InsightsCard + per-tx + bills Ask AI. |
| **Grounded context** | `buildFinanceContext()` injected as system prompt — UAE VAT-aware + last 15 tx + upcoming bills. |
| **Multi-provider** | Anthropic, OpenAI, Google, Groq, Mistral, OpenRouter, Together, Ollama, custom OpenAI-compat. |
| **Connect banner** | If no key: amber "Connect LLM" pill → Settings. |

### 4.6 `/reports`

| Feature | Acceptance |
|---------|------------|
| **Range filter** | All / Year / Quarter / Month. |
| **Charts** | Income-vs-Expense bar, Category pie. |
| **UAE VAT snapshot** | Output VAT / Input VAT / Net payable. Deadline reminder with AED 1,000 penalty warning. |
| **PDF export** | Printable report with totals + full tx table. |
| **"Explain this quarter"** | Header CTA → `/chat?q=Explain my Q reports and what to do before filing.` |

### 4.7 `/settings`

| Feature | Acceptance |
|---------|------------|
| **Profile** | Name, email, company, locale. |
| **UAE TRN** | Live-validated (15 digits, starts with 100). |
| **AI Brain** | 9 providers, free-text model ID, API key (password input), base URL (for compat/ollama), Test-connection button doing a real SSE round-trip. |
| **Preferences** | Theme (light/dark/system), notifications, currency, locale. |
| **Data** | Export JSON backup, Import backup, Erase all data (confirmed). |

### 4.8 `/projects`

Tag expenses/income to projects. Budget vs spent progress. Status filter (active/completed/paused/archived).

### 4.9 `/team` (P2 — for SMB persona)

Member invites, monthly spend caps, mentions feed, approvals queue (pending → approve/reject).

---

## 5. Feature ship list

### P0 — shipped ✅

| # | Feature | Notes |
|---|---------|-------|
| 01 | Montek-blue design system + responsive shell | Sidebar, Topbar, Shell wrapper, 10 routes |
| 02 | Local ledger (`useLocalList`) | SSR-safe, cross-tab sync |
| 03 | Dark mode | next-themes, system-aware |
| 04 | Command palette (⌘K) | Navigation + actions |
| 05 | Multi-provider LLM brain (9) | Claude, GPT, Gemini, Groq, Mistral, OpenRouter, Together, Ollama, compat |
| 06 | `/api/chat` edge SSE proxy | Stateless, keys never stored |
| 07 | Claude-style chat UI | Markdown, streaming, threads, stop button |
| 08 | Chat grounded in user data | `buildFinanceContext()` in system prompt |
| 09 | Local OCR → editable draft → ledger | tesseract + regex parser + category inference |
| 10 | Dashboard AI Insights card | 4 tiles computed from real ledger, deep-links to chat |
| 11 | Per-tx "Ask AI" link | Sparkles icon → chat with tx quoted |
| 12 | Privacy banner (dismissible + pill) | 4-tenet modal |
| 13 | `?q=` chat prefill | Spawns new thread, pre-fills composer |
| 14 | Lazy-loaded charts + route skeletons | recharts off critical path, `app/loading.js` |
| 15 | PDF report export | Print-ready HTML with VAT summary |

### P1 — shipping now 🔜

| # | Feature | Acceptance |
|---|---------|------------|
| 16 | **Zero-state onboarding cards** | Dashboard first-run: Scan / Connect AI / Import CSV. Dismissible. |
| 17 | **Bulk CSV import** | Drop CSV on transactions → field-map UI → preview → append to ledger. |
| 18 | **Empty states everywhere** | Transactions/Bills/Projects when list is empty get illustrated CTAs. |
| 19 | **Ask-AI CTAs** | Bills page: "Which to pay first?". Reports page: "Explain this quarter". |
| 20 | **Keyboard shortcuts** | `g-d` dashboard, `g-t` transactions, `g-s` scan, `g-c` chat, `n` new, `/` search. |

### P2 — next release

| # | Feature | Notes |
|---|---------|-------|
| 21 | Recurring detection | Cluster merchants with monthly/weekly cadence → auto-Bills |
| 22 | Budget envelopes | Monthly caps per category + over-budget warnings |
| 23 | Invoice builder | pdf-lib PDF with TRN + line items; one-click "Record as income" |
| 24 | VAT return worksheet | Quarter picker → auto FTA-format PDF |
| 25 | Proactive AI alerts | Daily client-side cron: 7d vs 28d anomaly surface |
| 26 | Arabic OCR + RTL UI | Tesseract Arabic traineddata; locale-aware numbers |
| 27 | PWA install + offline sync queue | next-pwa + background sync for OCR |
| 28 | Encrypted backup / user-chosen cloud | WebCrypto, Drive/Dropbox/Filey-hosted; zero-knowledge |
| 29 | Multi-device sync via WebRTC | p2p desktop ↔ mobile, no relay |
| 30 | Receipt image vault | On-device blob storage, linked to tx |

### P3 — polish & trust

| # | Feature | Notes |
|---|---------|-------|
| 31 | Accessibility pass | WCAG AA, aria-labels, reduced-motion, focus rings |
| 32 | Perf audit | Route-level code split, bundle analyser, <2s TTI on 3G |
| 33 | Error boundary per route | Graceful fallback + Ask AI to diagnose |
| 34 | Opt-in Sentry via self-hosted proxy | Default OFF |
| 35 | MIT license + CONTRIBUTING.md + issue templates | OSS launch |
| 36 | Docs site | `docs.filey.ae` — getting started, privacy whitepaper, API |

---

## 6. Data model (localStorage)

```
filey.web.tx         [{ id, ts, name, merchant, amount, vat, type, category, status }]
filey.web.bills      [{ id, name, amount, dueDate, reminder, iconId, brand }]
filey.web.projects   [{ id, name, client, budget, spent, status, deadline }]
filey.web.threads    [{ id, title, updatedAt }]
filey.web.msgs.<id>  [{ id, role, content, ts, streaming?, error? }]
filey.web.team       [{ id, name, role, email, cap, spent }]
filey.web.approvals  [{ id, who, amount, merchant, status, ts }]
filey.web.profile    { name, email, company, trn }
filey.web.ai         { provider, apiKey, model, baseUrl }
filey.web.prefs      { theme, notifications, currency, locale }
filey.web.privacyBannerDismissed   '1'|null
filey.web.onboardingDismissed      '1'|null
```

## 7. AI behaviour contract

Every chat request sends:

```
system = SYSTEM_DEFAULT
       + "\n\n"
       + buildFinanceContext()   // markdown snapshot of user's ledger
messages = [{ role: 'user'|'assistant', content }, ...]
```

`SYSTEM_DEFAULT` instructs the model:
- You are Filey, a UAE VAT-aware finance copilot.
- Default currency AED. Default VAT 5%.
- Cite the user's own numbers from the snapshot — never invent.
- If a number is missing, say so — don't guess.
- Keep answers short, structured, action-oriented.

## 8. Design system (tokens)

```
Primary   #2A63E2   Montek blue
Dark      #1E4BB0
Soft      #EBF1FF
Light     #F5F8FF
Ink       #0F172A   body text
Slate     #64748B   muted
Accent    #F59E0B   time-critical CTAs (VAT deadline, approval)
Success   #10B981
Danger    #EF4444
Warn      #F59E0B
Info      #3B82F6

Radii     cards 16/24  buttons 12  pills full
Type      Plus Jakarta Sans (UI), Fira Code (numeric)
Motion    150–300ms, [0.22, 1, 0.36, 1]; honours prefers-reduced-motion
Dark      #0B1220 base, #0F172A cards, #1E293B borders
```

## 9. Privacy guarantees (commitments)

1. Ledger + messages live in browser `localStorage` only. No server persistence.
2. LLM keys live in `localStorage` + forwarded per-request through `/api/chat` edge relay. Zero logs, zero persistence on the relay.
3. No analytics scripts. No fingerprinting. No third-party SDKs.
4. Backups are plain JSON the user exports/imports on their own.
5. Settings → "Erase all data" wipes every `filey.web.*` key + all thread messages.
6. Source open (MIT, planned P3) so the guarantees are auditable.

## 10. Monetisation

**Core product is free, forever.**

Potential future paid tier (non-core only):
- Hosted encrypted backup (WebCrypto-sealed blobs, user holds the key)
- Arabic OCR traineddata bundle
- On-device GPU model bundles for offline AI
- Priority support for SMB plans

Never gated: scan, ledger, chat, VAT reports, exports.

---

_Last updated: 2026-04-24_
