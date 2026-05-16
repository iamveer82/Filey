import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Boxes } from "lucide-react";
import { APPS } from "../lib/apps";
import { crm, erp, hr, fin } from "../lib/api";
import { aed, num } from "../lib/format";

export default function Launcher() {
  const [kpi, setKpi] = useState<Record<string, string>>({});

  useEffect(() => {
    crm
      .summary()
      .then((c) =>
        setKpi((k) => ({ ...k, "/crm": `${aed(c.pipeline_value)} pipeline` }))
      )
      .catch(() => {});
    erp
      .summary()
      .then((e) =>
        setKpi((k) => ({
          ...k,
          "/erp": `${num(e.total_products)} products · ${e.open_orders} open`,
        }))
      )
      .catch(() => {});
    hr
      .summary()
      .then((h) =>
        setKpi((k) => ({ ...k, "/hr": `${num(h.headcount)} employees` }))
      )
      .catch(() => {});
    fin
      .report()
      .then((f) =>
        setKpi((k) => ({
          ...k,
          "/dashboard": `${aed(f.net_profit)} net profit`,
          "/finance": `${aed(f.cash_position)} cash`,
        }))
      )
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-full">
      <div className="flex items-center gap-4 mb-8">
        <div className="rounded-2xl bg-ink p-3 text-white shadow-bento">
          <Boxes size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Filey Apps</h1>
          <p className="text-sm text-brand-400">
            Open-source ERP &amp; CRM — pick a module to get started
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {APPS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.to}
              to={a.to}
              className="group bento-card bento-card-hover flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`rounded-2xl p-3 text-white shadow-bento ${a.tile}`}
                >
                  <Icon size={24} />
                </div>
                <ArrowRight
                  size={18}
                  className="text-brand-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-500"
                />
              </div>
              <div>
                <p className="text-lg font-bold text-ink">{a.label}</p>
                <p className="text-sm text-brand-400 mt-0.5">{a.desc}</p>
              </div>
              <div className="mt-auto pt-3 border-t border-brand-50">
                <p className="text-xs font-semibold text-brand-500">
                  {kpi[a.to] ?? "Open module"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
