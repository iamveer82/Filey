'use client';

import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Cell,
} from 'recharts';
import { BRAND, SLATE } from './theme';

const REVENUE = [
  { year: '2019', income: 120 },
  { year: '2020', income: 180 },
  { year: '2021', income: 220 },
  { year: '2022', income: 260 },
  { year: '2023', income: 310, highlight: true },
  { year: '2024', income: 280 },
  { year: '2025', income: 340 },
];

export default function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={REVENUE} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
        <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: SLATE, fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: SLATE, fontSize: 11 }} />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          content={({ active, payload, label }) => !active || !payload?.length ? null : (
            <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg">
              {label} · AED {payload[0].value}k
            </div>
          )}
        />
        <ReferenceLine y={310} stroke={BRAND} strokeDasharray="4 4" strokeOpacity={0.5} />
        <Bar dataKey="income" radius={[8, 8, 8, 8]} barSize={32}>
          {REVENUE.map((r, i) => <Cell key={i} fill={r.highlight ? BRAND : '#E2E8F0'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
