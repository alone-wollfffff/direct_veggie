// src/pages/admin/AdminDashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { subscribeAllOrders, subscribeAllUsers } from "../../firebase/firestoreService";
import { formatDate } from "../../utils/validation";

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  packed:    { label: "Packed",    color: "bg-purple-100 text-purple-700" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

const AdminDashboard = () => {
  const { user, isMasterAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [orders,        setOrders]        = useState([]);
  const [users,         setUsers]         = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    const unsubOrders = subscribeAllOrders(
      (data) => { setOrders(data); setOrdersLoading(false); },
      ()     => setOrdersLoading(false)
    );
    const unsubUsers = subscribeAllUsers(
      (data) => setUsers(data),
      ()     => {}
    );
    return () => { unsubOrders(); unsubUsers(); };
  }, []);

  const pendingUsers  = users.filter((u) => !u.isApproved && !u.isBlocked);
  const blockedUsers  = users.filter((u) => u.isBlocked);

  const stats = {
    today: orders.filter((o) => {
      const d = o.createdAt?.toDate?.() ?? new Date((o.createdAt?.seconds ?? 0) * 1000);
      return d.toDateString() === new Date().toDateString();
    }).length,
    pending:   orders.filter((o) => o.status === "pending").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    total:     orders.length,
  };

  const adminCards = [
    {
      icon: "💰", title: "Daily Price Master",
      desc: "Update today's prices, stock & emojis",
      path: "/admin/prices", badge: null,
    },
    {
      icon: "🏢", title: "Building Manager",
      desc: "Add / remove delivery buildings",
      path: "/admin/buildings", badge: null,
    },
    {
      icon: "📦", title: "Order Batcher",
      desc: "Group orders, update status, clean up old orders",
      path: "/admin/orders",
      badge: stats.pending > 0 ? stats.pending : null,
      badgeColor: "bg-yellow-500",
    },
    {
      icon: "👥", title: "User Requests",
      desc: "Approve, revoke or block customer accounts",
      path: "/admin/users",
      badge: pendingUsers.length > 0 ? pendingUsers.length : null,
      badgeColor: "bg-red-500",
    },
    ...(isMasterAdmin ? [
      {
        icon: "🔐", title: "Manage Admins",
        desc: "Add or remove admin access",
        path: "/admin/admins",
        badge: null, highlight: true,
      },
      {
        icon: "⚙️", title: "App Settings",
        desc: "Order edit window, auto-delete rules",
        path: "/admin/settings",
        badge: null, highlight: true,
      },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-600 px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-display font-black text-2xl">Admin Panel 🥬</h1>
              {isMasterAdmin && (
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">👑 Master</span>
              )}
            </div>
            
            <p className="text-brand-200 text-xs mt-0.5">{user?.name || "Admin"}</p>
          </div>
          <button onClick={logout}
            className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-semibold">
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 px-4 -mt-4">
        {[
          { label: "Today's Orders",  value: stats.today },
          { label: "Pending Orders",  value: stats.pending },
          { label: "Delivered",       value: stats.delivered },
          { label: "Pending Users",   value: pendingUsers.length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-black text-gray-900">{ordersLoading ? "…" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Pending-user alert */}
      {pendingUsers.length > 0 && (
        <button onClick={() => navigate("/admin/users")}
          className="mx-4 mt-4 w-[calc(100%-2rem)] bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center gap-3 text-left active:scale-95 transition">
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-sm">
              {pendingUsers.length} customer{pendingUsers.length > 1 ? "s" : ""} waiting for approval
            </p>
            <p className="text-amber-600 text-xs">Tap to review and approve</p>
          </div>
          <span className="text-amber-400 text-xl">›</span>
        </button>
      )}

      {/* Blocked users notice */}
      {blockedUsers.length > 0 && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2">
          <span className="text-lg">🚫</span>
          <p className="text-red-700 text-xs font-semibold flex-1">
            {blockedUsers.length} blocked user{blockedUsers.length > 1 ? "s" : ""}
          </p>
          <button onClick={() => navigate("/admin/users")} className="text-red-600 text-xs font-bold">View →</button>
        </div>
      )}

      {/* Nav cards */}
      <div className="px-4 mt-5">
        <h2 className="font-display font-bold text-gray-500 text-xs uppercase tracking-widest mb-3">Manage</h2>
        <div className="space-y-3">
          {adminCards.map((card) => (
            <button key={card.path} onClick={() => navigate(card.path)}
              className={`w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 text-left hover:shadow-md transition active:scale-98 ${
                card.highlight ? "border-2 border-purple-200" : ""
              }`}>
              <span className="text-3xl">{card.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-gray-900">{card.title}</p>
                <p className="text-gray-400 text-xs">{card.desc}</p>
              </div>
              {card.badge && (
                <span className={`${card.badgeColor || "bg-gray-400"} text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shrink-0`}>
                  {card.badge}
                </span>
              )}
              <span className="text-gray-300 text-xl">›</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div className="px-4 mt-6">
        <h2 className="font-display font-bold text-gray-500 text-xs uppercase tracking-widest mb-3">Recent Orders</h2>
        {ordersLoading ? (
          <p className="text-gray-400 text-sm text-center py-4">Loading…</p>
        ) : orders.slice(0, 5).length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map((order) => {
              const s = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
              return (
                <div key={order.id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${s.color}`}>{s.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {order.buildingName} – Flat {order.address?.flatNo}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{order.items?.length} items</span>
                </div>
              );
            })}
            <button onClick={() => navigate("/admin/orders")} className="w-full text-center text-brand-600 text-sm font-semibold py-2">
              View All Orders →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
