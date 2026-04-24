# Filey — Product Roadmap

**Vision.** A privacy-first finance copilot for UAE small-business owners and freelancers. Users upload or snap receipts, Filey extracts the line items locally, keeps a running ledger, and an AI brain (any LLM the user connects) analyses their real data and gives grounded advice. Data never leaves the device unless the user chooses to relay a question to their own LLM key.

**Tagline.** Scan. Track. Ask. Your numbers stay yours.

**Status legend.** ✅ done · 🟡 in progress · ⬜ planned · 🔜 next up

---

## Core pillars

1. **Capture** — make it effortless to get a receipt into the ledger.
2. **Organise** — auto-categorise, flag VAT, surface patterns.
3. **Converse** — ask anything; the AI answers with *your* numbers in context.
4. **Privacy** — local storage only, BYO-key for any LLM provider.
5. **Free** — no paywall, no account, no analytics. Works offline-first.

---

## Feature inventory

### P0 — foundations (shipping)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Montek-blue design system + responsive shell | ✅ | Sidebar, Topbar, PageTransition, 10 routes linked |
| 2 | Local ledger (tx/bills/projects/threads) via `useLocalList` | ✅ | SSR-safe, cross-tab sync via storage event |
| 3 | Dark mode toggle (next-themes) | ✅ | System-aware + manual |
| 4 | Command palette (⌘K) | ✅ | Navigate + actions (export CSV, add tx/bill, clear cache) |
| 5 | Multi-provider LLM brain (9 providers) | ✅ | Anthropic, OpenAI, Google, Groq, Mistral, OpenRouter, Together, Ollama, custom OpenAI-compat |
| 6 | `/api/chat` edge SSE streaming proxy | ✅ | Keys never stored server-side |
| 7 | Claude-style chat UI w/ markdown + streaming | ✅ | react-markdown + GFM + typography plugin |
| 8 | Chat grounded in user's own data | ✅ | `buildFinanceContext()` injects 30-day snapshot + tx/bills |
| 9 | Local OCR scan → editable draft → ledger | 🟡 | tesseract.js + category inference; editable form shipped |

### P1 — enhance now (this push)

| # | Feature | Status | Acceptance criteria |
|---|---------|--------|---------------------|
| 10 | **AI Insights card** on dashboard | 🔜 | Deterministic client-side insights: burn rate, top 3 categories, VAT net, outlier alerts, upcoming bills. "Ask AI to explain" button sends context to chat. |
| 11 | **"Ask AI" per-transaction** | 🔜 | Context-menu button on each tx row → opens `/chat?q=...` with the tx pre-quoted, AI answers "Is this VAT reclaimable? Categorise. Flag anomaly." |
| 12 | **Privacy banner** | 🔜 | Small lock-icon pill on dashboard + scan + chat: "Stored on this device only". Clicking shows details modal. |
| 13 | **Zero-state onboarding** | 🔜 | First-run dashboard: 3 action cards — (1) Scan a receipt, (2) Connect AI brain, (3) Import CSV. Dismissible. |
| 14 | **Bulk CSV import** | 🔜 | Drop CSV on transactions page → field-mapping UI → append to ledger. |
| 15 | **Improved parser** | ✅ | Handle explicit Total/VAT lines; category inference via regex rules (food/utilities/travel/software/rent/marketing/freelance). |

### P2 — next release

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 16 | Recurring detection | ⬜ | Scan tx history, cluster merchants with monthly/weekly cadence, auto-convert to Bills |
| 17 | Budget envelopes | ⬜ | Monthly cap per category, progress bars, over-budget warnings |
| 18 | Invoice builder | ⬜ | PDF generation (pdf-lib already installed) with company details + TRN; "Record as income" one-click |
| 19 | VAT return worksheet | ⬜ | Quarter picker → auto-compute output/input VAT, download FTA-format PDF |
| 20 | Projects cost-allocation | ⬜ | Tag tx with project, project page shows spent vs budget, margin |
| 21 | Proactive AI alerts | ⬜ | Daily cron (client-side) — compare last 7d vs trailing 28d average, surface anomalies in notif dropdown |
| 22 | Arabic OCR + RTL UI | ⬜ | Tesseract Arabic traineddata; locale-aware number formatting |
| 23 | PWA offline install | ⬜ | next-pwa, background sync queue for OCR jobs |
| 24 | Encrypted export / cloud sync | ⬜ | WebCrypto-encrypted JSON blob, user-chosen destination (Dropbox/Drive/Filey-hosted); zero-knowledge |
| 25 | Multi-device sync via WebRTC | ⬜ | Direct p2p between desktop + mobile, no server relay |

### P3 — polish & trust

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 26 | Empty states everywhere | ⬜ | Every list has skeleton + empty-state + error boundary |
| 27 | Keyboard shortcuts | ⬜ | g-d (dashboard), g-t (tx), g-s (scan), / (search), n (new tx) |
| 28 | Accessibility pass | ⬜ | WCAG AA — focus order, aria-labels on all icon buttons, reduced-motion respected |
| 29 | Performance | ⬜ | Lazy-load recharts + tesseract.js + react-webcam; route-level code split |
| 30 | Error telemetry (opt-in only) | ⬜ | Self-hosted Sentry proxy, default off |
| 31 | OSS licensing + Contributing guide | ⬜ | MIT + CONTRIBUTING.md + issue templates |

---

## Design system

- **Primary** `#2A63E2` (Montek blue) → `#1E4BB0` (darker variant)
- **Brand soft** `#EBF1FF`  **Brand light** `#F5F8FF`
- **Ink** `#0F172A`  **Slate** `#64748B`
- **Accent** amber `#F59E0B` for time-critical CTAs (VAT deadline, urgent approval)
- **Semantic** emerald `#10B981` (success), red `#EF4444` (danger), amber (warn), blue (info)
- **Radii** cards 16/24/32px  buttons 12px  pills full
- **Typography** Plus Jakarta Sans (UI), Fira Code (numbers/data in reports)
- **Motion** 150–300ms, `[0.22, 1, 0.36, 1]` easing, honours `prefers-reduced-motion`
- **Dark mode** `#0B1220` base, `#0F172A` cards, `#1E293B` borders

## Monetisation

**None.** The product stays free. Filey never stores user data and never intermediates LLM keys. Optional paid tier in the future could offer: hosted encrypted backup, Arabic OCR training data, on-device GPU model bundles. Core scan + ledger + BYO-LLM always free.

## Privacy guarantees

1. All transactional data lives in browser localStorage (`filey.web.*` keys).
2. LLM API keys live in localStorage and are forwarded per-request only.
3. `/api/chat` is a stateless edge relay — zero logs, zero persistence.
4. No analytics scripts, no fingerprinting, no third-party SDKs.
5. Export/import backups are plain JSON — user-controlled at all times.
6. Wipe button in Settings erases every `filey.web.*` key + all message stores.
