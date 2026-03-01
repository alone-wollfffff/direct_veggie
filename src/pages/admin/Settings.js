// src/pages/admin/Settings.js
// Master admin only — configure app-wide settings.
//   • Order edit/cancel window (minutes)
//   • Auto-delete old orders (days)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSettings, updateSettings } from "../../firebase/firestoreService";
import toast from "react-hot-toast";

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ orderEditWindowMinutes: 15, autoDeleteAfterDays: 3 });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    getSettings().then((s) => { setSettings(s); setLoading(false); });
  }, []);

  const handleSave = async () => {
    // Validate
    const editMins = Number(settings.orderEditWindowMinutes);
    const delDays  = Number(settings.autoDeleteAfterDays);
    if (isNaN(editMins) || editMins < 0 || editMins > 120) {
      toast.error("Edit window must be between 0 and 120 minutes."); return;
    }
    if (isNaN(delDays) || delDays < 1 || delDays > 30) {
      toast.error("Auto-delete window must be between 1 and 30 days."); return;
    }
    setSaving(true);
    try {
      await updateSettings({ orderEditWindowMinutes: editMins, autoDeleteAfterDays: delDays });
      toast.success("✅ Settings saved!");
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const inp = "w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-400 text-sm outline-none";

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-600 text-xl">←</button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-gray-900 text-xl">App Settings</h1>
          <p className="text-gray-400 text-xs">Master admin only</p>
        </div>
        <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-full">👑 Master</span>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading settings…</div>
      ) : (
        <div className="px-4 mt-6 space-y-5">

          {/* Order edit window */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">✏️</span>
              <div>
                <h2 className="font-display font-bold text-gray-900">Order Edit Window</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  How long customers can modify or cancel their order after placing it.
                  Set to 0 to disable editing entirely.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="number" min="0" max="120" value={settings.orderEditWindowMinutes}
                onChange={(e) => setSettings({ ...settings, orderEditWindowMinutes: e.target.value })}
                className={inp + " flex-1"} />
              <span className="text-gray-500 text-sm font-semibold shrink-0">minutes</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[5, 10, 15, 30, 60].map((m) => (
                <button key={m}
                  onClick={() => setSettings({ ...settings, orderEditWindowMinutes: m })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition ${
                    Number(settings.orderEditWindowMinutes) === m
                      ? "bg-brand-600 text-white border-brand-600"
                      : "border-gray-200 text-gray-600"
                  }`}>
                  {m} min
                </button>
              ))}
              <button
                onClick={() => setSettings({ ...settings, orderEditWindowMinutes: 0 })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition ${
                  Number(settings.orderEditWindowMinutes) === 0
                    ? "bg-red-500 text-white border-red-500"
                    : "border-gray-200 text-gray-600"
                }`}>
                Disable
              </button>
            </div>
            {Number(settings.orderEditWindowMinutes) === 0 && (
              <p className="text-xs text-red-500 mt-2">⚠️ Customers cannot edit or cancel orders once placed.</p>
            )}
          </div>

          {/* Auto-delete window */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">🗑️</span>
              <div>
                <h2 className="font-display font-bold text-gray-900">Order Auto-Delete Window</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  Delivered and cancelled orders older than this many days are shown as
                  "ready to clean up" in the Order Batcher. You still manually trigger the cleanup.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="number" min="1" max="30" value={settings.autoDeleteAfterDays}
                onChange={(e) => setSettings({ ...settings, autoDeleteAfterDays: e.target.value })}
                className={inp + " flex-1"} />
              <span className="text-gray-500 text-sm font-semibold shrink-0">days</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 7, 14].map((d) => (
                <button key={d}
                  onClick={() => setSettings({ ...settings, autoDeleteAfterDays: d })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition ${
                    Number(settings.autoDeleteAfterDays) === d
                      ? "bg-brand-600 text-white border-brand-600"
                      : "border-gray-200 text-gray-600"
                  }`}>
                  {d} day{d > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-brand-600 text-white font-bold py-4 rounded-2xl active:scale-95 transition disabled:opacity-60 text-base">
            {saving ? "Saving…" : "💾 Save Settings"}
          </button>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-blue-800 text-sm font-semibold mb-1">ℹ️ How these settings work</p>
            <p className="text-blue-600 text-xs leading-relaxed">
              <strong>Edit window:</strong> After placing an order, customers see an "Edit Order" button
              for the duration you set. After that, the button disappears and they must contact you directly.
              <br /><br />
              <strong>Auto-delete:</strong> Old orders are flagged in the Order Batcher. You press "Clean Up"
              to actually delete them. Nothing is deleted automatically without your action.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
