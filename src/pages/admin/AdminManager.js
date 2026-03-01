// src/pages/admin/AdminManager.js
// ─────────────────────────────────────────────────────────────
//  Master-admin only page.
//  • Shows all current admins
//  • Add new admin: phone + name + password (no OTP needed for them)
//  • Remove non-master admins
//  • Master admin has a crown badge and cannot be removed
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  subscribeAllAdmins,
  addAdmin,
  removeAdmin,
} from "../../firebase/firestoreService";
import { formatDate } from "../../utils/validation";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

const AdminManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [admins,   setAdmins]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [actingOn, setActingOn] = useState(null);

  // Add form state
  const [showForm,  setShowForm]  = useState(false);
  const [newPhone,  setNewPhone]  = useState("");
  const [newName,   setNewName]   = useState("");
  const [newPass,   setNewPass]   = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [adding,    setAdding]    = useState(false);
  const [formErr,   setFormErr]   = useState({});

  useEffect(() => {
    const unsub = subscribeAllAdmins(
      (data) => { setAdmins(data); setLoading(false); },
      (err)  => { setError(err.message); setLoading(false); }
    );
    return unsub;
  }, []);

  // ── Add new admin ─────────────────────────────────────────
  const handleAdd = async () => {
    const e = {};
    if (!newName.trim())                               e.name  = "Name is required.";
    if (!newPhone.trim())                              e.phone = "Phone number is required.";
    else if (newPhone.replace(/\D/g, "").length !== 10) e.phone = "Enter a valid 10-digit number.";
    if (!newPass)                                      e.pass  = "Password is required.";
    else if (newPass.length < 8)                       e.pass  = "Password must be at least 8 characters.";
    if (Object.keys(e).length) { setFormErr(e); return; }
    setFormErr({});
    setAdding(true);

    const formatted = `+91${newPhone.replace(/\D/g, "")}`;
    try {
      await addAdmin(formatted, newName.trim(), newPass);
      toast.success(`✅ ${newName.trim()} added as admin! Share their password with them.`);
      setNewPhone(""); setNewName(""); setNewPass(""); setShowForm(false);
    } catch (err) {
      toast.error(err.message, { duration: 6000 });
    } finally {
      setAdding(false);
    }
  };

  // ── Remove admin ──────────────────────────────────────────
  const handleRemove = async (admin) => {
    if (admin.isMaster) { toast.error("The master admin cannot be removed."); return; }
    if (!window.confirm(
      `Remove ${admin.name} (${admin.phone}) as admin?\n\nThey will lose access immediately.`
    )) return;

    setActingOn(admin.phone);
    try {
      await removeAdmin(admin.phone, admin.isMaster);
      toast.success(`${admin.name} removed from admins.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActingOn(null);
    }
  };

  const inputCls = (err) =>
    `w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition
     ${err ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-brand-500"}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-600 text-xl leading-none">←</button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-gray-900 text-xl leading-tight">Manage Admins</h1>
          <p className="text-gray-400 text-xs">Add or remove admin access</p>
        </div>
        <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-full">
          Master Admin
        </span>
      </div>

      {/* Info banner */}
      <div className="mx-4 mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-blue-800 text-sm font-semibold mb-1">ℹ️ How admin login works</p>
        <p className="text-blue-600 text-xs leading-relaxed">
          When you add an admin here, a login account is created for them. You set their password — share it with them securely.
          They log in using their <strong>phone number + password</strong> (no OTP needed, saving SMS costs).
          Only the <strong>Master Admin (👑)</strong> can add or remove other admins.
        </p>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700 text-sm">⚠️ {error}</p>
        </div>
      )}

      {loading && <LoadingSpinner message="Loading admins…" />}

      {!loading && (
        <div className="px-4 mt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-gray-500 text-xs uppercase tracking-widest">
              Current Admins ({admins.length})
            </h2>
            <button
              onClick={() => { setShowForm((v) => !v); setFormErr({}); }}
              className="bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1"
            >
              {showForm ? "✕ Cancel" : "+ Add Admin"}
            </button>
          </div>

          {/* ── Add form ───────────────────────────────────── */}
          {showForm && (
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border-2 border-brand-200">
              <p className="font-display font-bold text-gray-800 text-sm mb-3">New Admin Account</p>

              {/* Name */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input type="text" placeholder="e.g. Rahul Sharma"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setFormErr((p) => ({ ...p, name: "" })); }}
                  className={inputCls(formErr.name)}
                />
                {formErr.name && <p className="text-red-500 text-xs mt-1">⚠️ {formErr.name}</p>}
              </div>

              {/* Phone */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="bg-gray-100 px-3 py-3 rounded-xl text-xs font-semibold text-gray-600 whitespace-nowrap">
                    🇮🇳 +91
                  </div>
                  <input type="tel" placeholder="9876543210"
                    value={newPhone}
                    onChange={(e) => { setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setFormErr((p) => ({ ...p, phone: "" })); }}
                    maxLength={10}
                    className={inputCls(formErr.phone)}
                  />
                </div>
                {formErr.phone && <p className="text-red-500 text-xs mt-1">⚠️ {formErr.phone}</p>}
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Login Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={newPass}
                    onChange={(e) => { setNewPass(e.target.value); setFormErr((p) => ({ ...p, pass: "" })); }}
                    className={inputCls(formErr.pass)}
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
                {formErr.pass && <p className="text-red-500 text-xs mt-1">⚠️ {formErr.pass}</p>}
                <p className="text-amber-600 text-xs mt-1.5 bg-amber-50 px-2 py-1 rounded-lg">
                  ⚠️ Share this password with the new admin securely (WhatsApp/call). You cannot view it later.
                </p>
              </div>

              <button onClick={handleAdd} disabled={adding}
                className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl transition active:scale-95 disabled:opacity-60">
                {adding ? "Creating Admin Account…" : "✅ Create Admin Account"}
              </button>
            </div>
          )}

          {/* ── Admin cards ────────────────────────────────── */}
          <div className="space-y-3">
            {admins.map((admin) => {
              const isCurrentUser = user?.email?.startsWith(
                admin.phone?.replace(/\D/g, "") || "__"
              );
              return (
                <div key={admin.phone}
                  className={`bg-white rounded-2xl shadow-sm p-4 ${admin.isMaster ? "border-2 border-purple-200" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-black text-lg ${
                      admin.isMaster ? "bg-purple-100 text-purple-700" : "bg-brand-100 text-brand-700"
                    }`}>
                      {admin.isMaster ? "👑" : (admin.name || "?")[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display font-bold text-gray-900 truncate">{admin.name}</p>
                        {admin.isMaster && (
                          <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full shrink-0">
                            👑 Master
                          </span>
                        )}
                        {isCurrentUser && (
                          <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      <a href={`tel:${admin.phone}`}
                        className="text-xs text-brand-600 font-semibold mt-0.5 flex items-center gap-1">
                        📞 {admin.phone}
                      </a>
                      {admin.createdAt && (
                        <p className="text-xs text-gray-300 mt-0.5">Added {formatDate(admin.createdAt)}</p>
                      )}
                    </div>

                    {!admin.isMaster ? (
                      <button
                        onClick={() => handleRemove(admin)}
                        disabled={actingOn === admin.phone}
                        className="shrink-0 border-2 border-red-200 text-red-500 text-xs font-bold px-3 py-1.5 rounded-xl transition active:scale-95 disabled:opacity-50">
                        {actingOn === admin.phone ? "…" : "Remove"}
                      </button>
                    ) : (
                      <span className="shrink-0 text-xs text-gray-400 italic">Protected</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {admins.length === 0 && !loading && (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">No admins found. Something went wrong.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminManager;
