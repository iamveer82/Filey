import { useEffect, useState } from "react";
import {
  Package,
  Users,
  Wallet,
  TrendingUp,
  AlertTriangle,
  FileText,
  Target,
  Boxes,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  crm,
  erp,
  hr,
  fin,
  CrmSummary,
  ErpSummary,
  HrSummary,
  FinanceReport,
  Opportunity,
} from "../lib/api";
import { aed, num } from "../lib/format";
import { PageHeader, Badge } from "../components/ui";

const STAGE_ORDER = [
  "qualification",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export default function Dashboard() {
  const [c, setC] = useState<CrmSummary | null>(null);
  const [e, setE] = useState<ErpSummary | null>(null);
  const [h, setH] = useState<HrSummary | null>(null);
  const [f, setF] = useState<FinanceReport | null>(null);
  const [opps, setOpps] = useState<Opportunity[]>([]);

  useEffect(() => {
    crm.summary().then(setC).catch(console.error);
    crm.opportunities().then(setOpps).catch(console.error);
    erp.summary().then(setE).catch(console.error);
    hr.summary().then(setH).catch(console.error);
    fin.report().then(setF).catch(console.error);
  }, []);

  const financialData = [
    { name: "Assets", value: f?.total_assets ?? 0 },
    { name: "Liabilities", value: f?.total_liabilities ?? 0 },
    { name: "Equity", value: f?.total_equity ?? 0 },
    { name: "Revenue", value: f?.total_revenue ?? 0 },
    { name: "Expenses", value: f?.total_expenses ?? 0 },
  ];

  const pipelineData = STAGE_ORDER.map((s) => ({
    name: s[0].toUpperCase() + s.slice(1),
    value: opps
      .filter((o) => o.stage === s)
      .reduce((sum, o) => sum + o.value, 0),
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Operational snapshot — all figures in AED, VAT-inclusive where applicable"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
        <Tile
          icon={<Wallet size={20} />}
          label="Net Profit (YTD)"
          value={aed(f?.net_profit ?? 0)}
          hint={`Cash ${aed(f?.cash_position ?? 0)}`}
          accent
        />
        <Tile
          icon={<Target size={20} />}
          label="Pipeline Value"
          value={aed(c?.pipeline_value ?? 0)}
          hint={`${c?.open_leads ?? 0} open leads`}
        />
        <Tile
          icon={<Package size={20} />}
          label="Inventory Value"
          value={aed(e?.inventory_value ?? 0)}
          hint={`${e?.low_stock ?? 0} low on stock`}
        />
        <Tile
          icon={<Users size={20} />}
          label="Headcount"
          value={num(h?.headcount ?? 0)}
          hint={`${h?.present_today ?? 0} present today`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bento-card lg:col-span-1 bg-gradient-to-br from-primary-500 to-primary-700 text-white border-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2">
              <Boxes size={22} />
            </div>
            <p className="font-bold">Won Revenue</p>
          </div>
          <p className="text-4xl font-extrabold mt-6">
            {aed(c?.won_value ?? 0)}
          </p>
          <p className="text-brand-100 text-sm mt-1">
            Conversion {(c?.conversion_rate ?? 0).toFixed(0)}% · {c?.activities_due ?? 0} activities due
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-brand-100">Total Revenue</p>
              <p className="text-lg font-bold mt-0.5">
                {aed(f?.total_revenue ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-brand-100">Total Assets</p>
              <p className="text-lg font-bold mt-0.5">
                {aed(f?.total_assets ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bento-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-ink">Sales Pipeline by Stage</p>
            <Badge tone="info">Live</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(v) => aed(Number(v))}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #E2E8F0",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="value" fill="#2563EB" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bento-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-ink">Financial Position</p>
            <Badge tone="info">Live</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(v) => aed(Number(v))}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #E2E8F0",
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#2563EB" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bento-card">
          <div className="flex items-center gap-2 text-ink">
            <AlertTriangle size={18} />
            <p className="font-bold">Attention</p>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-brand-600">
            <li>• {e?.low_stock ?? 0} product(s) at/below reorder level</li>
            <li>• {e?.open_orders ?? 0} open order(s) to fulfil</li>
            <li>• {c?.activities_due ?? 0} CRM activity(ies) due</li>
            <li>• {h?.on_leave ?? 0} employee(s) on leave today</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
        <div className="bento-card">
          <div className="flex items-center gap-2 text-emerald-600">
            <TrendingUp size={18} />
            <p className="font-bold">Monthly Payroll</p>
          </div>
          <p className="text-3xl font-extrabold text-ink mt-3">
            {aed(h?.monthly_payroll ?? 0)}
          </p>
          <p className="text-xs text-brand-400 mt-1">
            Active employees · paid in AED
          </p>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-2 text-brand-600">
            <FileText size={18} />
            <p className="font-bold">Unpaid Invoices</p>
          </div>
          <p className="text-3xl font-extrabold text-ink mt-3">
            {aed(e?.unpaid_invoices ?? 0)}
          </p>
          <p className="text-xs text-brand-400 mt-1">Awaiting collection</p>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-2 text-ink">
            <Target size={18} />
            <p className="font-bold">Open Leads</p>
          </div>
          <p className="text-3xl font-extrabold text-ink mt-3">
            {num(c?.open_leads ?? 0)}
          </p>
          <p className="text-xs text-brand-400 mt-1">
            {(c?.conversion_rate ?? 0).toFixed(0)}% conversion rate
          </p>
        </div>
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="bento-card bento-card-hover">
      <div
        className={`rounded-xl p-2.5 w-fit ${
          accent
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-brand-500/10 text-brand-600"
        }`}
      >
        {icon}
      </div>
      <p className="stat-label mt-4">{label}</p>
      <p className="stat-value">{value}</p>
      {hint && <p className="text-xs text-brand-400 mt-1">{hint}</p>}
    </div>
  );
}
