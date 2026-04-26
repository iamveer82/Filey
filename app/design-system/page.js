'use client';

import { useState } from 'react';
import {
  Wallet, ShieldCheck, Bell, Receipt, ScanLine, Plus, Sparkles, Check,
  Zap, Tag, Camera, Wand2,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { Button, Chip, BannerAlert, EmptyState, Spinner, Skeleton } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatCard, PageHeader, SectionHead, FormField, KeyValueGrid } from '@/components/patterns';
import { COLOR, RADIUS, SHADOW, TYPE_SCALE } from '@/lib/design/tokens';

export default function DesignSystemPage() {
  return (
    <Shell title="Design System" subtitle="Living catalog of Filey's tokens, primitives, and patterns.">
      <div className="space-y-12">
        <Tokens />
        <Primitives />
        <Patterns />
        <Motion />
      </div>
    </Shell>
  );
}

// ─── Section: Tokens ────────────────────────────────────────────────────────
function Tokens() {
  const surface = ['bg', 'bg-elevated', 'bg-muted', 'bg-subtle'];
  const text    = ['fg', 'fg-muted', 'fg-subtle', 'fg-disabled'];
  const brand   = ['brand', 'brand-soft', 'brand-strong', 'brand-fg'];
  const status  = [
    'success', 'success-soft',
    'warning', 'warning-soft',
    'danger',  'danger-soft',
    'info',    'info-soft',
  ];
  return (
    <Section title="Tokens" hint="Single source of truth for color, radii, shadow, typography. Defined in app/globals.css; mirrored in lib/design/tokens.js.">
      <Subsection title="Surface">
        <Swatches names={surface} />
      </Subsection>
      <Subsection title="Text">
        <Swatches names={text} preview />
      </Subsection>
      <Subsection title="Brand">
        <Swatches names={brand} />
      </Subsection>
      <Subsection title="Status">
        <Swatches names={status} />
      </Subsection>
      <Subsection title="Radii">
        <div className="flex flex-wrap gap-4">
          {Object.entries(RADIUS).map(([k, v]) => (
            <div key={k} className="flex flex-col items-center gap-1">
              <div className="h-16 w-16 border border-border bg-bg-muted" style={{ borderRadius: v }} />
              <span className="text-2xs text-fg-subtle">{k} · {v}</span>
            </div>
          ))}
        </div>
      </Subsection>
      <Subsection title="Shadow">
        <div className="flex flex-wrap gap-6">
          {Object.entries(SHADOW).map(([k, v]) => (
            <div key={k} className="flex flex-col items-center gap-2">
              <div className="h-16 w-24 rounded-lg bg-bg-elevated" style={{ boxShadow: v }} />
              <span className="text-2xs text-fg-subtle">shadow-{k}</span>
            </div>
          ))}
        </div>
      </Subsection>
      <Subsection title="Type scale">
        <div className="space-y-1">
          {Object.entries(TYPE_SCALE).map(([k, px]) => (
            <div key={k} className="flex items-baseline gap-4">
              <span className="w-20 text-2xs text-fg-subtle">{k} · {px}px</span>
              <span className="font-semibold text-fg" style={{ fontSize: px }}>The quick brown fox</span>
            </div>
          ))}
        </div>
      </Subsection>
    </Section>
  );
}

function Swatches({ names, preview }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {names.map((n) => (
        <div key={n} className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated p-3">
          <div
            className={`h-10 w-10 rounded-lg border border-border ${preview ? 'bg-bg-elevated' : ''}`}
            style={preview
              ? { color: `hsl(var(--${n}))`, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }
              : { background: `hsl(var(--${n}))` }
            }
          >{preview ? 'Aa' : null}</div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-fg">{n}</div>
            <div className="truncate font-mono text-2xs text-fg-subtle">--{n}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section: Primitives ────────────────────────────────────────────────────
function Primitives() {
  return (
    <Section title="Primitives" hint="components/ui — drop-in atoms.">
      <Subsection title="Button">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="brand">Brand</Button>
          <Button variant="brand-soft">Brand soft</Button>
          <Button variant="gradient">Gradient</Button>
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="success">Success</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="danger-soft">Danger soft</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="brand">Small</Button>
          <Button size="md" variant="brand">Medium</Button>
          <Button size="lg" variant="brand">Large</Button>
          <Button size="xl" variant="brand">Extra large</Button>
          <Button size="icon" variant="brand"><Plus /></Button>
          <Button size="icon-lg" variant="brand-soft"><Sparkles /></Button>
        </div>
      </Subsection>

      <Subsection title="Chip">
        <div className="flex flex-wrap gap-2">
          <Chip>Neutral</Chip>
          <Chip tone="brand">Brand</Chip>
          <Chip tone="success" leadingIcon={Check}>Synced</Chip>
          <Chip tone="warning">Warning</Chip>
          <Chip tone="danger">Danger</Chip>
          <Chip tone="info">Info</Chip>
          <Chip tone="outline">Outline</Chip>
          <Chip tone="brand" onRemove={() => {}}>Removable</Chip>
          <Chip tone="brand" size="sm">Small</Chip>
          <Chip tone="brand" size="lg">Large</Chip>
        </div>
      </Subsection>

      <Subsection title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Subsection>

      <Subsection title="BannerAlert">
        <div className="space-y-2">
          <BannerAlert tone="info"    title="Heads up"     description="Filey relays your BYOK key per request — never stored." />
          <BannerAlert tone="success" title="Saved"         description="All changes are live." />
          <BannerAlert tone="warning" title="Unset API key" description="Add a key in Settings → AI Provider." action={<Button size="sm" variant="warning">Open Settings</Button>} />
          <BannerAlert tone="danger"  title="Sync failed"   description="Couldn't reach Supabase. Retry?" dismissible />
        </div>
      </Subsection>

      <Subsection title="EmptyState">
        <EmptyState
          icon={Receipt}
          title="No transactions yet"
          description="Scan a receipt or import a CSV to get started."
          action={<Button variant="brand">Scan receipt</Button>}
          secondary={<Button variant="ghost">Import CSV</Button>}
        />
      </Subsection>

      <Subsection title="Spinner">
        <div className="flex items-center gap-4">
          <Spinner size="sm" tone="brand" />
          <Spinner size="md" tone="brand" />
          <Spinner size="lg" tone="brand" />
          <Spinner size="xl" tone="brand" />
          <Spinner size="md" tone="subtle" />
        </div>
      </Subsection>

      <Subsection title="Skeleton">
        <div className="max-w-md space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Subsection>

      <Subsection title="Card">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>Subdued description text under the title.</CardDescription>
          </CardHeader>
          <CardContent>
            Body content. Tokens automatically pick up dark mode via CSS variables — no per-component override needed.
          </CardContent>
        </Card>
      </Subsection>

      <Subsection title="Form atoms">
        <div className="grid gap-3 max-w-md">
          <div>
            <Label htmlFor="ds-input">Single-line</Label>
            <Input id="ds-input" placeholder="Type something…" />
          </div>
          <div>
            <Label htmlFor="ds-textarea">Multi-line</Label>
            <Textarea id="ds-textarea" placeholder="Longer prose…" />
          </div>
        </div>
      </Subsection>
    </Section>
  );
}

// ─── Section: Patterns ──────────────────────────────────────────────────────
function Patterns() {
  return (
    <Section title="Patterns" hint="components/patterns — composites built from primitives.">
      <Subsection title="StatCard">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={Wallet}      label="Total Balance"   value="AED 365,500" delta="+12%" trend="up"   sub="+AED 42,300 this month" href="/transactions" tone="brand"   index={0} />
          <StatCard icon={ShieldCheck} label="VAT Reclaimable" value="AED 2,340"   delta="+8%"  trend="up"   sub="Filed Q1 PEPPOL"        href="/reports"      tone="success" index={1} />
          <StatCard icon={Bell}        label="Bills Due"       value="4"           delta="-3"   trend="down" sub="−3 from last week"      href="/bills"        tone="warning" index={2} />
        </div>
      </Subsection>

      <Subsection title="PageHeader">
        <div className="rounded-2xl border border-border bg-bg-elevated p-6">
          <PageHeader
            eyebrow="Reports"
            title="Q1 2026 VAT summary"
            subtitle="Filed via FTA PEPPOL on 28 April. Net payable AED 2,510."
            breadcrumb={[{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'Q1 2026' }]}
            actions={<><Button variant="ghost">Download PDF</Button><Button variant="brand">Re-file</Button></>}
          />
        </div>
      </Subsection>

      <Subsection title="SectionHead">
        <div className="rounded-2xl border border-border bg-bg-elevated p-6">
          <SectionHead
            icon={Receipt}
            title="Recent transactions"
            hint="Last 7 days · 24 entries"
            actions={<Button size="sm" variant="ghost">View all</Button>}
          />
        </div>
      </Subsection>

      <Subsection title="FormField">
        <div className="grid gap-4 max-w-md">
          <FormField label="Tax Registration Number" hint="15-digit UAE TRN starting with 100">
            <Input placeholder="100123456789003" />
          </FormField>
          <FormField label="Email" required error="Enter a valid email address">
            <Input placeholder="you@filey.ae" />
          </FormField>
        </div>
      </Subsection>

      <Subsection title="KeyValueGrid">
        <div className="rounded-2xl border border-border bg-bg-elevated p-6 max-w-md">
          <KeyValueGrid
            items={[
              { label: 'Net',          value: 'AED 1,450.00', mono: true },
              { label: 'VAT (5%)',     value: 'AED 72.50',    mono: true, tone: 'muted' },
              { label: 'Total due',    value: 'AED 1,522.50', mono: true, tone: 'brand' },
              { label: 'AED equivalent', value: '— same —',   mono: true, tone: 'muted' },
            ]}
          />
        </div>
      </Subsection>
    </Section>
  );
}

// ─── Section: Motion ────────────────────────────────────────────────────────
function Motion() {
  const [bump, setBump] = useState(0);
  return (
    <Section title="Motion" hint="lib/design/motion.js — durations + easing curves shared by CSS and framer-motion.">
      <Subsection title="Durations / easings">
        <KeyValueGrid
          dense
          items={[
            { label: 'duration-fast',    value: '150ms', mono: true },
            { label: 'duration-base',    value: '250ms', mono: true },
            { label: 'duration-slow',    value: '400ms', mono: true },
            { label: 'ease-out',         value: 'cubic-bezier(0.22, 1, 0.36, 1)',   mono: true },
            { label: 'ease-spring',      value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', mono: true },
          ]}
        />
      </Subsection>
      <Subsection title="Press scale">
        <Button onClick={() => setBump((n) => n + 1)} variant="brand" className="press-scale">Press me ({bump})</Button>
      </Subsection>
    </Section>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────
function Section({ title, hint, children }) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-fg">{title}</h2>
        {hint && <p className="mt-1 text-sm text-fg-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Subsection({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elevated p-5">
      <h3 className="mb-4 text-sm font-semibold text-fg">{title}</h3>
      {children}
    </div>
  );
}
