import React, { useEffect, useState } from "react";
import { api, formatRs } from "@/lib/api";
import { Link } from "react-router-dom";
import { TrendingDown, Wallet, Users, ArrowRight } from "lucide-react";

function Stat({ label, value, sub, testid, accent }) {
  return (
    <div className="paper-surface border border-[#E2D9C8] p-6" data-testid={testid}>
      <div className="text-[10px] uppercase tracking-[0.25em] text-[#5C544D]">{label}</div>
      <div className={`mt-3 font-mono-num text-3xl font-bold ${accent || "text-[#2C2825]"}`}>{value}</div>
      {sub ? <div className="mt-2 text-xs text-[#5C544D]">{sub}</div> : null}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((r) => setStats(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || e.message));
  }, []);

  return (
    <div className="soft-in" data-testid="dashboard-page">
      <div className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#5C544D]">Overview</div>
        <h1 className="font-serif-display text-4xl mt-1 text-[#2C2825]">The Ledger, at a Glance</h1>
        <div className="h-px w-32 bg-[#C5A059] mt-4" />
      </div>

      {err ? <div className="chip-due px-3 py-2 mb-6 text-sm">{err}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat
          label="Customers"
          value={stats?.total_customers ?? "—"}
          sub="Total profiles on the books"
          testid="stat-customers"
        />
        <Stat
          label="Total Charged"
          value={stats ? formatRs(stats.total_charged) : "—"}
          sub="Lifetime billed"
          testid="stat-charged"
        />
        <Stat
          label="Total Paid"
          value={stats ? formatRs(stats.total_paid) : "—"}
          accent="text-[#2E6F40]"
          sub="Amount collected"
          testid="stat-paid"
        />
        <Stat
          label="Outstanding Due"
          value={stats ? formatRs(stats.total_due) : "—"}
          accent="text-[#B33A3A]"
          sub="Sum of all pending"
          testid="stat-due"
        />
      </div>

      <div className="paper-surface border border-[#E2D9C8]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2D9C8]">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-[#7B1E27]" />
            <h2 className="font-serif-display text-xl text-[#2C2825]">Highest Outstanding</h2>
          </div>
          <Link to="/customers" className="text-xs uppercase tracking-widest text-[#7B1E27] inline-flex items-center gap-1" data-testid="dash-view-all-link">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {stats?.top_debtors?.length ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E2D9C8]">
                <th className="text-left text-[10px] uppercase tracking-widest text-[#5C544D] px-5 py-3">Customer</th>
                <th className="text-left text-[10px] uppercase tracking-widest text-[#5C544D] px-5 py-3 hidden sm:table-cell">Phone</th>
                <th className="text-right text-[10px] uppercase tracking-widest text-[#5C544D] px-5 py-3">Due</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {stats.top_debtors.map((c) => (
                <tr key={c.id} className="ledger-row border-b border-[#E2D9C8]/60" data-testid={`top-debtor-${c.id}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar photo={c.photo} name={c.name} />
                      <div>
                        <div className="font-medium text-[#2C2825]">{c.name}</div>
                        <div className="text-xs text-[#5C544D] sm:hidden font-mono-num">{c.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell font-mono-num text-sm text-[#5C544D]">{c.phone || "—"}</td>
                  <td className="px-5 py-3 text-right font-mono-num font-bold text-[#B33A3A]">{formatRs(c.due)}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <Link to={`/customers/${c.id}`} className="text-xs uppercase tracking-widest text-[#7B1E27] whitespace-nowrap" data-testid={`open-customer-${c.id}`}>
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-10 text-center text-[#5C544D]">
            <Wallet className="w-6 h-6 mx-auto mb-2 text-[#C5A059]" />
            <div className="text-sm">No outstanding dues. All books balanced.</div>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <Link to="/customers" className="btn-maroon inline-flex items-center gap-2" data-testid="dash-goto-customers-btn">
          <Users className="w-4 h-4" />
          Manage Customers
        </Link>
      </div>
    </div>
  );
}

function Avatar({ photo, name }) {
  if (photo) return <img src={photo} alt={name} className="w-9 h-9 object-cover border border-[#E2D9C8]" />;
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="w-9 h-9 flex items-center justify-center border border-[#E2D9C8] paper-warm font-serif-display text-[#7B1E27]">
      {initial}
    </div>
  );
}
