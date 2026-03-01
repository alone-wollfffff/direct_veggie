// src/components/customer/AddressSelector.js
// ─────────────────────────────────────────────────────────────
//  Amazon-style address selector:
//  • Saved addresses stored in localStorage (browser only, not Firestore)
//  • User can save up to 5 addresses and reuse them
//  • Select a saved address to auto-fill the form
//  • Option to delete saved addresses
//  • Building must always be selected from admin's list
// ─────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../../contexts/AppContext";

const SAVED_ADDRESSES_KEY = "vd_saved_addresses";
const MAX_SAVED = 5;

// ── localStorage helpers ──────────────────────────────────────
const loadSavedAddresses = () => {
  try {
    const raw = localStorage.getItem(SAVED_ADDRESSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persistAddresses = (list) => {
  try {
    localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(list));
  } catch {
    // Storage full — non-critical
  }
};

// ── Main component ────────────────────────────────────────────
const AddressSelector = ({ value = {}, onChange, errors = {} }) => {
  const { activeBuildings, buildingsLoading } = useApp();

  // Building dropdown
  const [search,  setSearch]  = useState("");
  const [open,    setOpen]    = useState(false);
  const dropdownRef = useRef(null);

  // Saved addresses panel
  const [savedAddresses, setSavedAddresses]   = useState(loadSavedAddresses);
  const [showSaved,      setShowSaved]         = useState(false);
  const [showSaveForm,   setShowSaveForm]       = useState(false);
  const [saveLabel,      setSaveLabel]          = useState("");

  // Close building dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedBuilding = activeBuildings.find((b) => b.id === value.buildingId);

  const filtered = activeBuildings.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.address?.toLowerCase().includes(search.toLowerCase())
  );

  const handleBuildingSelect = (building) => {
    onChange({ ...value, buildingId: building.id });
    setSearch("");
    setOpen(false);
  };

  const handleField = (field) => (e) =>
    onChange({ ...value, [field]: e.target.value });

  // ── Apply a saved address ────────────────────────────────────
  const applyAddress = (saved) => {
    // Verify building still exists
    const building = activeBuildings.find((b) => b.id === saved.buildingId);
    if (!building) {
      alert("The building in this saved address is no longer available. Please select another.");
      return;
    }
    onChange({
      buildingId: saved.buildingId,
      wing:       saved.wing       || "",
      flatNo:     saved.flatNo     || "",
      landmark:   saved.landmark   || "",
    });
    setShowSaved(false);
  };

  // ── Save current address ─────────────────────────────────────
  const saveCurrentAddress = () => {
    if (!value.buildingId) {
      alert("Please select a building first before saving.");
      return;
    }
    if (!value.flatNo?.trim()) {
      alert("Please enter your flat/door number before saving.");
      return;
    }
    const label = saveLabel.trim() || `${selectedBuilding?.name || "Address"} – ${value.flatNo}`;
    const newEntry = {
      id:         Date.now().toString(),
      label,
      buildingId: value.buildingId,
      wing:       value.wing     || "",
      flatNo:     value.flatNo   || "",
      landmark:   value.landmark || "",
      savedAt:    new Date().toISOString(),
    };
    const updated = [newEntry, ...savedAddresses].slice(0, MAX_SAVED);
    setSavedAddresses(updated);
    persistAddresses(updated);
    setShowSaveForm(false);
    setSaveLabel("");
  };

  // ── Delete a saved address ────────────────────────────────────
  const deleteAddress = (id) => {
    const updated = savedAddresses.filter((a) => a.id !== id);
    setSavedAddresses(updated);
    persistAddresses(updated);
  };

  const isFormFilled = !!(value.buildingId && value.flatNo?.trim());
  const isAlreadySaved = savedAddresses.some(
    (a) => a.buildingId === value.buildingId && a.flatNo === value.flatNo
  );

  return (
    <div className="space-y-4">

      {/* ── Saved Addresses Panel ─────────────────────────── */}
      {savedAddresses.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowSaved(!showSaved)}
            className="w-full flex items-center justify-between bg-brand-50 border-2 border-brand-200 rounded-xl px-4 py-3 transition hover:bg-brand-100"
          >
            <span className="text-sm font-bold text-brand-700 flex items-center gap-2">
              📍 Use a Saved Address
              <span className="bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {savedAddresses.length}
              </span>
            </span>
            <span className="text-brand-400 text-sm">{showSaved ? "▲" : "▼"}</span>
          </button>

          {showSaved && (
            <div className="mt-2 space-y-2 animate-slide-up">
              {savedAddresses.map((saved) => {
                const bldg = activeBuildings.find((b) => b.id === saved.buildingId);
                const isUnavailable = !bldg;
                return (
                  <div
                    key={saved.id}
                    className={`bg-white border-2 rounded-xl p-3 flex items-start gap-3 ${
                      isUnavailable ? "border-gray-200 opacity-50" : "border-gray-100 hover:border-brand-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{saved.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isUnavailable
                          ? "⚠️ Building no longer available"
                          : `🏢 ${bldg.name}${saved.wing ? ` · ${saved.wing}` : ""} · Flat ${saved.flatNo}`
                        }
                      </p>
                      {saved.landmark && (
                        <p className="text-xs text-gray-400">{saved.landmark}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!isUnavailable && (
                        <button
                          type="button"
                          onClick={() => applyAddress(saved)}
                          className="bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition"
                        >
                          Use
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteAddress(saved.id)}
                        className="text-red-400 text-xs font-semibold px-2 py-1.5 rounded-lg hover:bg-red-50 transition"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Building Dropdown ─────────────────────────────── */}
      <div ref={dropdownRef} className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Building / Society <span className="text-red-500">*</span>
        </label>
        <div
          onClick={() => !buildingsLoading && setOpen(!open)}
          className={`
            w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 cursor-pointer transition
            ${errors.buildingId
              ? "border-red-400 bg-red-50"
              : selectedBuilding
              ? "border-brand-500 bg-brand-50"
              : "border-gray-200 bg-white"
            }
          `}
        >
          <span className={`text-sm font-medium ${selectedBuilding ? "text-brand-800" : "text-gray-400"}`}>
            {buildingsLoading
              ? "Loading buildings…"
              : selectedBuilding
              ? `🏢 ${selectedBuilding.name}`
              : "Select your building"}
          </span>
          <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
        </div>

        {open && (
          <div className="absolute z-50 mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 w-full overflow-hidden animate-slide-up">
            <div className="p-3 border-b border-gray-100">
              <input
                autoFocus
                type="text"
                placeholder="Search building name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-brand-400"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">
                  No buildings found. Contact admin to add yours.
                </p>
              ) : (
                filtered.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => handleBuildingSelect(b)}
                    className="px-4 py-3 cursor-pointer hover:bg-brand-50 transition flex items-start gap-2"
                  >
                    <span className="text-lg mt-0.5">🏢</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{b.name}</p>
                      {b.address && <p className="text-xs text-gray-400">{b.address}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {errors.buildingId && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <span>⚠️</span> {errors.buildingId}
          </p>
        )}
      </div>

      {/* ── Wing / Block ──────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Wing / Block <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. A, B, East Wing"
          value={value.wing || ""}
          onChange={handleField("wing")}
          maxLength={10}
          className={`w-full px-4 py-3 rounded-xl border-2 text-sm transition outline-none ${
            errors.wing ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-brand-400"
          }`}
        />
        {errors.wing && <p className="text-red-500 text-xs mt-1">⚠️ {errors.wing}</p>}
      </div>

      {/* ── Flat No ──────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Flat / Door No. <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. 302, B-201, Ground Floor Shop"
          value={value.flatNo || ""}
          onChange={handleField("flatNo")}
          maxLength={20}
          className={`w-full px-4 py-3 rounded-xl border-2 text-sm transition outline-none ${
            errors.flatNo ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-brand-400"
          }`}
        />
        {errors.flatNo && <p className="text-red-500 text-xs mt-1">⚠️ {errors.flatNo}</p>}
      </div>

      {/* ── Landmark ─────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Landmark <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Near elevator, Blue door"
          value={value.landmark || ""}
          onChange={handleField("landmark")}
          maxLength={80}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-400 text-sm outline-none transition"
        />
      </div>

      {/* ── Save Address button ───────────────────────────── */}
      {isFormFilled && !isAlreadySaved && savedAddresses.length < MAX_SAVED && (
        <div>
          {!showSaveForm ? (
            <button
              type="button"
              onClick={() => setShowSaveForm(true)}
              className="text-brand-600 text-sm font-semibold flex items-center gap-1.5 hover:text-brand-700 transition"
            >
              💾 Save this address for future orders
            </button>
          ) : (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 space-y-3 animate-slide-up">
              <p className="text-sm font-bold text-brand-800">Save Address</p>
              <input
                type="text"
                placeholder={`e.g. Home, Office, Mom's place…`}
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                maxLength={30}
                className="w-full text-sm px-3 py-2 border border-brand-200 rounded-lg outline-none focus:border-brand-400 bg-white"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowSaveForm(false); setSaveLabel(""); }}
                  className="flex-1 border border-gray-200 text-gray-500 text-sm font-semibold py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCurrentAddress}
                  className="flex-1 bg-brand-600 text-white text-sm font-bold py-2 rounded-xl active:scale-95 transition"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isAlreadySaved && (
        <p className="text-brand-600 text-xs font-semibold flex items-center gap-1">
          ✅ This address is already saved
        </p>
      )}

      <p className="text-xs text-gray-400 flex items-start gap-1">
        <span>ℹ️</span>
        Building must be selected from the list. Saved addresses are stored on this device only.
      </p>
    </div>
  );
};

export default AddressSelector;
