import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

const BG = "https://images.pexels.com/photos/38374178/pexels-photo-38374178.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Login() {
  const { user, login, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user !== false) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-5">
      {/* Left cover */}
      <div className="hidden lg:flex lg:col-span-2 relative overflow-hidden" style={{ backgroundColor: "#2A0F13" }}>
        <img src={BG} alt="Leather ledger book" className="absolute inset-0 w-full h-full object-cover opacity-55" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full text-[#F6F1E5]">
          <div>
            <div className="font-serif-display text-3xl leading-tight">Sanjeev<br/>Mill Udhyog</div>
            <div className="mt-2 text-sm tracking-[0.25em] uppercase text-[#C5A059]">— Est. Khata System —</div>
          </div>
          <div>
            <div className="font-serif-display text-2xl italic leading-snug">
              &ldquo;Every grain accounted for,<br/>every rupee remembered.&rdquo;
            </div>
            <div className="mt-4 h-px w-24 bg-[#C5A059]" />
            <div className="mt-4 text-xs text-[#E2D9C8]/80 font-mono-num">Traditional Nepali Credit Ledger · Digital Edition</div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="lg:col-span-3 flex items-center justify-start paper-bg">
        <div className="w-full max-w-md px-8 lg:px-16 py-12 soft-in">
          <div className="border-l-4 border-[#7B1E27] pl-4 mb-10">
            <div className="text-xs tracking-[0.3em] uppercase text-[#5C544D]">Owner Access</div>
            <h1 className="font-serif-display text-4xl mt-1 text-[#2C2825]">Sign in to your Khata</h1>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#5C544D] mb-1.5">Email</label>
              <input
                data-testid="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#E2D9C8] bg-white px-3 py-2.5 font-mono-num text-sm"
                placeholder="owner@sanjeevmill.com"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#5C544D] mb-1.5">Password</label>
              <input
                data-testid="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#E2D9C8] bg-white px-3 py-2.5 font-mono-num text-sm"
                placeholder="••••••••"
              />
            </div>
            {error ? (
              <div data-testid="login-error" className="text-sm chip-due px-3 py-2">{error}</div>
            ) : null}
            <button
              data-testid="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-maroon w-full mt-2"
            >
              {loading ? "Signing in…" : "Enter the Ledger"}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-[#E2D9C8] text-xs text-[#5C544D] font-mono-num">
            Private records · Access restricted to authorized owner
          </div>
        </div>
      </div>
    </div>
  );
}
