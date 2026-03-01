// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider, useAuth }   from "./contexts/AuthContext";
import { CartProvider }            from "./contexts/CartContext";
import { AppProvider }             from "./contexts/AppContext";
import ErrorBoundary               from "./components/common/ErrorBoundary";
import { LoadingSpinner }          from "./components/common/LoadingSpinner";
import InstallPrompt               from "./components/common/InstallPrompt";

// Pages
import LoginPage      from "./pages/LoginPage";
import Home           from "./pages/customer/Home";
import Cart           from "./pages/customer/Cart";
import Checkout       from "./pages/customer/Checkout";
import OrderHistory   from "./pages/customer/OrderHistory";

import AdminDashboard  from "./pages/admin/AdminDashboard";
import PriceMaster     from "./pages/admin/PriceMaster";
import BuildingManager from "./pages/admin/BuildingManager";
import OrderBatcher    from "./pages/admin/OrderBatcher";
import UserRequests    from "./pages/admin/UserRequests";
import AdminManager    from "./pages/admin/AdminManager";
import Settings        from "./pages/admin/Settings";

// ── Guards ────────────────────────────────────────────────────

const RequireAuth = ({ children }) => {
  const { user, isAdmin, pendingApproval, authLoading, logout } = useAuth();
  const location = useLocation();

  if (authLoading) return <LoadingSpinner fullScreen message="Starting Veggie Direct…" />;
  if (!user)       return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (isAdmin || !pendingApproval) return children;

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-4">⏳</div>
      <h1 className="font-display font-black text-2xl text-brand-800 mb-2">Account Pending Approval</h1>
      <p className="text-gray-600 text-sm max-w-sm mb-6">
        Your account is pending approval by the admin. You will get access once it's verified.
      </p>
      <div className="bg-white border border-brand-200 rounded-2xl p-4 max-w-sm w-full mb-6 text-left">
        <p className="text-xs text-gray-400 mb-2">What happens next:</p>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>✅ Your registration has been received</li>
          <li>📞 Admin may call your number to verify</li>
          <li>🎉 You get shop access once approved</li>
        </ul>
      </div>
      <button onClick={logout} className="text-brand-600 text-sm font-semibold underline">
        Sign out and use a different account
      </button>
    </div>
  );
};

const RequireAdmin = ({ children }) => {
  const { user, isAdmin, authLoading } = useAuth();
  const location = useLocation();
  if (authLoading) return <LoadingSpinner fullScreen message="Checking admin access…" />;
  if (!user)       return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!isAdmin)    return <Navigate to="/" replace />;
  return children;
};

const RequireMasterAdmin = ({ children }) => {
  const { user, isMasterAdmin, authLoading } = useAuth();
  const location = useLocation();
  if (authLoading)    return <LoadingSpinner fullScreen message="Checking permissions…" />;
  if (!user)          return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!isMasterAdmin) return <Navigate to="/admin" replace />;
  return children;
};

const PublicOnly = ({ children }) => {
  const { user, isAdmin, pendingApproval, authLoading } = useAuth();
  if (authLoading) return <LoadingSpinner fullScreen message="Loading…" />;
  if (user && !pendingApproval) return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
  return children;
};

// ── Routes ────────────────────────────────────────────────────
const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />

    {/* Customer */}
    <Route path="/"         element={<RequireAuth><Home /></RequireAuth>} />
    <Route path="/cart"     element={<RequireAuth><Cart /></RequireAuth>} />
    <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
    <Route path="/orders"   element={<RequireAuth><OrderHistory /></RequireAuth>} />

    {/* Admin — any admin */}
    <Route path="/admin"           element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
    <Route path="/admin/prices"    element={<RequireAdmin><PriceMaster /></RequireAdmin>} />
    <Route path="/admin/buildings" element={<RequireAdmin><BuildingManager /></RequireAdmin>} />
    <Route path="/admin/orders"    element={<RequireAdmin><OrderBatcher /></RequireAdmin>} />
    <Route path="/admin/users"     element={<RequireAdmin><UserRequests /></RequireAdmin>} />

    {/* Master admin only */}
    <Route path="/admin/admins"   element={<RequireMasterAdmin><AdminManager /></RequireMasterAdmin>} />
    <Route path="/admin/settings" element={<RequireMasterAdmin><Settings /></RequireMasterAdmin>} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setShowUpdateBanner(true);
    window.addEventListener("swUpdateReady", handleUpdate);
    return () => window.removeEventListener("swUpdateReady", handleUpdate);
  }, []);

  const handleUpdate = () => {
    setShowUpdateBanner(false);
    navigator.serviceWorker?.ready.then((reg) => {
      reg.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
  };

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <CartProvider>

              {showUpdateBanner && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-brand-700 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
                  <p className="text-sm font-semibold flex-1">🔄 A new version is ready!</p>
                  <button onClick={handleUpdate}
                    className="bg-white text-brand-700 font-bold text-xs px-3 py-1.5 rounded-xl shrink-0">
                    Update Now
                  </button>
                  <button onClick={() => setShowUpdateBanner(false)} className="text-white/70 text-xl leading-none">×</button>
                </div>
              )}

              <AppRoutes />

              <InstallPrompt />

              <Toaster
                position="top-center"
                containerStyle={{ top: showUpdateBanner ? 100 : 60 }}
                toastOptions={{
                  style: {
                    fontFamily: "'Nunito Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "14px",
                    borderRadius: "16px",
                    padding: "12px 16px",
                    maxWidth: "380px",
                  },
                  success: { style: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" } },
                  error:   { style: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }, duration: 7000 },
                }}
              />
            </CartProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
