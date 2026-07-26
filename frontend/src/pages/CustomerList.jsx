import React, { useEffect, useMemo, useState } from "react";
import { api, formatRs, formatApiError, formatDate } from "@/lib/api";
import { Link } from "react-router-dom";
import { Search, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import CustomerForm from "@/components/CustomerForm";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/customers");
      setCustomers(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(t) || (c.phone || "").toLowerCase().includes(t)
    );
  }, [q, customers]);

  const handleCreated = (c) => {
    setCustomers((prev) => [c, ...prev]);
    setShowForm(false);
    toast.success(`Customer "${c.name}" added`);
  };

  const doDelete = async () => {
    const c = confirmDelete;
    if (!c) return;
    try {
      await api.delete(`/customers/${c.id}`);
      setCustomers((prev) => prev.filter((x) => x.id !== c.id));
      toast.success(`Removed ${c.name}`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="soft-in" data-testid="customer-list-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#5C544D]">Registry</div>
          <h1 className="font-serif-display text-4xl mt-1 text-[#2C2825]">Customers</h1>
          <div className="h-px w-32 bg-[#C5A059] mt-4" />
        </div>
        <button
          className="btn-maroon inline-flex items-center gap-2"
          onClick={() => setShowForm(true)}
          data-testid="add-customer-btn"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="paper-surface border border-[#E2D9C8]">
        <div className="p-4 border-b border-[#E2D9C8] flex items-center gap-3">
          <Search className="w-4 h-4 text-[#5C544D]" />
          <input
            data-testid="customer-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or phone…"
            className="flex-1 bg-transparent outline-none text-sm placeholder-[#5C544D]/60"
          />
          <span className="text-xs text-[#5C544D] font-mono-num">{filtered.length} / {customers.length}</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-[#5C544D]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-[#5C544D]">
            <User className="w-6 h-6 mx-auto mb-2 text-[#C5A059]" />
            <div>No customers found.</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E2D9C8]">
                <th className="text-left text-[10px] uppercase tracking-widest text-[#5C544D] px-4 py-3">Customer</th>
                <th className="text-left text-[10px] uppercase tracking-widest text-[#5C544D] px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="text-left text-[10px] uppercase tracking-widest text-[#5C544D] px-4 py-3 hidden lg:table-cell">Added</th>
                <th className="text-right text-[10px] uppercase tracking-widest text-[#5C544D] px-4 py-3">Due</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="ledger-row border-b border-[#E2D9C8]/60" data-testid={`customer-row-${c.id}`}>
                  <td className="px-4 py-3">
                    <Link to={`/customers/${c.id}`} className="flex items-center gap-3">
                      <Avatar photo={c.photo} name={c.name} />
                      <div>
                        <div className="font-medium text-[#2C2825]">{c.name}</div>
                        <div className="text-xs text-[#5C544D] md:hidden font-mono-num">{c.phone || "—"}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono-num text-sm text-[#5C544D]">{c.phone || "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell font-mono-num text-xs text-[#5C544D]">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-2 py-1 text-xs font-mono-num font-bold ${c.due > 0 ? "chip-due" : "chip-paid"}`}>
                      {formatRs(c.due)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        to={`/customers/${c.id}`}
                        className="text-xs uppercase tracking-widest text-[#7B1E27]"
                        data-testid={`open-customer-btn-${c.id}`}
                      >
                        Open
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(c)}
                        className="text-[#B33A3A]"
                        data-testid={`delete-customer-btn-${c.id}`}
                        aria-label="Delete customer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <CustomerForm
          onClose={() => setShowForm(false)}
          onSaved={handleCreated}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete customer?"
        description={confirmDelete ? `This will permanently remove ${confirmDelete.name} and all their ledger entries. This cannot be undone.` : ""}
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={doDelete}
      />
    </div>
  );
}

function Avatar({ photo, name }) {
  if (photo) return <img src={photo} alt={name} className="w-10 h-10 object-cover border border-[#E2D9C8]" />;
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="w-10 h-10 flex items-center justify-center border border-[#E2D9C8] paper-warm font-serif-display text-[#7B1E27]">
      {initial}
    </div>
  );
}
