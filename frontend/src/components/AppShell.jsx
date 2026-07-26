import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogOut, LayoutDashboard, Users, BookOpen } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/customers", label: "Customers", icon: Users, testid: "nav-customers" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const isPrint = loc.pathname.endsWith("/print");

  if (isPrint) return <>{children}</>;

  return (
    <div className="min-h-screen paper-bg">
      {/* Top bar */}
      <header className="app-header paper-surface border-b border-[#E2D9C8] no-print">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="brand-home-link">
            <div className="w-9 h-9 flex items-center justify-center" style={{ backgroundColor: "#7B1E27" }}>
              <BookOpen className="w-5 h-5 text-[#F6F1E5]" />
            </div>
            <div>
              <div className="font-serif-display text-lg leading-none text-[#2C2825]">Sanjeev Mill Udhyog</div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-[#5C544D] mt-0.5">Khata · Credit Ledger</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                data-testid={n.testid}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-[#7B1E27] text-[#7B1E27]"
                      : "border-transparent text-[#5C544D] hover:text-[#2C2825]"
                  }`
                }
              >
                <span className="inline-flex items-center gap-2">
                  <n.icon className="w-4 h-4" />
                  {n.label}
                </span>
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-xs text-[#5C544D]">Signed in</div>
              <div className="text-sm font-medium text-[#2C2825] font-mono-num">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              data-testid="logout-btn"
              className="btn-ghost inline-flex items-center gap-2"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="md:hidden border-b border-[#E2D9C8] paper-surface no-print">
        <div className="max-w-7xl mx-auto px-6 flex">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `flex-1 text-center py-3 text-sm font-medium border-b-2 ${
                  isActive ? "border-[#7B1E27] text-[#7B1E27]" : "border-transparent text-[#5C544D]"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 book-spine pl-10">{children}</main>

      <footer className="max-w-7xl mx-auto px-6 py-8 text-xs text-[#5C544D] font-mono-num no-print">
        © Sanjeev Mill Udhyog · Confidential financial records
      </footer>
    </div>
  );
}
