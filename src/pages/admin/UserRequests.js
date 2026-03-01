// src/pages/admin/UserRequests.js
// Tabs: Pending | Approved | Blocked
//
// PENDING actions:
//   ✅ Approve    — grants shop access
//   ❌ Reject     — DELETES the user profile permanently (they vanish, no rejected section)
//
// APPROVED actions:
//   ⚠️ Revoke     — removes approval, sends back to pending
//   🚫 Block      — blocks account, user cannot log in
//
// BLOCKED actions:
//   🔓 Unblock   — removes block, sends back to pending for re-approval
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  subscribeAllUsers,
  approveUser,
  rejectUser,
  revokeUser,
  blockUser,
  unblockUser,
} from "../../firebase/firestoreService";
import { formatDate } from "../../utils/validation";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

const UserRequests = () => {
  const navigate               = useNavigate();
  const [users,    setUsers]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState(null);
  const [tab,      setTab]     = useState("pending");
  const [actingOn, setActingOn]= useState(null);

  useEffect(() => {
    const unsub = subscribeAllUsers(
      (data) => { setUsers(data); setLoading(false); },
      (err)  => { setError(err.message); setLoading(false); }
    );
    return unsub;
  }, []);

  const pending  = users.filter((u) => !u.isApproved && !u.isBlocked);
  const approved = users.filter((u) =>  u.isApproved && !u.isBlocked);
  const blocked  = users.filter((u) =>  u.isBlocked);
  const displayed = tab === "pending" ? pending : tab === "approved" ? approved : blocked;

  // ── Actions ───────────────────────────────────────────────

  const handleApprove = async (u) => {
    setActingOn(u.id);
    try {
      await approveUser(u.id);
      toast.success(`✅ ${u.name || u.email} approved!`);
    } catch (err) { toast.error(err.message); }
    finally { setActingOn(null); }
  };

  // Reject = permanently delete the user profile from Firestore
  const handleReject = async (u) => {
    if (!window.confirm(
      `Reject "${u.name || u.email}"?\n\nTheir account will be permanently deleted. They can sign up again if they want.`
    )) return;
    setActingOn(u.id);
    try {
      await rejectUser(u.id);
      toast.success(`❌ ${u.name || u.email}'s request rejected and removed.`);
    } catch (err) { toast.error(err.message); }
    finally { setActingOn(null); }
  };

  const handleRevoke = async (u) => {
    if (!window.confirm(`Revoke access for ${u.name || u.email}?\nThey'll need re-approval to order again.`)) return;
    setActingOn(u.id);
    try {
      await revokeUser(u.id);
      toast.success(`Access revoked for ${u.name || u.email}.`);
    } catch (err) { toast.error(err.message); }
    finally { setActingOn(null); }
  };

  const handleBlock = async (u) => {
    if (!window.confirm(
      `Block "${u.name || u.email}"?\n\nThey cannot log in until unblocked.`
    )) return;
    setActingOn(u.id);
    try {
      await blockUser(u.id);
      toast.success(`🚫 ${u.name || u.email} blocked.`);
    } catch (err) { toast.error(err.message); }
    finally { setActingOn(null); }
  };

  const handleUnblock = async (u) => {
    setActingOn(u.id);
    try {
      await unblockUser(u.id);
      toast.success(`🔓 ${u.name || u.email} unblocked. Moved back to Pending.`);
    } catch (err) { toast.error(err.message); }
    finally { setActingOn(null); }
  };

  const tabs = [
    { key: "pending",  label: "Pending",  count: pending.length,  activeColor: "text-amber-600 border-amber-500" },
    { key: "approved", label: "Approved", count: approved.length, activeColor: "text-green-600 border-green-500" },
    { key: "blocked",  label: "Blocked",  count: blocked.length,  activeColor: "text-red-600 border-red-400" },
  ];

  const EMPTY = {
    pending:  { icon: "🎉", title: "No pending requests",   sub: "All accounts are verified, or no one has signed up yet." },
    approved: { icon: "👥", title: "No approved users yet", sub: "Approve pending users to see them here." },
    blocked:  { icon: "🔓", title: "No blocked users",      sub: "Blocked users will appear here." },
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-600 text-xl leading-none">←</button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-gray-900 text-xl">User Requests</h1>
          <p className="text-gray-400 text-xs">Manage customer account access</p>
        </div>
        {pending.length > 0 && (
          <span className="bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
            {pending.length}
          </span>
        )}
      </div>

      {/* Info banner — explains what Reject does */}
      {tab === "pending" && pending.length > 0 && (
        <div className="mx-4 mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-3 flex gap-2">
          <span className="text-lg shrink-0">ℹ️</span>
          <p className="text-blue-700 text-xs leading-relaxed">
            <strong>Approve</strong> grants shop access.{" "}
            <strong>Reject</strong> permanently deletes their request — they disappear from the list and can sign up again if needed.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 px-4 mt-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition flex items-center justify-center gap-2 ${
              tab === t.key ? t.activeColor : "border-transparent text-gray-400"
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className="text-xs font-black px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-3">
          <p className="text-red-700 text-sm">⚠️ {error}</p>
        </div>
      )}

      {loading && <LoadingSpinner message="Loading users…" />}

      {!loading && displayed.length === 0 && (
        <div className="text-center py-16 px-6">
          <div className="text-5xl mb-3">{EMPTY[tab].icon}</div>
          <p className="font-display font-bold text-gray-700 text-lg">{EMPTY[tab].title}</p>
          <p className="text-gray-400 text-sm mt-1">{EMPTY[tab].sub}</p>
        </div>
      )}

      <div className="px-4 mt-4 space-y-3">
        {displayed.map((u) => (
          <div key={u.id} className={`bg-white rounded-2xl shadow-sm p-4 ${
            u.isBlocked ? "border-l-4 border-red-400" : ""
          }`}>

            {/* User info row */}
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-black text-lg ${
                u.isBlocked ? "bg-red-100 text-red-600" : "bg-brand-100 text-brand-700"
              }`}>
                {u.isBlocked ? "🚫" : (u.name || u.email || "?")[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-gray-900 truncate">
                  {u.name || <span className="italic text-gray-400">No name</span>}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{u.email}</p>

                {u.phone ? (
                  <a href={`tel:${u.phone}`}
                    className="inline-flex items-center gap-1.5 mt-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                    📞 {u.phone}
                    <span className="text-green-500 font-normal">Tap to call</span>
                  </a>
                ) : (
                  <p className="text-xs text-gray-300 mt-1 italic">No phone provided</p>
                )}

                <p className="text-xs text-gray-300 mt-1.5">Registered {formatDate(u.createdAt)}</p>
                {u.approvedAt && <p className="text-xs text-green-500">Approved {formatDate(u.approvedAt)}</p>}
                {u.blockedAt  && <p className="text-xs text-red-400">Blocked {formatDate(u.blockedAt)}</p>}
                {u.revokedAt  && <p className="text-xs text-orange-400">Revoked {formatDate(u.revokedAt)}</p>}
              </div>

              <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                u.isBlocked  ? "bg-red-100 text-red-700"     :
                u.isApproved ? "bg-green-100 text-green-700" :
                               "bg-amber-100 text-amber-700"
              }`}>
                {u.isBlocked ? "🚫 Blocked" : u.isApproved ? "✅ Active" : "⏳ Pending"}
              </span>
            </div>

            {/* Action buttons */}
            <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2 flex-wrap">

              {/* ── PENDING: Call + Approve + Reject ── */}
              {tab === "pending" && (
                <>
                  {u.phone && (
                    <a href={`tel:${u.phone}`}
                      className="flex-1 border-2 border-blue-200 text-blue-700 font-bold text-sm py-2.5 rounded-xl text-center min-w-[60px]">
                      📞 Call
                    </a>
                  )}
                  <button onClick={() => handleApprove(u)} disabled={actingOn === u.id}
                    className="flex-1 bg-brand-600 text-white font-bold text-sm py-2.5 rounded-xl active:scale-95 transition disabled:opacity-60 min-w-[80px]">
                    {actingOn === u.id ? "…" : "✅ Approve"}
                  </button>
                  <button onClick={() => handleReject(u)} disabled={actingOn === u.id}
                    className="flex-1 border-2 border-red-300 text-red-600 font-bold text-sm py-2.5 rounded-xl active:scale-95 transition disabled:opacity-60 min-w-[80px]">
                    {actingOn === u.id ? "…" : "❌ Reject"}
                  </button>
                </>
              )}

              {/* ── APPROVED: Revoke + Block ── */}
              {tab === "approved" && (
                <>
                  <button onClick={() => handleRevoke(u)} disabled={actingOn === u.id}
                    className="flex-1 border-2 border-orange-200 text-orange-600 font-bold text-sm py-2.5 rounded-xl active:scale-95 transition disabled:opacity-60">
                    {actingOn === u.id ? "…" : "⚠️ Revoke Access"}
                  </button>
                  <button onClick={() => handleBlock(u)} disabled={actingOn === u.id}
                    className="flex-1 border-2 border-red-300 text-red-600 font-bold text-sm py-2.5 rounded-xl active:scale-95 transition disabled:opacity-60">
                    {actingOn === u.id ? "…" : "🚫 Block"}
                  </button>
                </>
              )}

              {/* ── BLOCKED: Unblock only ── */}
              {tab === "blocked" && (
                <button onClick={() => handleUnblock(u)} disabled={actingOn === u.id}
                  className="flex-1 bg-brand-600 text-white font-bold text-sm py-2.5 rounded-xl active:scale-95 transition disabled:opacity-60">
                  {actingOn === u.id ? "…" : "🔓 Unblock (sends to Pending)"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserRequests;