// src/pages/admin/BuildingManager.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { addBuilding, updateBuilding, deleteBuilding } from "../../firebase/firestoreService";
import { validateBuilding } from "../../utils/validation";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

const emptyBuilding = { name: "", address: "", notes: "" };

const BuildingManager = () => {
  const navigate = useNavigate();
  const { buildings, buildingsLoading } = useApp();

  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(emptyBuilding);
  const [errors,     setErrors]     = useState({});
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState("");

  const handleAdd = async () => {
    const { valid, errors: errs } = validateBuilding(form);
    if (!valid) { setErrors(errs); return; }

    setSaving(true);
    try {
      await addBuilding(form);
      toast.success(`"${form.name}" added!`, { icon: "🏢" });
      setForm(emptyBuilding);
      setErrors({});
      setShowForm(false);
    } catch (err) {
      toast.error(err.message, { duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (building) => {
    try {
      await updateBuilding(building.id, { active: !building.active });
      toast.success(building.active ? "Building deactivated" : "Building activated");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (building) => {
    if (!window.confirm(`Remove "${building.name}" from the delivery list? Existing orders won't be affected.`)) return;
    try {
      await deleteBuilding(building.id);
      toast.success(`"${building.name}" removed.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = buildings.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.address?.toLowerCase().includes(search.toLowerCase())
  );

  const active   = filtered.filter((b) => b.active !== false);
  const inactive = filtered.filter((b) => b.active === false);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-600 text-xl">←</button>
        <h1 className="font-display font-bold text-gray-900 text-xl">Building Manager</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          + Add
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-5 animate-slide-up">
          <h2 className="font-display font-bold text-gray-800 mb-4">New Building</h2>
          <div className="space-y-3">
            <div>
              <input
                placeholder="Building / Society name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none ${errors.name ? "border-red-400" : "border-gray-200 focus:border-brand-400"}`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">⚠️ {errors.name}</p>}
            </div>
            <div>
              <input
                placeholder="Locality / Street address *"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none ${errors.address ? "border-red-400" : "border-gray-200 focus:border-brand-400"}`}
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">⚠️ {errors.address}</p>}
            </div>
            <input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-400 text-sm outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowForm(false); setErrors({}); setForm(emptyBuilding); }}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 bg-brand-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60"
              >
                {saving ? "Saving…" : "Add Building"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 mt-4">
        <input
          type="text"
          placeholder="Search buildings…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-400 text-sm outline-none"
        />
      </div>

      <div className="px-4 mt-1">
        <p className="text-xs text-gray-400 mt-2 mb-1">
          ℹ️ Only Active buildings appear in the customer address dropdown. Deactivate to temporarily hide.
        </p>
      </div>

      {buildingsLoading && <LoadingSpinner message="Loading buildings…" />}

      {/* Active buildings */}
      {active.length > 0 && (
        <div className="px-4 mt-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Active ({active.length})
          </h3>
          <div className="space-y-2">
            {active.map((b) => (
              <BuildingRow
                key={b.id}
                building={b}
                onToggle={handleToggleActive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive buildings */}
      {inactive.length > 0 && (
        <div className="px-4 mt-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Deactivated ({inactive.length})
          </h3>
          <div className="space-y-2">
            {inactive.map((b) => (
              <BuildingRow
                key={b.id}
                building={b}
                onToggle={handleToggleActive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {!buildingsLoading && buildings.length === 0 && (
        <div className="text-center py-12">
          <span className="text-5xl">🏢</span>
          <p className="text-gray-400 mt-3">No buildings yet. Add your first delivery location.</p>
        </div>
      )}
    </div>
  );
};

const BuildingRow = ({ building, onToggle, onDelete }) => (
  <div className={`bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 ${!building.active ? "opacity-60" : ""}`}>
    <span className="text-2xl">{building.active !== false ? "🏢" : "🏚"}</span>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-gray-900 text-sm">{building.name}</p>
      <p className="text-xs text-gray-400 truncate">{building.address}</p>
      {building.notes && <p className="text-xs text-gray-400 italic">{building.notes}</p>}
    </div>

    {/* Active toggle */}
    <button
      onClick={() => onToggle(building)}
      className={`shrink-0 w-10 h-6 rounded-full transition-colors ${building.active !== false ? "bg-brand-500" : "bg-gray-300"}`}
      title={building.active !== false ? "Deactivate" : "Activate"}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${building.active !== false ? "translate-x-4" : ""}`} />
    </button>

    <button
      onClick={() => onDelete(building)}
      className="text-red-400 text-lg ml-1"
      title="Delete building"
    >
      🗑
    </button>
  </div>
);

export default BuildingManager;
