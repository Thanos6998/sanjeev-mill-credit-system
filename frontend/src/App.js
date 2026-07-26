import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import CustomerList from "@/pages/CustomerList";
import CustomerDetail from "@/pages/CustomerDetail";
import PrintLedger from "@/pages/PrintLedger";
import AppShell from "@/components/AppShell";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null) return <div className="p-10 text-[#5C544D]">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <Protected>
                  <AppShell><Dashboard /></AppShell>
                </Protected>
              }
            />
            <Route
              path="/customers"
              element={
                <Protected>
                  <AppShell><CustomerList /></AppShell>
                </Protected>
              }
            />
            <Route
              path="/customers/:id"
              element={
                <Protected>
                  <AppShell><CustomerDetail /></AppShell>
                </Protected>
              }
            />
            <Route
              path="/customers/:id/print"
              element={
                <Protected>
                  <PrintLedger />
                </Protected>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </div>
  );
}

export default App;
