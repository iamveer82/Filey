# Filey — Montek ERP & CRM Design System

> Extracted from the Montek design-system reference. A modern, poppy and
> clean design system for ERP & CRM platforms. Built for clarity, speed and
> delight. **v1.0.0**

---

## 01 · Colors

A bold and vibrant palette that brings clarity and energy.

### Primary (Blue)

| Token | Hex | Use |
|-------|-----------|-----|
| `primary-600` | `#2563EB` | Primary actions, active nav, links |
| `primary-500` | `#3B82F6` | Default buttons, charts |
| `primary-400` | `#60A5FA` | Hover tints, secondary accents |
| `primary-300` | `#93C5FD` | Subtle highlights |
| `primary-100` | `#DBEAFE` | Soft backgrounds, badge fills |
| `primary-50`  | `#EFF6FF` | App tint surfaces |

### Neutrals (Slate)

| Token | Hex |
|-------|-----------|
| `neutral-900` | `#0F172A` (sidebar / darkest) |
| `neutral-800` | `#1E293B` |
| `neutral-700` | `#334155` |
| `neutral-600` | `#475569` (body text) |
| `neutral-500` | `#64748B` |
| `neutral-400` | `#94A3B8` (muted / captions) |
| `neutral-300` | `#CBD5E1` (borders) |
| `neutral-200` | `#E2E8F0` (dividers) |
| `neutral-100` | `#F1F5F9` (surfaces) |
| `neutral-50`  | `#F8FAFC` (app background) |
| `neutral-0`   | `#FFFFFF` (cards) |

### Semantic

| Name | Hex | Meaning |
|------|-----------|---------|
| Success | `#16C784` | Paid, active, won, positive delta |
| Info | `#0EA5E9` | Informational, qualified |
| Warning | `#F59E0B` | Pending, negotiation, attention |
| Danger | `#EF4444` | Overdue, lost, destructive |
| Purple | `#7C3AED` | Proposal, premium / upgrade |

---

## 02 · Typography

Clean, modern and highly readable — **Inter**.

| Weight | Value |
|--------|-------|
| Regular | 400 |
| Medium | 500 |
| Semi Bold | 600 |
| Bold | 700 |

| Style | Size / Weight |
|-------|---------------|
| H1 Heading | 32px / Bold |
| H2 Heading | 24px / Semi Bold |
| H3 Heading | 20px / Semi Bold |
| Body Large | 16px / Regular |
| Body Medium | 14px / Regular |
| Caption | 12px / Regular |

---

## 03 · Navigation

Simple, **icon-first** sidebar for seamless navigation.

- Dark sidebar (`neutral-900`), white/blue foreground.
- Active item: solid `primary-600` pill, white text.
- Inactive: `neutral-400` icon + label, hover lightens.
- Brand lockup top; user profile + "Upgrade Plan" card bottom.
- Sections: Dashboard, Sales, Purchases, Inventory, Finance, HRM,
  Payroll, Projects, Reports, Settings.

---

## 04 · Components

Reusable components for building consistent UI.

- **Buttons:** Primary (filled blue), Secondary (light), Ghost, Icon.
- **States:** Default, Hover (darken/tint), Disabled (`neutral-200`).
- **Tabs:** segmented control, active = white card on `neutral-100`.
- **Inputs:** rounded, `neutral-300` border, focus ring `primary`,
  search + filter affordances.
- **Chips / Badges (pipeline + status):**
  - New → `primary` (blue)
  - Qualified → `info` (cyan)
  - Proposal → `purple`
  - Negotiation → `warning` (orange)
  - Won → `success` (green)
  - Lost → `danger` (red)
- **Avatars:** circular, stacked groups, "+" overflow.

---

## 05 · Cards

Information cards with clarity and hierarchy.

- White surface, `radius-16`, soft shadow, `neutral-200` border.
- Icon chip + label, large metric (`H1`/`H2`), delta row
  (`↑ 12.5% vs last month` in success/danger) and a mini sparkline.

---

## 06 / 07 · Dashboards

- **ERP:** blue gradient hero (Total Profit + sparkline), KPI stat row,
  donut (Top Expenses), inventory list, cash-flow bars, recent
  transactions list with status badges.
- **CRM:** lead/deal KPIs, funnel pipeline (New→Won), revenue line
  chart, top expenses & deals lists.

---

## 08 · Charts

Beautiful, clean, easy to understand: Line, Bar, Area, Donut,
Progress ring, Funnel. Primary series = `primary-500`, gridlines
`neutral-200`, axis text `neutral-400`, gradient area fills.

---

## 09 · Icons

Consistent, minimal, modern line icons (Lucide).

---

## 10 · Design Principles

1. **Clarity First** — every element should serve a purpose.
2. **Consistency Always** — same patterns, same behavior.
3. **Delight in Details** — small interactions, big impact.
4. **Mobile Responsive** — optimized for all devices.

---

## 11 · Spacing & Radius

8px spacing system and consistent radius.

- **Spacing scale (px):** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- **Border radius (px):** 4, 8, 12, 16, 20, 24

---

## 12 · Tech Stack (Recommended)

Next.js · TypeScript · Tailwind CSS · React Query · Recharts ·
React Hook Form.

> Filey desktop runs Tauri + Vite + React, but adopts the same
> TypeScript / Tailwind / Recharts foundation and these design tokens.

---

## Implementation map (this repo)

| Spec | Where applied |
|------|---------------|
| Color tokens | `tailwind.config.js` (`primary`, `brand`=neutral slate, semantic) |
| Component styles | `src/index.css` (`btn-*`, `bento-card`, `pill`, `input`, tabs) |
| Inter font | `index.html` + `tailwind.config.js` `fontFamily` |
| Dark icon-first nav | `src/components/Layout.tsx` |
| App tiles | `src/lib/apps.ts` |
| Chart palette | `src/pages/Dashboard.tsx`, `src/pages/Crm.tsx` |
| Status / pipeline chips | `src/components/ui.tsx` `Badge`, CRM `STAGE_META` |
