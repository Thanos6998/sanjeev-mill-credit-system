import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatRs, formatDate } from "@/lib/api";
import { Printer, ArrowLeft } from "lucide-react";

export default function PrintLedger() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/customers/${id}`).then((r) => setData(r.data));
  }, [id]);

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (!data) return <div className="p-10 text-[#5C544D]">Loading ledger…</div>;
  const c = data.customer;
  const entries = [...data.entries].sort((a, b) => {
    if (a.date === b.date) return (a.created_at || "").localeCompare(b.created_at || "");
    return a.date.localeCompare(b.date);
  });
  let bal = 0;
  const rows = entries.map((e) => {
    if (e.type === "charge") bal += Number(e.amount || 0);
    else bal -= Number(e.amount || 0);
    return { ...e, running: bal };
  });

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen paper-bg">
      <div className="max-w-4xl mx-auto p-8">
        {/* screen-only toolbar */}
        <div className="no-print flex items-center justify-between mb-6">
          <button onClick={() => nav(-1)} className="btn-ghost inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={() => window.print()} className="btn-maroon inline-flex items-center gap-2" data-testid="trigger-print-btn">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>

        <div className="print-area paper-surface p-10 border border-[#E2D9C8]">
          {/* Company Header */}
          <div className="flex items-start justify-between border-b-2 pb-4" style={{ borderColor: "#7B1E27" }}>
            <div>
              <div className="font-serif-display text-3xl print-maroon" style={{ color: "#7B1E27" }}>Sanjeev Mill Udhyog</div>
              <div className="text-xs uppercase tracking-[0.3em] text-[#5C544D] mt-1">Traditional Mill · Credit Ledger (Khata)</div>
            </div>
            <div className="text-right text-xs font-mono-num text-[#5C544D]">
              <div>Printed: {today}</div>
              <div>Statement of Account</div>
            </div>
          </div>

          {/* Customer meta */}
          <div className="grid grid-cols-3 gap-6 mt-6 mb-6">
            <div className="col-span-2">
              <div className="text-[10px] uppercase tracking-widest text-[#5C544D]">Customer</div>
              <div className="font-serif-display text-2xl text-[#2C2825]">{c.name}</div>
              <div className="text-sm mt-1 font-mono-num">{c.phone || "—"}</div>
              {c.address ? <div className="text-sm text-[#5C544D] mt-1">{c.address}</div> : null}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-[#5C544D]">Account since</div>
              <div className="font-mono-num text-sm">{formatDate(c.created_at)}</div>
            </div>
          </div>

          {/* Ledger */}
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-[10px] uppercase tracking-widest">Date</th>
                <th className="text-left text-[10px] uppercase tracking-widest">Description</th>
                <th className="text-right text-[10px] uppercase tracking-widest">Qty</th>
                <th className="text-right text-[10px] uppercase tracking-widest">Rate</th>
                <th className="text-right text-[10px] uppercase tracking-widest">Charge</th>
                <th className="text-right text-[10px] uppercase tracking-widest">Payment</th>
                <th className="text-right text-[10px] uppercase tracking-widest">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-[#5C544D] py-6">No entries recorded.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono-num">{formatDate(r.date)}</td>
                  <td>
                    {r.type === "charge" ? r.product : (r.note ? `Payment received — ${r.note}` : "Payment received")}
                  </td>
                  <td className="text-right font-mono-num">{r.type === "charge" ? r.quantity : "—"}</td>
                  <td className="text-right font-mono-num">{r.type === "charge" ? formatRs(r.rate).replace("Rs. ", "") : "—"}</td>
                  <td className="text-right font-mono-num">{r.type === "charge" ? formatRs(r.amount) : "—"}</td>
                  <td className="text-right font-mono-num">{r.type === "payment" ? formatRs(r.amount) : "—"}</td>
                  <td className="text-right font-mono-num font-bold">{formatRs(r.running)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-8 grid grid-cols-3 gap-6">
            <div />
            <div />
            <div className="border-t-2 pt-3" style={{ borderColor: "#7B1E27" }}>
              <TotalLine label="Total Charged" value={formatRs(c.total_charged)} />
              <TotalLine label="Total Paid" value={formatRs(c.total_paid)} />
              <div className="h-px my-2" style={{ backgroundColor: "#7B1E27" }} />
              <TotalLine label="Remaining Due" value={formatRs(c.due)} bold maroon />
            </div>
          </div>

          <div className="mt-10 pt-4 border-t text-[10px] uppercase tracking-widest text-[#5C544D] flex justify-between" style={{ borderColor: "#C5A059" }}>
            <div>Signature ______________________</div>
            <div>Sanjeev Mill Udhyog</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TotalLine({ label, value, bold, maroon }) {
  return (
    <div className="flex justify-between items-baseline py-1">
      <span className="text-xs uppercase tracking-widest text-[#5C544D]">{label}</span>
      <span className={`font-mono-num ${bold ? "text-lg font-bold" : "text-sm"} ${maroon ? "print-maroon" : ""}`} style={maroon ? { color: "#7B1E27" } : {}}>{value}</span>
    </div>
  );
}
