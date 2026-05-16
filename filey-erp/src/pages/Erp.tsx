import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  erp,
  Product,
  Order,
  Invoice,
} from "../lib/api";
import { aed, fmtDate, vatBreakdown, UAE_VAT_RATE } from "../lib/format";
import {
  PageHeader,
  DataTable,
  Badge,
  statusTone,
  Modal,
  Field,
} from "../components/ui";

type Tab = "products" | "orders" | "invoices";

export default function Erp() {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [modal, setModal] = useState<Tab | null>(null);

  const load = () => {
    erp.products().then(setProducts).catch(console.error);
    erp.orders().then(setOrders).catch(console.error);
    erp.invoices().then(setInvoices).catch(console.error);
  };
  useEffect(load, []);

  return (
    <div>
      <PageHeader
        title="ERP Core"
        subtitle="Products, sales orders & VAT invoices"
        action={
          <button className="btn-cta" onClick={() => setModal(tab)}>
            <Plus size={16} /> New {tab.slice(0, -1)}
          </button>
        }
      />

      <div className="flex gap-2 mb-5">
        {(["products", "orders", "invoices"] as Tab[]).map((t) => (
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

      {tab === "products" && (
        <DataTable<Product>
          rows={products}
          columns={[
            { key: "sku", label: "SKU", render: (p) => <span className="font-mono text-xs">{p.sku}</span> },
            { key: "name", label: "Name", render: (p) => <span className="font-semibold">{p.name}</span> },
            { key: "cat", label: "Category", render: (p) => p.category ?? "—" },
            { key: "price", label: "Unit Price", render: (p) => aed(p.unit_price) },
            {
              key: "qty",
              label: "Stock",
              render: (p) => (
                <span className="flex items-center gap-2">
                  {p.quantity}
                  {p.quantity <= p.reorder_level && (
                    <Badge tone="danger">Low</Badge>
                  )}
                </span>
              ),
            },
            {
              key: "act",
              label: "",
              render: (p) => (
                <button
                  aria-label={`Delete ${p.name}`}
                  className="text-danger hover:bg-danger/10 rounded-lg p-1.5 cursor-pointer transition-colors duration-200"
                  onClick={async () => {
                    await erp.deleteProduct(p.id);
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

      {tab === "orders" && (
        <DataTable<Order>
          rows={orders}
          columns={[
            { key: "no", label: "Order #", render: (o) => <span className="font-mono text-xs">{o.order_number}</span> },
            { key: "cust", label: "Customer", render: (o) => <span className="font-semibold">{o.customer_name}</span> },
            { key: "total", label: "Total", render: (o) => aed(o.total) },
            { key: "status", label: "Status", render: (o) => <Badge tone={statusTone(o.status)}>{o.status}</Badge> },
            { key: "date", label: "Created", render: (o) => fmtDate(o.created_at) },
          ]}
        />
      )}

      {tab === "invoices" && (
        <DataTable<Invoice>
          rows={invoices}
          columns={[
            { key: "no", label: "Invoice #", render: (i) => <span className="font-mono text-xs">{i.invoice_number}</span> },
            { key: "cust", label: "Customer", render: (i) => <span className="font-semibold">{i.customer_name}</span> },
            {
              key: "net",
              label: "Net",
              render: (i) => aed(i.amount / (1 + UAE_VAT_RATE)),
            },
            {
              key: "vat",
              label: "VAT 5%",
              render: (i) => aed(i.amount - i.amount / (1 + UAE_VAT_RATE)),
            },
            { key: "gross", label: "Total", render: (i) => <span className="font-semibold">{aed(i.amount)}</span> },
            { key: "status", label: "Status", render: (i) => <Badge tone={statusTone(i.status)}>{i.status}</Badge> },
            {
              key: "act",
              label: "",
              render: (i) =>
                i.status !== "paid" && (
                  <button
                    className="btn-ghost text-xs"
                    onClick={async () => {
                      await erp.markInvoicePaid(i.id);
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

      <ProductModal
        open={modal === "products"}
        onClose={() => setModal(null)}
        onSaved={load}
      />
      <OrderModal
        open={modal === "orders"}
        onClose={() => setModal(null)}
        onSaved={load}
      />
      <InvoiceModal
        open={modal === "invoices"}
        onClose={() => setModal(null)}
        onSaved={load}
      />
    </div>
  );
}

function ProductModal({ open, onClose, onSaved }: ModalProps) {
  const [f, setF] = useState({
    sku: "",
    name: "",
    category: "",
    unit_price: 0,
    cost_price: 0,
    quantity: 0,
    reorder_level: 0,
  });
  return (
    <Modal open={open} onClose={onClose} title="New Product">
      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU">
          <input className="input" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} />
        </Field>
        <Field label="Name">
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Category">
          <input className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        </Field>
        <Field label="Unit Price (AED)">
          <input type="number" className="input" value={f.unit_price} onChange={(e) => setF({ ...f, unit_price: +e.target.value })} />
        </Field>
        <Field label="Cost Price (AED)">
          <input type="number" className="input" value={f.cost_price} onChange={(e) => setF({ ...f, cost_price: +e.target.value })} />
        </Field>
        <Field label="Quantity">
          <input type="number" className="input" value={f.quantity} onChange={(e) => setF({ ...f, quantity: +e.target.value })} />
        </Field>
        <Field label="Reorder Level">
          <input type="number" className="input" value={f.reorder_level} onChange={(e) => setF({ ...f, reorder_level: +e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          onClick={async () => {
            await erp.createProduct({ ...f, description: "" } as any);
            onSaved();
            onClose();
          }}
        >
          Save Product
        </button>
      </div>
    </Modal>
  );
}

function OrderModal({ open, onClose, onSaved }: ModalProps) {
  const [f, setF] = useState({ order_number: "", customer_name: "", total: 0 });
  return (
    <Modal open={open} onClose={onClose} title="New Sales Order">
      <div className="space-y-3">
        <Field label="Order Number">
          <input className="input" value={f.order_number} onChange={(e) => setF({ ...f, order_number: e.target.value })} placeholder="SO-2026-0004" />
        </Field>
        <Field label="Customer Name">
          <input className="input" value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} />
        </Field>
        <Field label="Total (AED)">
          <input type="number" className="input" value={f.total} onChange={(e) => setF({ ...f, total: +e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          onClick={async () => {
            await erp.createOrder(f.order_number, f.customer_name, f.total);
            onSaved();
            onClose();
          }}
        >
          Save Order
        </button>
      </div>
    </Modal>
  );
}

function InvoiceModal({ open, onClose, onSaved }: ModalProps) {
  const [f, setF] = useState({ invoice_number: "", customer_name: "", net: 0, due_date: "" });
  const b = vatBreakdown(f.net);
  return (
    <Modal open={open} onClose={onClose} title="New VAT Invoice">
      <div className="space-y-3">
        <Field label="Invoice Number">
          <input className="input" value={f.invoice_number} onChange={(e) => setF({ ...f, invoice_number: e.target.value })} placeholder="INV-2026-0003" />
        </Field>
        <Field label="Customer Name">
          <input className="input" value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} />
        </Field>
        <Field label="Net Amount (AED, excl. VAT)">
          <input type="number" className="input" value={f.net} onChange={(e) => setF({ ...f, net: +e.target.value })} />
        </Field>
        <Field label="Due Date">
          <input type="date" className="input" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
        </Field>
        <div className="rounded-xl bg-brand-50 p-3 text-sm">
          <div className="flex justify-between"><span className="text-brand-500">Net</span><span>{aed(b.net)}</span></div>
          <div className="flex justify-between"><span className="text-brand-500">VAT 5%</span><span>{aed(b.vat)}</span></div>
          <div className="flex justify-between font-bold mt-1 pt-1 border-t border-brand-200"><span>Total</span><span>{aed(b.gross)}</span></div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          onClick={async () => {
            await erp.createInvoice(
              f.invoice_number,
              f.customer_name,
              b.gross,
              f.due_date || undefined
            );
            onSaved();
            onClose();
          }}
        >
          Issue Invoice
        </button>
      </div>
    </Modal>
  );
}

type ModalProps = { open: boolean; onClose: () => void; onSaved: () => void };
