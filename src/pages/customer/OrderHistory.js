// src/pages/customer/OrderHistory.js
// Shows user's orders with real-time status.
// Within the edit window: allows qty change or full cancel.
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  subscribeUserOrders,
  updateOrderStatus,
  updateOrderItems,
  subscribeSettings,
} from "../../firebase/firestoreService";
import { formatDate } from "../../utils/validation";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-700", icon: "⏳" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700",     icon: "✅" },
  packed:    { label: "Packed",    color: "bg-purple-100 text-purple-700", icon: "📦" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700",   icon: "🎉" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700",       icon: "❌" },
};

// Check if order is within the edit window
const isEditable = (order, windowMinutes) => {
  if (windowMinutes === 0) return false;
  if (order.status !== "pending") return false;
  const placed = (order.createdAt?.seconds ?? 0) * 1000;
  return Date.now() - placed < windowMinutes * 60 * 1000;
};

// Remaining time string
const timeLeft = (order, windowMinutes) => {
  const placed = (order.createdAt?.seconds ?? 0) * 1000;
  const expiresAt = placed + windowMinutes * 60 * 1000;
  const remaining = Math.max(0, expiresAt - Date.now());
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const OrderHistory = () => {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [orders,   setOrders]   = useState([]);
  const [settings, setSettings] = useState({ orderEditWindowMinutes: 15 });
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [editingOrder,  setEditingOrder]  = useState(null);  // id being edited
  const [editItems,     setEditItems]     = useState([]);    // working copy of items
  const [savingEdit,    setSavingEdit]    = useState(false);
  const [, setTick] = useState(0);     // force re-render for timer

  // Countdown ticker
 useEffect(() => {
  const t = setInterval(() => setTick((v) => v + 1), 1000);
  return () => clearInterval(t);
}, [setTick]);
  
  useEffect(() => {
    if (!user) return;
    const unsubOrders = subscribeUserOrders(
      user.uid,
      (data) => { setOrders(data); setLoading(false); },
      (err)  => { setError(err.message); setLoading(false); }
    );
    const unsubSettings = subscribeSettings((s) => setSettings(s));
    return () => { unsubOrders(); unsubSettings(); };
  }, [user]);

  // ── Cancel order ──────────────────────────────────────────
  const handleCancel = async (orderId) => {
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;
    try {
      await updateOrderStatus(orderId, "cancelled");
      toast.success("Order cancelled.");
      if (editingOrder === orderId) setEditingOrder(null);
    } catch (err) { toast.error(err.message); }
  };

  // ── Start editing ─────────────────────────────────────────
  const startEdit = (order) => {
    setEditItems(order.items.map((i) => ({ ...i }))); // deep copy
    setEditingOrder(order.id);
  };

  // ── Qty change in edit mode ───────────────────────────────
  const handleQtyChange = (productId, delta) => {
    setEditItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, qty: Math.max(1, i.qty + delta) }
          : i
      )
    );
  };

  // ── Save edit ─────────────────────────────────────────────
  const handleSaveEdit = async (order) => {
    if (!isEditable(order, settings.orderEditWindowMinutes)) {
      toast.error("Edit window has expired.");
      setEditingOrder(null);
      return;
    }
    setSavingEdit(true);
    try {
      await updateOrderItems(order.id, editItems);
      toast.success("Order updated! ✅");
      setEditingOrder(null);
    } catch (err) { toast.error(err.message); }
    finally { setSavingEdit(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-600 text-xl">←</button>
        <h1 className="font-display font-bold text-gray-900 text-xl">My Orders</h1>
      </div>

      {loading && <LoadingSpinner message="Loading your orders…" />}

      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700 text-sm font-semibold">⚠️ Could not load orders</p>
          <p className="text-red-500 text-xs mt-1">{error}</p>
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="text-center py-20">
          <span className="text-5xl">📦</span>
          <p className="text-gray-500 font-semibold mt-3">No orders yet</p>
          <button onClick={() => navigate("/")}
            className="mt-4 bg-brand-600 text-white font-bold px-6 py-3 rounded-2xl text-sm">
            Shop Now
          </button>
        </div>
      )}

      <div className="px-4 mt-4 space-y-4">
        {orders.map((order) => {
          const s           = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
          const editable    = isEditable(order, settings.orderEditWindowMinutes);
          const isEditing   = editingOrder === order.id;
          const displayItems = isEditing ? editItems : order.items;
          const knownTotal  = displayItems.reduce(
            (sum, i) => (i.price && i.price > 0 ? sum + i.price * i.qty : sum), 0
          );
          const hasMarket = displayItems.some((i) => !i.price || i.price === 0);

          return (
            <div key={order.id} className={`bg-white rounded-2xl shadow-sm p-4 ${editable ? "border-2 border-brand-200" : ""}`}>

              {/* Status + date row */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${s.color}`}>
                  {s.icon} {s.label}
                </span>
                <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
              </div>

              {/* Address */}
              <p className="font-semibold text-gray-800 text-sm mb-1">
                {order.buildingName} · {order.address?.wing ? `Wing ${order.address.wing}, ` : ""}Flat {order.address?.flatNo}
              </p>

              {/* Edit window countdown banner */}
              {editable && !isEditing && (
                <div className="bg-brand-50 border border-brand-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                  <span className="text-brand-600 text-sm">✏️</span>
                  <p className="text-brand-700 text-xs font-semibold flex-1">
                    You can edit or cancel — {timeLeft(order, settings.orderEditWindowMinutes)} remaining
                  </p>
                </div>
              )}

              {/* Items — normal or edit mode */}
              <div className="mb-3 space-y-1">
                {displayItems.map((item, i) => (
                  <div key={item.productId ?? i} className="flex items-center gap-2">
                    <span className="text-base">{item.emoji || ""}</span>
                    <span className="text-xs text-gray-600 flex-1">{item.name}</span>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleQtyChange(item.productId, -1)}
                          className="w-6 h-6 rounded-full border-2 border-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center active:scale-90">−</button>
                        <span className="text-xs font-bold text-gray-800 w-12 text-center">{item.qty} {item.unit}</span>
                        <button onClick={() => handleQtyChange(item.productId, +1)}
                          className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center active:scale-90">+</button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">× {item.qty} {item.unit}</span>
                    )}

                    <span className={`text-xs w-14 text-right ${item.price && item.price > 0 ? "font-semibold text-gray-800" : "text-earth-600 italic"}`}>
                      {item.price && item.price > 0 ? `₹${(item.price * item.qty).toFixed(0)}` : "Market"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total + actions */}
              <div className="border-t border-gray-100 pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-900">
                    {knownTotal > 0 ? `₹${knownTotal.toFixed(0)}` : "—"}
                    {hasMarket && <span className="text-earth-600 font-normal text-xs"> + market</span>}
                  </span>
                </div>

                {/* Edit mode action buttons */}
                {isEditing ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingOrder(null)}
                      className="flex-1 border-2 border-gray-200 text-gray-600 font-bold text-sm py-2 rounded-xl">
                      Cancel Edit
                    </button>
                    <button onClick={() => handleSaveEdit(order)} disabled={savingEdit}
                      className="flex-1 bg-brand-600 text-white font-bold text-sm py-2 rounded-xl disabled:opacity-60">
                      {savingEdit ? "Saving…" : "✅ Save Changes"}
                    </button>
                  </div>
                ) : (
                  editable && (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(order)}
                        className="flex-1 border-2 border-brand-300 text-brand-700 font-bold text-sm py-2 rounded-xl active:scale-95 transition">
                        ✏️ Edit Order
                      </button>
                      <button onClick={() => handleCancel(order.id)}
                        className="flex-1 border-2 border-red-200 text-red-600 font-bold text-sm py-2 rounded-xl active:scale-95 transition">
                        ✕ Cancel
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderHistory;
