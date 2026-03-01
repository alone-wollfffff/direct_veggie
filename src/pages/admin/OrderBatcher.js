// src/pages/admin/OrderBatcher.js
// Groups all orders by building, shows total vegetable load per building.
// Admin can update order statuses, delete individual orders,
// and bulk-delete old completed orders to keep the database lean.
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  subscribeAllOrders,
  updateOrderStatus,
  deleteOrder,
  deleteOldOrders,
  subscribeSettings,
} from "../../firebase/firestoreService";
import { formatDate } from "../../utils/validation";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

const STATUS_OPTIONS = ["pending", "confirmed", "packed", "delivered", "cancelled"];
const STATUS_CONFIG  = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-700", badge: "⏳" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700",     badge: "✅" },
  packed:    { label: "Packed",    color: "bg-purple-100 text-purple-700", badge: "📦" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700",   badge: "🎉" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700",       badge: "❌" },
};

const OrderBatcher = () => {
  const navigate = useNavigate();
  const [orders,       setOrders]       = useState([]);
  const [settings,     setSettings]     = useState({ autoDeleteAfterDays: 3 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [selectedBldg, setSelectedBldg] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [updatingId,   setUpdatingId]   = useState(null);
  const [deletingId,   setDeletingId]   = useState(null);
  const [cleaning,     setCleaning]     = useState(false);

  useEffect(() => {
    const unsubOrders = subscribeAllOrders(
      (data) => { setOrders(data); setLoading(false); },
      (err)  => { setError(err.message); setLoading(false); }
    );
    const unsubSettings = subscribeSettings((s) => setSettings(s));
    return () => { unsubOrders(); unsubSettings(); };
  }, []);

  // ── Count old completed orders ────────────────────────────
  const cutoffMs = Date.now() - settings.autoDeleteAfterDays * 24 * 60 * 60 * 1000;
  const oldOrdersCount = orders.filter((o) => {
    const ts = (o.createdAt?.seconds ?? 0) * 1000;
    return ["delivered", "cancelled"].includes(o.status) && ts < cutoffMs;
  }).length;

  // ── Filter & group orders ─────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "active")    return !["delivered", "cancelled"].includes(o.status);
    if (statusFilter === "all")       return true;
    return o.status === statusFilter;
  });

  const buildingMap = filteredOrders.reduce((acc, order) => {
    const key  = order.buildingId   || "unknown";
    const name = order.buildingName || "Unknown Building";
    if (!acc[key]) acc[key] = { name, orders: [] };
    acc[key].orders.push(order);
    return acc;
  }, {});

  const getTotalLoad = (buildingOrders) => {
    const load = {};
    buildingOrders.forEach((order) => {
      if (order.status === "cancelled") return;
      (order.items || []).forEach((item) => {
        const key = `${item.name}|${item.unit}`;
        if (!load[key]) load[key] = { name: item.name, unit: item.unit, qty: 0 };
        load[key].qty += item.qty || 0;
      });
    });
    return Object.values(load).sort((a, b) => a.name.localeCompare(b.name));
  };

  // ── Actions ───────────────────────────────────────────────

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Status → ${STATUS_CONFIG[newStatus].label}`, { duration: 1500 });
    } catch (err) { toast.error(err.message); }
    finally { setUpdatingId(null); }
  };

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(
      `Delete this order from Flat ${order.address?.flatNo}?\nThis permanently removes it from the database.`
    )) return;
    setDeletingId(order.id);
    try {
      await deleteOrder(order.id);
      toast.success("Order deleted.");
    } catch (err) { toast.error(err.message); }
    finally { setDeletingId(null); }
  };

  const handleCleanOldOrders = async () => {
    if (!window.confirm(
      `Delete ${oldOrdersCount} delivered/cancelled orders older than ${settings.autoDeleteAfterDays} days?\n\nThis cannot be undone.`
    )) return;
    setCleaning(true);
    try {
      const count = await deleteOldOrders(settings.autoDeleteAfterDays);
      toast.success(`🗑️ Deleted ${count} old orders. Database cleaned!`, { duration: 4000 });
    } catch (err) { toast.error(err.message); }
    finally { setCleaning(false); }
  };

  // ── Grand total ───────────────────────────────────────────
  const grandTotal = (() => {
    const load = {};
    filteredOrders.filter((o) => o.status !== "cancelled").forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = `${item.name}|${item.unit}`;
        if (!load[key]) load[key] = { name: item.name, unit: item.unit, qty: 0 };
        load[key].qty += item.qty || 0;
      });
    });
    return Object.values(load).sort((a, b) => a.name.localeCompare(b.name));
  })();

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-600 text-xl">←</button>
        <h1 className="font-display font-bold text-gray-900 text-xl">Order Batcher</h1>
      </div>

      {/* Old orders cleanup banner */}
      {oldOrdersCount > 0 && (
        <div className="mx-4 mt-4 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">🗑️</span>
          <div className="flex-1">
            <p className="font-bold text-orange-800 text-sm">
              {oldOrdersCount} old order{oldOrdersCount > 1 ? "s" : ""} ready to clean up
            </p>
            <p className="text-orange-600 text-xs">
              Delivered/cancelled orders older than {settings.autoDeleteAfterDays} days
            </p>
          </div>
          <button
            onClick={handleCleanOldOrders}
            disabled={cleaning}
            className="bg-orange-500 text-white text-xs font-bold px-3 py-2 rounded-xl shrink-0 disabled:opacity-60"
          >
            {cleaning ? "Cleaning…" : "Clean Up"}
          </button>
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {[
          { value: "active",    label: "Active" },
          { value: "pending",   label: "Pending" },
          { value: "confirmed", label: "Confirmed" },
          { value: "packed",    label: "Packed" },
          { value: "delivered", label: "Delivered" },
          { value: "cancelled", label: "Cancelled" },
          { value: "all",       label: "All" },
        ].map((f) => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition ${
              statusFilter === f.value ? "bg-brand-600 text-white" : "bg-white text-gray-600 border border-gray-200"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner message="Loading orders…" />}
      {error && (
        <div className="mx-4 bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700 text-sm font-semibold">⚠️ {error}</p>
        </div>
      )}

      {/* Grand total load card */}
      {!loading && grandTotal.length > 0 && (
        <div className="mx-4 mt-2 bg-gradient-to-r from-brand-700 to-brand-600 rounded-2xl p-4 text-white">
          <p className="font-display font-black text-lg mb-2">📊 Total Load Today</p>
          <p className="text-brand-200 text-xs mb-3">
            {filteredOrders.filter((o) => o.status !== "cancelled").length} orders across{" "}
            {Object.keys(buildingMap).length} building{Object.keys(buildingMap).length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {grandTotal.map((item) => (
              <div key={item.name} className="bg-white/20 rounded-xl px-3 py-2">
                <p className="font-bold text-sm">{item.name}</p>
                <p className="text-brand-200 text-xs">{item.qty} {item.unit}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Building groups */}
      <div className="px-4 mt-4 space-y-4">
        {Object.entries(buildingMap).map(([bldgId, { name, orders: bOrders }]) => {
          const totalLoad   = getTotalLoad(bOrders);
          const isExpanded  = selectedBldg === bldgId;
          const activeCount = bOrders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;

          return (
            <div key={bldgId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button className="w-full flex items-center gap-3 p-4 text-left"
                onClick={() => setSelectedBldg(isExpanded ? null : bldgId)}>
                <span className="text-2xl">🏢</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-400">{bOrders.length} order{bOrders.length !== 1 ? "s" : ""} · {activeCount} active</p>
                </div>
                <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
              </button>

              {totalLoad.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pb-3">
                  {totalLoad.map((item) => (
                    <span key={item.name} className="bg-brand-100 text-brand-800 text-xs font-bold px-3 py-1 rounded-full">
                      {item.name}: {item.qty} {item.unit}
                    </span>
                  ))}
                </div>
              )}

              {isExpanded && (
                <div className="border-t border-gray-100">
                  {bOrders.map((order) => {
                    const s = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                    return (
                      <div key={order.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">
                              {order.address?.wing ? `Wing ${order.address.wing}, ` : ""}Flat {order.address?.flatNo}
                            </p>
                            <p className="text-xs text-gray-400">{order.customerName} · {order.customerPhone}</p>
                            <p className="text-xs text-gray-300">{formatDate(order.createdAt)}</p>
                          </div>
                          {/* Status dropdown */}
                          <select value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            disabled={updatingId === order.id}
                            className={`text-xs font-bold px-2 py-1 rounded-xl border-0 outline-none cursor-pointer ${s.color}`}>
                            {STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st}>{STATUS_CONFIG[st].label}</option>
                            ))}
                          </select>
                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            disabled={deletingId === order.id}
                            title="Delete this order"
                            className="text-gray-300 hover:text-red-500 transition text-lg ml-1 disabled:opacity-40"
                          >
                            {deletingId === order.id ? "…" : "🗑"}
                          </button>
                        </div>

                        <div className="text-xs text-gray-500 space-y-0.5">
                          {order.items?.map((item, i) => (
                            <p key={i}>{item.emoji || ""} {item.name} × {item.qty} {item.unit}</p>
                          ))}
                        </div>

                        {order.notes && (
                          <p className="text-xs text-earth-700 italic mt-1">📝 {order.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {!loading && Object.keys(buildingMap).length === 0 && (
          <div className="text-center py-16">
            <span className="text-5xl">📦</span>
            <p className="text-gray-400 mt-3 font-semibold">No orders for this filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderBatcher;
