import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  fin,
  Account,
  Expense,
  Txn,
  FinanceReport,
} from "../lib/api";
import { aed, fmtDate } from "../lib/format";
import {
  PageHeader,
  DataTable,
  Badge,
  Modal,
  Field,
  StatCard,
} from "../components/ui";

type Tab = "report" | "accounts" | "expenses" | "transactions";

export default function Finance() {
  const [tab, setTab] = useState<Tab>("report");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [modal, setModal] = useState<Tab | null>(null);

  const load = () => {
    fin.accounts().then(setAccounts).catch(console.error);
    fin.expenses().then(setExpenses).catch(console.error);
    fin.transactions().then(setTxns).catch(console.error);
    fin.report().then(setReport).catch(console.error);
  };
  useEffect(load, []);

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Chart of accounts, expenses & reports — AED, UAE VAT aware"
        action={
          tab !== "report" &&
          tab !== "transactions" && (
            <button className="btn-cta" onClick={() => setModal(tab)}>
              <Plus size={16} /> New {tab.slice(0, -1)}
            </button>
          )
        }
      />

      <div className="flex gap-2 mb-5">
        {(["report", "accounts", "expenses", "transactions"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-colors duration-200 cursor-pointer ${
              tab === t
                ? "bg-brand-500 text-white"
                : "bg-white text-brand-600 hover:bg-brand-50 border border-brand-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "report" && report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label="Total Assets" value={aed(report.total_assets)} />
          <StatCard label="Total Liabilities" value={aed(report.total_liabilities)} />
          <StatCard label="Total Equity" value={aed(report.total_equity)} />
          <StatCard label="Cash Position" value={aed(report.cash_position)} accent="emerald" />
          <StatCard label="Revenue" value={aed(report.total_revenue)} />
          <StatCard label="Expenses" value={aed(report.total_expenses)} />
          <div className="bento-card md:col-span-2 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-50">
              Net Profit
            </p>
            <p className="text-3xl font-extrabold mt-2">{aed(report.net_profit)}</p>
            <p className="text-emerald-50 text-xs mt-1">Revenue − Expenses</p>
          </div>
        </div>
      )}

      {tab === "accounts" && (
        <DataTable<Account>
          rows={accounts}
          columns={[
            { key: "code", label: "Code", render: (a) => <span className="font-mono text-xs">{a.code}</span> },
            { key: "name", label: "Account", render: (a) => <span className="font-semibold">{a.name}</span> },
            { key: "type", label: "Type", render: (a) => <Badge tone="info">{a.account_type}</Badge> },
            { key: "bal", label: "Balance", render: (a) => <span className="font-semibold">{aed(a.balance)}</span> },
          ]}
        />
      )}

      {tab === "expenses" && (
        <DataTable<Expense>
          rows={expenses}
          columns={[
            { key: "cat", label: "Category", render: (e) => <span className="font-semibold">{e.category}</span> },
            { key: "desc", label: "Description", render: (e) => e.description ?? "—" },
            { key: "amt", label: "Amount", render: (e) => aed(e.amount) },
            { key: "date", label: "Date", render: (e) => fmtDate(e.expense_date) },
            {
              key: "act",
              label: "",
              render: (e) => (
                <button
                  aria-label="Delete expense"
                  className="text-danger hover:bg-danger/10 rounded-lg p-1.5 cursor-pointer transition-colors duration-200"
                  onClick={async () => {
                    await fin.deleteExpense(e.id);
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

      {tab === "transactions" && (
        <DataTable<Txn>
          rows={txns}
          columns={[
            { key: "acc", label: "Account", render: (t) => <span className="font-semibold">{t.account_name}</span> },
            {
              key: "type",
              label: "Type",
              render: (t) => (
                <Badge tone={t.txn_type === "credit" ? "success" : "danger"}>
                  {t.txn_type}
                </Badge>
              ),
            },
            { key: "amt", label: "Amount", render: (t) => aed(t.amount) },
            { key: "desc", label: "Description", render: (t) => t.description ?? "—" },
            { key: "date", label: "Date", render: (t) => fmtDate(t.txn_date) },
          ]}
        />
      )}

      <AccountModal open={modal === "accounts"} onClose={() => setModal(null)} onSaved={load} />
      <ExpenseModal open={modal === "expenses"} onClose={() => setModal(null)} onSaved={load} accounts={accounts} />
    </div>
  );
}

function AccountModal({ open, onClose, onSaved }: ModalProps) {
  const [f, setF] = useState({
    code: "",
    name: "",
    account_type: "asset",
    balance: 0,
  });
  return (
    <Modal open={open} onClose={onClose} title="New Account">
      <div className="space-y-3">
        <Field label="Code">
          <input className="input" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="1200" />
        </Field>
        <Field label="Account Name">
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Type">
          <select className="input" value={f.account_type} onChange={(e) => setF({ ...f, account_type: e.target.value })}>
            <option value="asset">Asset</option>
            <option value="liability">Liability</option>
            <option value="equity">Equity</option>
            <option value="revenue">Revenue</option>
            <option value="expense">Expense</option>
          </select>
        </Field>
        <Field label="Opening Balance (AED)">
          <input type="number" className="input" value={f.balance} onChange={(e) => setF({ ...f, balance: +e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          onClick={async () => {
            await fin.createAccount(f);
            onSaved();
            onClose();
          }}
        >
          Save Account
        </button>
      </div>
    </Modal>
  );
}

function ExpenseModal({
  open,
  onClose,
  onSaved,
  accounts,
}: ModalProps & { accounts: Account[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    category: "",
    description: "",
    amount: 0,
    expense_date: today,
    account_id: 0,
  });
  return (
    <Modal open={open} onClose={onClose} title="Record Expense">
      <div className="space-y-3">
        <Field label="Category">
          <input className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Rent, Fuel, Utilities…" />
        </Field>
        <Field label="Description">
          <input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (AED)">
            <input type="number" className="input" value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} />
          </Field>
          <Field label="Date">
            <input type="date" className="input" value={f.expense_date} onChange={(e) => setF({ ...f, expense_date: e.target.value })} />
          </Field>
        </div>
        <Field label="Account">
          <select className="input" value={f.account_id} onChange={(e) => setF({ ...f, account_id: +e.target.value })}>
            <option value={0}>None</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          onClick={async () => {
            await fin.createExpense(
              f.category,
              f.description || null,
              f.amount,
              f.expense_date,
              f.account_id || null
            );
            onSaved();
            onClose();
          }}
        >
          Save Expense
        </button>
      </div>
    </Modal>
  );
}

type ModalProps = { open: boolean; onClose: () => void; onSaved: () => void };
