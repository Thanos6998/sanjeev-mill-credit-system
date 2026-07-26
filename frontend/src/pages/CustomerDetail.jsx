import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, formatApiError, formatRs, formatDate, todayISO } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Printer, Pencil, Trash2, Plus, ReceiptText, HandCoins } from "lucide-react";
import CustomerForm from "@/components/CustomerForm";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function CustomerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState(false);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/customers/${id}`);
      setData(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const rows = useMemo(() => computeLedger(data?.entries || []), [data]);

  if (loading) return <div className="soft-in text-[#5C544D]">Loading…</div>;
  if (!data) return <div className="soft-in text-[#5C544D]">Customer not found.</div>;

  const c = data.customer;

  const removeCustomer = async () => {
    try {
      await api.delete(`/customers/${id}`);
      toast.success("Customer removed");
      nav("/customers");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const removeEntry = async () => {
    const entry = confirmDeleteEntry;
    if (!entry) return;
    try {
      await api.delete(`/entries/${entry.id}`);
      toast.success("Entry removed");
      setConfirmDeleteEntry(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="soft-in" data-testid="customer-detail-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 no-print">
        <div>
          <Link to="/customers" className="text-xs uppercase tracking-widest text-[#7B1E27] inline-flex items-center gap-1" data-testid="back-to-customers-link">
            <ArrowLeft className="w-3 h-3" /> All customers
          </Link>
          <h1 className="font-serif-display text-4xl mt-2 text-[#2C2825]">{c.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/customers/${id}/print`} className="btn-ghost inline-flex items-center gap-2" data-testid="print-ledger-btn">
            <Printer className="w-4 h-4" /> Print Ledger
          </Link>
          <button className="btn-ghost inline-flex items-center gap-2" onClick={() => setEditing(true)} data-testid="edit-customer-btn">
            <Pencil className="w-4 h-4" /> Edit
          </button>
          <button className="btn-ghost inline-flex items-center gap-2" style={{ color: "#B33A3A" }} onClick={() => setConfirmDeleteCustomer(true)} data-testid="delete-customer-page-btn">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Profile block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 paper-surface border border-[#E2D9C8] p-5">
          <div className="flex items-start gap-5">
            {c.photo ? (
              <img src={c.photo} alt={c.name} className="w-24 h-24 object-cover border border-[#E2D9C8]" />
            ) : (
              <div className="w-24 h-24 border border-[#E2D9C8] paper-warm flex items-center justify-center font-serif-display text-4xl text-[#7B1E27]">
                {c.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#5C544D]">Customer profile</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
                <ProfileRow label="Phone" value={c.phone || "—"} mono />
                <ProfileRow label="Added" value={formatDate(c.created_at)} mono />
                <ProfileRow label="Address" value={c.address || "—"} full />
              </div>
            </div>
          </div>
        </div>
        <div className="paper-surface border border-[#E2D9C8] p-5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#5C544D]">Ledger summary</div>
          <div className="mt-3 space-y-2">
            <SummaryLine label="Total Charged" value={formatRs(c.total_charged)} />
            <SummaryLine label="Total Paid" value={formatRs(c.total_paid)} tone="paid" />
            <div className="h-px bg-[#C5A059] my-2" />
            <SummaryLine label="Remaining Due" value={formatRs(c.due)} bold tone={c.due > 0 ? "due" : "paid"} />
          </div>
        </div>
      </div>

      {/* Add entry forms */}
      <AddEntries customerId={id} onAdded={load} />

      {/* Ledger table */}
      <div className="mt-8 paper-surface border border-[#E2D9C8]">
        <div className="px-5 py-4 border-b border-[#E2D9C8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-[#7B1E27]" />
            <h2 className="font-serif-display text-xl text-[#2C2825]">Ledger</h2>
          </div>
          <div className="text-xs text-[#5C544D] font-mono-num">{rows.length} entries</div>
        </div>

        <LedgerTable rows={rows} onDeleteEntry={(e) => setConfirmDeleteEntry(e)} onChange={load} />
      </div>

      {editing && (
        <CustomerForm
          initial={c}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setEditing(false);
            setData((d) => ({ ...d, customer: { ...d.customer, ...updated } }));
            toast.success("Customer updated");
          }}
        />
      )}
      <ConfirmDialog
        open={confirmDeleteCustomer}
        title="Delete this customer?"
        description={`This will permanently remove ${c.name} and all their ledger entries. This cannot be undone.`}
        confirmLabel="Delete customer"
        destructive
        onCancel={() => setConfirmDeleteCustomer(false)}
        onConfirm={removeCustomer}
      />
      <ConfirmDialog
        open={!!confirmDeleteEntry}
        title="Delete this entry?"
        description="The ledger will recalculate. This cannot be undone."
        confirmLabel="Delete entry"
        destructive
        onCancel={() => setConfirmDeleteEntry(null)}
        onConfirm={removeEntry}
      />
    </div>
  );
}

function ProfileRow({ label, value, mono, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-widest text-[#5C544D]">{label}</div>
      <div className={`text-sm text-[#2C2825] ${mono ? "font-mono-num" : ""}`}>{value}</div>
    </div>
  );
}

function SummaryLine({ label, value, bold, tone }) {
  const color = tone === "due" ? "text-[#B33A3A]" : tone === "paid" ? "text-[#2E6F40]" : "text-[#2C2825]";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-[#5C544D] uppercase tracking-widest">{label}</span>
      <span className={`font-mono-num ${bold ? "text-lg font-bold" : "text-sm"} ${color}`}>{value}</span>
    </div>
  );
}

function computeLedger(entries) {
  const sorted = [...entries].sort((a, b) => {
    if (a.date === b.date) return (a.created_at || "").localeCompare(b.created_at || "");
    return a.date.localeCompare(b.date);
  });
  let bal = 0;
  return sorted.map((e) => {
    if (e.type === "charge") bal += Number(e.amount || 0);
    else bal -= Number(e.amount || 0);
    return { ...e, running: bal };
  });
}

function AddEntries({ customerId, onAdded }) {
  const [tab, setTab] = useState("charge");
  return (
    <div className="paper-surface border border-[#E2D9C8] no-print">
      <div className="flex border-b border-[#E2D9C8]">
        <TabBtn active={tab === "charge"} onClick={() => setTab("charge")} testid="tab-add-charge">
          <ReceiptText className="w-4 h-4" /> Add Product / Credit
        </TabBtn>
        <TabBtn active={tab === "payment"} onClick={() => setTab("payment")} testid="tab-add-payment">
          <HandCoins className="w-4 h-4" /> Record Payment
        </TabBtn>
      </div>
      {tab === "charge" ? (
        <ChargeForm customerId={customerId} onAdded={onAdded} />
      ) : (
        <PaymentForm customerId={customerId} onAdded={onAdded} />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`flex-1 sm:flex-none px-5 py-3 text-sm font-medium inline-flex items-center gap-2 border-b-2 ${active ? "border-[#7B1E27] text-[#7B1E27]" : "border-transparent text-[#5C544D] hover:text-[#2C2825]"}`}
    >
      {children}
    </button>
  );
}

function ChargeForm({ customerId, onAdded }) {
  const [date, setDate] = useState(todayISO());
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);

  const amount = useMemo(() => {
    const q = parseFloat(qty), r = parseFloat(rate);
    if (!isFinite(q) || !isFinite(r) || q <= 0 || r <= 0) return 0;
    return q * r;
  }, [qty, rate]);

  const submit = async (e) => {
    e.preventDefault();
    if (amount <= 0) { toast.error("Quantity and rate must be positive"); return; }
    setSaving(true);
    try {
      await api.post(`/customers/${customerId}/charges`, {
        date, product: product.trim(), quantity: parseFloat(qty), rate: parseFloat(rate),
      });
      setProduct(""); setQty(""); setRate("");
      toast.success("Charge added");
      onAdded();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-5 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end" data-testid="charge-form">
      <Cell label="Date" col="sm:col-span-1">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full border border-[#E2D9C8] bg-white px-2 py-2 text-sm font-mono-num" data-testid="charge-date-input" />
      </Cell>
      <Cell label="Product" col="sm:col-span-2">
        <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} required placeholder="e.g. Rice 25kg" className="w-full border border-[#E2D9C8] bg-white px-2 py-2 text-sm" data-testid="charge-product-input" />
      </Cell>
      <Cell label="Qty">
        <input type="number" min="0" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} required className="w-full border border-[#E2D9C8] bg-white px-2 py-2 text-sm font-mono-num text-right" data-testid="charge-qty-input" />
      </Cell>
      <Cell label="Rate (Rs.)">
        <input type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} required className="w-full border border-[#E2D9C8] bg-white px-2 py-2 text-sm font-mono-num text-right" data-testid="charge-rate-input" />
      </Cell>
      <Cell label="Amount">
        <div className="border border-[#E2D9C8] paper-warm px-2 py-2 text-sm font-mono-num text-right font-bold text-[#7B1E27]" data-testid="charge-amount-preview">
          {formatRs(amount)}
        </div>
      </Cell>
      <div className="sm:col-span-6 flex justify-end">
        <button type="submit" className="btn-maroon inline-flex items-center gap-2" disabled={saving} data-testid="charge-submit-btn">
          <Plus className="w-4 h-4" /> {saving ? "Adding…" : "Add to ledger"}
        </button>
      </div>
    </form>
  );
}

function PaymentForm({ customerId, onAdded }) {
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!isFinite(a) || a <= 0) { toast.error("Payment must be positive"); return; }
    setSaving(true);
    try {
      await api.post(`/customers/${customerId}/payments`, { date, amount: a, note: note.trim() });
      setAmount(""); setNote("");
      toast.success("Payment recorded");
      onAdded();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="p-5 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end" data-testid="payment-form">
      <Cell label="Date" col="sm:col-span-1">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full border border-[#E2D9C8] bg-white px-2 py-2 text-sm font-mono-num" data-testid="payment-date-input" />
      </Cell>
      <Cell label="Amount (Rs.)" col="sm:col-span-2">
        <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full border border-[#E2D9C8] bg-white px-2 py-2 text-sm font-mono-num text-right" data-testid="payment-amount-input" />
      </Cell>
      <Cell label="Note (optional)" col="sm:col-span-3">
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Cash / eSewa reference" className="w-full border border-[#E2D9C8] bg-white px-2 py-2 text-sm" data-testid="payment-note-input" />
      </Cell>
      <div className="sm:col-span-6 flex justify-end">
        <button type="submit" className="btn-maroon inline-flex items-center gap-2" disabled={saving} data-testid="payment-submit-btn">
          <Plus className="w-4 h-4" /> {saving ? "Saving…" : "Record payment"}
        </button>
      </div>
    </form>
  );
}

function Cell({ label, col, children }) {
  return (
    <div className={col || ""}>
      <label className="block text-[10px] uppercase tracking-widest text-[#5C544D] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function LedgerTable({ rows, onDeleteEntry, onChange }) {
  if (rows.length === 0) {
    return <div className="p-10 text-center text-[#5C544D]">No ledger entries yet. Add the first product or payment above.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#E2D9C8] paper-warm">
            <th className="text-left text-[10px] uppercase tracking-widest text-[#5C544D] px-3 py-3">Date</th>
            <th className="text-left text-[10px] uppercase tracking-widest text-[#5C544D] px-3 py-3">Description</th>
            <th className="text-right text-[10px] uppercase tracking-widest text-[#5C544D] px-3 py-3">Qty</th>
            <th className="text-right text-[10px] uppercase tracking-widest text-[#5C544D] px-3 py-3">Rate</th>
            <th className="text-right text-[10px] uppercase tracking-widest text-[#5C544D] px-3 py-3">Charge</th>
            <th className="text-right text-[10px] uppercase tracking-widest text-[#5C544D] px-3 py-3">Payment</th>
            <th className="text-right text-[10px] uppercase tracking-widest text-[#7B1E27] px-3 py-3">Running Due</th>
            <th className="w-10 no-print"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="ledger-row border-b border-[#E2D9C8]/60" data-testid={`ledger-row-${r.id}`}>
              <td className="px-3 py-2.5 font-mono-num text-xs text-[#5C544D] whitespace-nowrap">{formatDate(r.date)}</td>
              <td className="px-3 py-2.5 text-sm text-[#2C2825]">
                {r.type === "charge" ? r.product : (
                  <span>
                    <span className="text-[#2E6F40] font-medium">Payment received</span>
                    {r.note ? <span className="text-[#5C544D]"> · {r.note}</span> : null}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right font-mono-num text-sm">{r.type === "charge" ? r.quantity : "—"}</td>
              <td className="px-3 py-2.5 text-right font-mono-num text-sm">{r.type === "charge" ? formatRs(r.rate).replace("Rs. ", "") : "—"}</td>
              <td className="px-3 py-2.5 text-right font-mono-num text-sm text-[#2C2825]">{r.type === "charge" ? formatRs(r.amount) : "—"}</td>
              <td className="px-3 py-2.5 text-right font-mono-num text-sm text-[#2E6F40]">{r.type === "payment" ? formatRs(r.amount) : "—"}</td>
              <td className="px-3 py-2.5 text-right font-mono-num text-sm font-bold paper-warm text-[#7B1E27]">{formatRs(r.running)}</td>
              <td className="px-3 py-2.5 text-right no-print">
                <button onClick={() => onDeleteEntry(r)} className="text-[#B33A3A]" data-testid={`delete-entry-btn-${r.id}`} aria-label="Delete entry">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
