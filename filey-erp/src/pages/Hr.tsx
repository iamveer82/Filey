import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { hr, Employee, Attendance, Payroll } from "../lib/api";
import { aed, fmtDate } from "../lib/format";
import {
  PageHeader,
  DataTable,
  Badge,
  statusTone,
  Modal,
  Field,
} from "../components/ui";

type Tab = "employees" | "attendance" | "payroll";

export default function Hr() {
  const [tab, setTab] = useState<Tab>("employees");
  const [emps, setEmps] = useState<Employee[]>([]);
  const [att, setAtt] = useState<Attendance[]>([]);
  const [pay, setPay] = useState<Payroll[]>([]);
  const [modal, setModal] = useState<Tab | null>(null);

  const load = () => {
    hr.employees().then(setEmps).catch(console.error);
    hr.attendance().then(setAtt).catch(console.error);
    hr.payroll().then(setPay).catch(console.error);
  };
  useEffect(load, []);

  return (
    <div>
      <PageHeader
        title="Human Resources"
        subtitle="Employees, attendance & UAE payroll (AED)"
        action={
          <button className="btn-cta" onClick={() => setModal(tab)}>
            <Plus size={16} />{" "}
            {tab === "employees"
              ? "Add Employee"
              : tab === "attendance"
              ? "Mark Attendance"
              : "Run Payroll"}
          </button>
        }
      />

      <div className="flex gap-2 mb-5">
        {(["employees", "attendance", "payroll"] as Tab[]).map((t) => (
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

      {tab === "employees" && (
        <DataTable<Employee>
          rows={emps}
          columns={[
            { key: "code", label: "Code", render: (e) => <span className="font-mono text-xs">{e.employee_code}</span> },
            { key: "name", label: "Name", render: (e) => <span className="font-semibold">{e.name}</span> },
            { key: "dept", label: "Department", render: (e) => e.department ?? "—" },
            { key: "pos", label: "Position", render: (e) => e.position ?? "—" },
            { key: "sal", label: "Salary", render: (e) => aed(e.salary) },
            { key: "status", label: "Status", render: (e) => <Badge tone={statusTone(e.status)}>{e.status}</Badge> },
            {
              key: "act",
              label: "",
              render: (e) => (
                <button
                  aria-label={`Remove ${e.name}`}
                  className="text-danger hover:bg-danger/10 rounded-lg p-1.5 cursor-pointer transition-colors duration-200"
                  onClick={async () => {
                    await hr.deleteEmployee(e.id);
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

      {tab === "attendance" && (
        <DataTable<Attendance>
          rows={att}
          columns={[
            { key: "name", label: "Employee", render: (a) => <span className="font-semibold">{a.employee_name}</span> },
            { key: "date", label: "Date", render: (a) => fmtDate(a.date) },
            { key: "in", label: "Check In", render: (a) => a.check_in ?? "—" },
            { key: "out", label: "Check Out", render: (a) => a.check_out ?? "—" },
            { key: "status", label: "Status", render: (a) => <Badge tone={statusTone(a.status)}>{a.status}</Badge> },
          ]}
        />
      )}

      {tab === "payroll" && (
        <DataTable<Payroll>
          rows={pay}
          columns={[
            { key: "name", label: "Employee", render: (p) => <span className="font-semibold">{p.employee_name}</span> },
            { key: "period", label: "Period", render: (p) => p.period },
            { key: "basic", label: "Basic", render: (p) => aed(p.basic) },
            { key: "allow", label: "Allowances", render: (p) => aed(p.allowances) },
            { key: "ded", label: "Deductions", render: (p) => aed(p.deductions) },
            { key: "net", label: "Net Pay", render: (p) => <span className="font-semibold">{aed(p.net_pay)}</span> },
            { key: "status", label: "Status", render: (p) => <Badge tone={statusTone(p.status)}>{p.status}</Badge> },
            {
              key: "act",
              label: "",
              render: (p) =>
                p.status !== "paid" && (
                  <button
                    className="btn-ghost text-xs"
                    onClick={async () => {
                      await hr.markPayrollPaid(p.id);
                      load();
                    }}
                  >
                    Mark paid
                  </button>
                ),
            },
          ]}
        />
      )}

      <EmployeeModal open={modal === "employees"} onClose={() => setModal(null)} onSaved={load} />
      <AttendanceModal open={modal === "attendance"} onClose={() => setModal(null)} onSaved={load} emps={emps} />
      <PayrollModal open={modal === "payroll"} onClose={() => setModal(null)} onSaved={load} emps={emps} />
    </div>
  );
}

function EmployeeModal({ open, onClose, onSaved }: ModalProps) {
  const [f, setF] = useState({
    employee_code: "",
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    salary: 0,
    hire_date: "",
  });
  return (
    <Modal open={open} onClose={onClose} title="Add Employee">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Employee Code">
          <input className="input" value={f.employee_code} onChange={(e) => setF({ ...f, employee_code: e.target.value })} placeholder="EMP-005" />
        </Field>
        <Field label="Full Name">
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+971 5x xxx xxxx" />
        </Field>
        <Field label="Department">
          <input className="input" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} />
        </Field>
        <Field label="Position">
          <input className="input" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} />
        </Field>
        <Field label="Salary (AED)">
          <input type="number" className="input" value={f.salary} onChange={(e) => setF({ ...f, salary: +e.target.value })} />
        </Field>
        <Field label="Hire Date">
          <input type="date" className="input" value={f.hire_date} onChange={(e) => setF({ ...f, hire_date: e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          onClick={async () => {
            await hr.createEmployee(f as any);
            onSaved();
            onClose();
          }}
        >
          Save Employee
        </button>
      </div>
    </Modal>
  );
}

function AttendanceModal({
  open,
  onClose,
  onSaved,
  emps,
}: ModalProps & { emps: Employee[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    employee_id: 0,
    date: today,
    status: "present",
    check_in: "09:00",
    check_out: "18:00",
  });
  return (
    <Modal open={open} onClose={onClose} title="Mark Attendance">
      <div className="space-y-3">
        <Field label="Employee">
          <select className="input" value={f.employee_id} onChange={(e) => setF({ ...f, employee_id: +e.target.value })}>
            <option value={0}>Select…</option>
            {emps.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="present">Present</option>
            <option value="leave">Leave</option>
            <option value="absent">Absent</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check In">
            <input className="input" value={f.check_in} onChange={(e) => setF({ ...f, check_in: e.target.value })} />
          </Field>
          <Field label="Check Out">
            <input className="input" value={f.check_out} onChange={(e) => setF({ ...f, check_out: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          disabled={!f.employee_id}
          onClick={async () => {
            await hr.markAttendance(
              f.employee_id,
              f.date,
              f.status,
              f.status === "present" ? f.check_in : undefined,
              f.status === "present" ? f.check_out : undefined
            );
            onSaved();
            onClose();
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function PayrollModal({
  open,
  onClose,
  onSaved,
  emps,
}: ModalProps & { emps: Employee[] }) {
  const [f, setF] = useState({
    employee_id: 0,
    period: "2026-05",
    basic: 0,
    allowances: 0,
    deductions: 0,
  });
  const net = f.basic + f.allowances - f.deductions;
  return (
    <Modal open={open} onClose={onClose} title="Run Payroll">
      <div className="space-y-3">
        <Field label="Employee">
          <select
            className="input"
            value={f.employee_id}
            onChange={(e) => {
              const emp = emps.find((x) => x.id === +e.target.value);
              setF({ ...f, employee_id: +e.target.value, basic: emp?.salary ?? 0 });
            }}
          >
            <option value={0}>Select…</option>
            {emps.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Period (YYYY-MM)">
          <input className="input" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Basic">
            <input type="number" className="input" value={f.basic} onChange={(e) => setF({ ...f, basic: +e.target.value })} />
          </Field>
          <Field label="Allowances">
            <input type="number" className="input" value={f.allowances} onChange={(e) => setF({ ...f, allowances: +e.target.value })} />
          </Field>
          <Field label="Deductions">
            <input type="number" className="input" value={f.deductions} onChange={(e) => setF({ ...f, deductions: +e.target.value })} />
          </Field>
        </div>
        <div className="rounded-xl bg-emerald-500/10 p-3 flex justify-between font-bold text-emerald-700">
          <span>Net Pay</span>
          <span>{aed(net)}</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          disabled={!f.employee_id}
          onClick={async () => {
            await hr.runPayroll(f.employee_id, f.period, f.basic, f.allowances, f.deductions);
            onSaved();
            onClose();
          }}
        >
          Process
        </button>
      </div>
    </Modal>
  );
}

type ModalProps = { open: boolean; onClose: () => void; onSaved: () => void };
