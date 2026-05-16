import { useEffect, useState, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowRightCircle,
  CheckCircle2,
  Circle,
  Phone,
  Mail,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import {
  crm,
  Lead,
  CrmCustomer,
  Opportunity,
  Activity,
} from "../lib/api";
import { aed, fmtDate } from "../lib/format";
import {
  PageHeader,
  DataTable,
  Badge,
  statusTone,
  Modal,
  Field,
} from "../components/ui";

type Tab = "pipeline" | "leads" | "customers" | "activities";

const STAGES = [
  "qualification",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
type Stage = (typeof STAGES)[number];

type ModalProps = { open: boolean; onClose: () => void; onSaved: () => void };

export default function Crm() {
  const [tab, setTab] = useState<Tab>("pipeline");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [acts, setActs] = useState<Activity[]>([]);
  const [modal, setModal] = useState<Tab | null>(null);

  const load = () => {
    crm.leads().then(setLeads).catch(console.error);
    crm.customers().then(setCustomers).catch(console.error);
    crm.opportunities().then(setOpps).catch(console.error);
    crm.activities().then(setActs).catch(console.error);
  };
  useEffect(load, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "pipeline", label: "Pipeline" },
    { id: "leads", label: "Leads" },
    { id: "customers", label: "Customers" },
    { id: "activities", label: "Activities" },
  ];

  const newLabel: Record<Tab, string> = {
    pipeline: "Opportunity",
    leads: "Lead",
    customers: "Customer",
    activities: "Activity",
  };

  return (
    <div>
      <PageHeader
        title="CRM"
        subtitle="Leads, sales pipeline, customers & activities"
        action={
          <button className="btn-cta" onClick={() => setModal(tab)}>
            <Plus size={16} /> New {newLabel[tab]}
          </button>
        }
      />

      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-200 cursor-pointer ${
              tab === t.id
                ? "bg-brand-500 text-white"
                : "bg-white text-brand-600 hover:bg-brand-50 border border-brand-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pipeline" && <Pipeline opps={opps} onChange={load} />}

      {tab === "leads" && (
        <DataTable<Lead>
          rows={leads}
          empty="No leads yet"
          columns={[
            {
              key: "name",
              label: "Lead",
              render: (l) => (
                <div>
                  <p className="font-semibold">{l.name}</p>
                  <p className="text-xs text-brand-400">{l.company ?? "—"}</p>
                </div>
              ),
            },
            {
              key: "contact",
              label: "Contact",
              render: (l) => (
                <div className="text-xs text-brand-500 space-y-0.5">
                  {l.email && (
                    <p className="flex items-center gap-1">
                      <Mail size={12} /> {l.email}
                    </p>
                  )}
                  {l.phone && (
                    <p className="flex items-center gap-1">
                      <Phone size={12} /> {l.phone}
                    </p>
                  )}
                </div>
              ),
            },
            { key: "src", label: "Source", render: (l) => l.source ?? "—" },
            {
              key: "val",
              label: "Est. Value",
              render: (l) => aed(l.est_value),
            },
            {
              key: "status",
              label: "Status",
              render: (l) => (
                <Badge tone={statusTone(l.status)}>{l.status}</Badge>
              ),
            },
            {
              key: "act",
              label: "",
              render: (l) => (
                <div className="flex items-center gap-1">
                  {l.status !== "converted" && (
                    <button
                      title="Convert to opportunity"
                      className="text-emerald-600 hover:bg-emerald-50 rounded-lg p-1.5 cursor-pointer transition-colors duration-200"
                      onClick={async () => {
                        await crm.convertLead(l.id);
                        load();
                      }}
                    >
                      <ArrowRightCircle size={16} />
                    </button>
                  )}
                  <button
                    aria-label={`Delete ${l.name}`}
                    className="text-danger hover:bg-danger/10 rounded-lg p-1.5 cursor-pointer transition-colors duration-200"
                    onClick={async () => {
                      await crm.deleteLead(l.id);
                      load();
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "customers" && (
        <DataTable<CrmCustomer>
          rows={customers}
          empty="No customers yet"
          columns={[
            {
              key: "name",
              label: "Customer",
              render: (c) => (
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-brand-400">{c.company ?? "—"}</p>
                </div>
              ),
            },
            { key: "email", label: "Email", render: (c) => c.email ?? "—" },
            { key: "phone", label: "Phone", render: (c) => c.phone ?? "—" },
            {
              key: "seg",
              label: "Segment",
              render: (c) =>
                c.segment ? <Badge tone="info">{c.segment}</Badge> : "—",
            },
            {
              key: "since",
              label: "Since",
              render: (c) => fmtDate(c.created_at),
            },
            {
              key: "act",
              label: "",
              render: (c) => (
                <button
                  aria-label={`Delete ${c.name}`}
                  className="text-danger hover:bg-danger/10 rounded-lg p-1.5 cursor-pointer transition-colors duration-200"
                  onClick={async () => {
                    await crm.deleteCustomer(c.id);
                    load();
                  }}
                >
                  <Trash2 size={16} />
                </button>
              ),
            },
          ]}
        />
      )}

      {tab === "activities" && (
        <div className="bento-card p-0 overflow-hidden divide-y divide-brand-50">
          {acts.length === 0 && (
            <p className="p-6 text-sm text-brand-300">No activities</p>
          )}
          {acts.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-brand-50/40 transition-colors duration-200"
            >
              <button
                aria-label="Toggle done"
                className="cursor-pointer text-brand-400 hover:text-emerald-600 transition-colors duration-200"
                onClick={async () => {
                  await crm.toggleActivity(a.id);
                  load();
                }}
              >
                {a.done ? (
                  <CheckCircle2 size={20} className="text-emerald-500" />
                ) : (
                  <Circle size={20} />
                )}
              </button>
              <ActivityIcon kind={a.kind} />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    a.done
                      ? "line-through text-brand-300"
                      : "text-ink"
                  }`}
                >
                  {a.subject}
                </p>
                <p className="text-xs text-brand-400">
                  {a.related_to ?? "General"} · {a.kind}
                </p>
              </div>
              <span className="text-xs text-brand-500 flex items-center gap-1 shrink-0">
                <CalendarDays size={13} /> {fmtDate(a.due_date)}
              </span>
            </div>
          ))}
        </div>
      )}

      <OpportunityModal
        open={modal === "pipeline"}
        onClose={() => setModal(null)}
        onSaved={load}
      />
      <LeadModal
        open={modal === "leads"}
        onClose={() => setModal(null)}
        onSaved={load}
      />
      <CustomerModal
        open={modal === "customers"}
        onClose={() => setModal(null)}
        onSaved={load}
      />
      <ActivityModal
        open={modal === "activities"}
        onClose={() => setModal(null)}
        onSaved={load}
      />
    </div>
  );
}

function ActivityIcon({ kind }: { kind: string }) {
  const map: Record<string, ReactNode> = {
    call: <Phone size={15} />,
    email: <Mail size={15} />,
    meeting: <CalendarDays size={15} />,
    task: <ClipboardList size={15} />,
  };
  return (
    <div className="rounded-lg bg-brand-500/10 text-brand-600 p-1.5">
      {map[kind] ?? <ClipboardList size={15} />}
    </div>
  );
}

const STAGE_META: Record<Stage, { label: string; tone: string }> = {
  qualification: { label: "Qualification", tone: "bg-info" },
  proposal: { label: "Proposal", tone: "bg-accentpurple" },
  negotiation: { label: "Negotiation", tone: "bg-warning" },
  won: { label: "Won", tone: "bg-success" },
  lost: { label: "Lost", tone: "bg-danger" },
};

function Pipeline({
  opps,
  onChange,
}: {
  opps: Opportunity[];
  onChange: () => void;
}) {
  const move = async (o: Opportunity, dir: -1 | 1) => {
    const idx = STAGES.indexOf(o.stage as Stage);
    const next = idx + dir;
    if (next < 0 || next >= STAGES.length) return;
    await crm.setOppStage(o.id, STAGES[next]);
    onChange();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      {STAGES.map((stage) => {
        const items = opps.filter((o) => o.stage === stage);
        const total = items.reduce((s, o) => s + o.value, 0);
        const meta = STAGE_META[stage];
        return (
          <div key={stage} className="flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${meta.tone}`} />
                <p className="text-sm font-bold text-ink">{meta.label}</p>
                <span className="text-xs text-brand-300">
                  ({items.length})
                </span>
              </div>
            </div>
            <p className="text-xs font-semibold text-brand-400 mb-3 px-1">
              {aed(total)}
            </p>
            <div className="space-y-3 flex-1">
              {items.length === 0 && (
                <div className="rounded-xl border border-dashed border-brand-200 p-4 text-center text-xs text-brand-300">
                  Empty
                </div>
              )}
              {items.map((o) => {
                const idx = STAGES.indexOf(o.stage as Stage);
                return (
                  <div
                    key={o.id}
                    className="bento-card p-4 space-y-2.5"
                  >
                    <p className="text-sm font-bold text-ink leading-snug">
                      {o.title}
                    </p>
                    <p className="text-xs text-brand-400">
                      {o.customer_name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-brand-600">
                        {aed(o.value)}
                      </span>
                      <Badge tone="info">{o.probability}%</Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-brand-50">
                      <span className="text-[11px] text-brand-400 truncate">
                        {o.owner ?? "Unassigned"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          aria-label="Move back"
                          disabled={idx === 0}
                          className="text-brand-400 hover:bg-brand-50 rounded-md p-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                          onClick={() => move(o, -1)}
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <button
                          aria-label="Move forward"
                          disabled={idx === STAGES.length - 1}
                          className="text-brand-400 hover:bg-brand-50 rounded-md p-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                          onClick={() => move(o, 1)}
                        >
                          <ChevronRight size={15} />
                        </button>
                        <button
                          aria-label={`Delete ${o.title}`}
                          className="text-danger hover:bg-danger/10 rounded-md p-1 cursor-pointer transition-colors duration-200"
                          onClick={async () => {
                            await crm.deleteOpportunity(o.id);
                            onChange();
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadModal({ open, onClose, onSaved }: ModalProps) {
  const [f, setF] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    source: "Website",
    est_value: 0,
    owner: "",
  });
  return (
    <Modal open={open} onClose={onClose} title="New Lead">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <input
            className="input"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </Field>
        <Field label="Company">
          <input
            className="input"
            value={f.company}
            onChange={(e) => setF({ ...f, company: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <input
            className="input"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <input
            className="input"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
          />
        </Field>
        <Field label="Source">
          <select
            className="input"
            value={f.source}
            onChange={(e) => setF({ ...f, source: e.target.value })}
          >
            {["Website", "Referral", "Trade Show", "Cold Call", "Other"].map(
              (s) => (
                <option key={s}>{s}</option>
              )
            )}
          </select>
        </Field>
        <Field label="Est. Value (AED)">
          <input
            type="number"
            className="input"
            value={f.est_value}
            onChange={(e) => setF({ ...f, est_value: +e.target.value })}
          />
        </Field>
        <Field label="Owner">
          <input
            className="input"
            value={f.owner}
            onChange={(e) => setF({ ...f, owner: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={async () => {
            await crm.createLead({
              name: f.name,
              company: f.company || undefined,
              email: f.email || undefined,
              phone: f.phone || undefined,
              source: f.source,
              est_value: f.est_value,
              owner: f.owner || undefined,
            });
            onSaved();
            onClose();
          }}
        >
          Save Lead
        </button>
      </div>
    </Modal>
  );
}

function CustomerModal({ open, onClose, onSaved }: ModalProps) {
  const [f, setF] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    segment: "Retail",
  });
  return (
    <Modal open={open} onClose={onClose} title="New Customer">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <input
            className="input"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </Field>
        <Field label="Company">
          <input
            className="input"
            value={f.company}
            onChange={(e) => setF({ ...f, company: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <input
            className="input"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <input
            className="input"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
          />
        </Field>
        <Field label="Address">
          <input
            className="input"
            value={f.address}
            onChange={(e) => setF({ ...f, address: e.target.value })}
          />
        </Field>
        <Field label="Segment">
          <select
            className="input"
            value={f.segment}
            onChange={(e) => setF({ ...f, segment: e.target.value })}
          >
            {["Retail", "Wholesale", "Distributor", "Enterprise"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={async () => {
            await crm.createCustomer({
              name: f.name,
              company: f.company || undefined,
              email: f.email || undefined,
              phone: f.phone || undefined,
              address: f.address || undefined,
              segment: f.segment,
            });
            onSaved();
            onClose();
          }}
        >
          Save Customer
        </button>
      </div>
    </Modal>
  );
}

function OpportunityModal({ open, onClose, onSaved }: ModalProps) {
  const [f, setF] = useState({
    title: "",
    customer_name: "",
    stage: "qualification" as Stage,
    value: 0,
    probability: 20,
    owner: "",
    expected_close: "",
  });
  return (
    <Modal open={open} onClose={onClose} title="New Opportunity">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Title">
            <input
              className="input"
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Customer">
          <input
            className="input"
            value={f.customer_name}
            onChange={(e) => setF({ ...f, customer_name: e.target.value })}
          />
        </Field>
        <Field label="Stage">
          <select
            className="input"
            value={f.stage}
            onChange={(e) =>
              setF({ ...f, stage: e.target.value as Stage })
            }
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_META[s].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Value (AED)">
          <input
            type="number"
            className="input"
            value={f.value}
            onChange={(e) => setF({ ...f, value: +e.target.value })}
          />
        </Field>
        <Field label="Probability (%)">
          <input
            type="number"
            className="input"
            value={f.probability}
            onChange={(e) => setF({ ...f, probability: +e.target.value })}
          />
        </Field>
        <Field label="Owner">
          <input
            className="input"
            value={f.owner}
            onChange={(e) => setF({ ...f, owner: e.target.value })}
          />
        </Field>
        <Field label="Expected Close">
          <input
            type="date"
            className="input"
            value={f.expected_close}
            onChange={(e) =>
              setF({ ...f, expected_close: e.target.value })
            }
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={async () => {
            await crm.createOpportunity({
              title: f.title,
              customer_name: f.customer_name,
              stage: f.stage,
              value: f.value,
              probability: f.probability,
              owner: f.owner || undefined,
              expected_close: f.expected_close || undefined,
            });
            onSaved();
            onClose();
          }}
        >
          Save Opportunity
        </button>
      </div>
    </Modal>
  );
}

function ActivityModal({ open, onClose, onSaved }: ModalProps) {
  const [f, setF] = useState({
    kind: "call",
    subject: "",
    related_to: "",
    due_date: "",
  });
  return (
    <Modal open={open} onClose={onClose} title="New Activity">
      <div className="space-y-3">
        <Field label="Type">
          <select
            className="input"
            value={f.kind}
            onChange={(e) => setF({ ...f, kind: e.target.value })}
          >
            {["call", "email", "meeting", "task"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Subject">
          <input
            className="input"
            value={f.subject}
            onChange={(e) => setF({ ...f, subject: e.target.value })}
          />
        </Field>
        <Field label="Related To">
          <input
            className="input"
            value={f.related_to}
            onChange={(e) => setF({ ...f, related_to: e.target.value })}
            placeholder="Customer or deal"
          />
        </Field>
        <Field label="Due Date">
          <input
            type="date"
            className="input"
            value={f.due_date}
            onChange={(e) => setF({ ...f, due_date: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={async () => {
            await crm.createActivity({
              kind: f.kind,
              subject: f.subject,
              related_to: f.related_to || undefined,
              due_date: f.due_date || undefined,
            });
            onSaved();
            onClose();
          }}
        >
          Save Activity
        </button>
      </div>
    </Modal>
  );
}
