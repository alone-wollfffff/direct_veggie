// src/pages/admin/PriceMaster.js
// Daily Price Master: list all products, edit price inline,
// toggle stock, add new products with emoji picker, delete.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { addProduct, updateProduct, deleteProduct } from "../../firebase/firestoreService";
import { validateProduct } from "../../utils/validation";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

const CATEGORIES = ["Leafy", "Root", "Gourd", "Exotic", "Fruit", "Herbs", "Other"];
const UNITS      = ["kg", "g", "bunch", "piece", "dozen", "litre", "packet"];

// Emoji picker options — grouped by type
const EMOJI_OPTIONS = [
  // Leafy & greens
  "🥬", "🥦", "🌿", "🍃", "🌱", "🫛",
  // Root vegetables
  "🥕", "🧅", "🧄", "🥔", "🫚",
  // Gourds & round veggies
  "🎃", "🥒", "🌽", "🫑", "🍆",
  // Fruits used as vegetables
  "🍅", "🍋", "🍊", "🫐", "🍇", "🍌", "🍎", "🍐", "🥝", "🍓",
  // Others
  "🌶️", "🫙", "🥜", "🌰", "🍄", "🌾",
];

// Default category → emoji fallback (matches ProductCard)
const CATEGORY_EMOJI = {
  Leafy: "🥬", Root: "🥕", Gourd: "🎃",
  Exotic: "🫑", Fruit: "🍅", Herbs: "🌿", Other: "🥦",
};

const emptyProduct = { name: "", category: "", unit: "kg", price: "", emoji: "" };

const PriceMaster = () => {
  const navigate = useNavigate();
  const { products, productsLoading } = useApp();

  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState(emptyProduct);
  const [formErrors,  setFormErrors]  = useState({});
  const [saving,      setSaving]      = useState(false);
  const [showPicker,  setShowPicker]  = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [editPrice,   setEditPrice]   = useState("");
  const [search,      setSearch]      = useState("");

  // Preview emoji — uses selected emoji or category default
  const previewEmoji = form.emoji || CATEGORY_EMOJI[form.category] || "🥦";

  // ── Add new product ───────────────────────────────────────
  const handleAddProduct = async () => {
    const payload = {
      ...form,
      price: form.price === "" ? null : Number(form.price),
      emoji: form.emoji || null,
    };
    const { valid, errors } = validateProduct(payload);
    if (!valid) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      await addProduct(payload);
      toast.success(`"${form.name}" added!`, { icon: form.emoji || "🥦" });
      setForm(emptyProduct);
      setFormErrors({});
      setShowForm(false);
      setShowPicker(false);
    } catch (err) {
      toast.error(err.message, { duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  // ── Inline price update ───────────────────────────────────
  const handlePriceSave = async (product) => {
    const price = editPrice === "" ? null : Number(editPrice);
    if (editPrice !== "" && (isNaN(price) || price < 0)) {
      toast.error("Price must be a positive number or blank for Market Price.");
      return;
    }
    try {
      await updateProduct(product.id, { price });
      toast.success("Price updated!");
      setEditingId(null);
    } catch (err) { toast.error(err.message); }
  };

  const handleToggleStock = async (product) => {
    try {
      await updateProduct(product.id, { inStock: !product.inStock });
      toast.success(product.inStock ? `"${product.name}" marked Out of Stock` : `"${product.name}" is back In Stock`, { duration: 2000 });
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(product.id);
      toast.success(`"${product.name}" deleted.`);
    } catch (err) { toast.error(err.message); }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter((p) => p.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});
  const otherItems = filtered.filter((p) => !CATEGORIES.slice(0, -1).includes(p.category));
  if (otherItems.length) grouped["Other"] = otherItems;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-600 text-xl">←</button>
        <h1 className="font-display font-bold text-gray-900 text-xl">Daily Price Master</h1>
        <button onClick={() => { setShowForm(!showForm); setShowPicker(false); }}
          className="ml-auto bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-xl">
          {showForm ? "✕ Cancel" : "+ Add"}
        </button>
      </div>

      {/* ── Add product form ── */}
      {showForm && (
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-display font-bold text-gray-800 mb-4">New Product</h2>
          <div className="space-y-3">

            {/* Emoji picker row */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Product Emoji <span className="text-gray-400 font-normal">(optional — auto-selected by category if skipped)</span>
              </label>
              <div className="flex items-center gap-3">
                {/* Preview */}
                <div className="w-14 h-14 rounded-2xl border-2 border-gray-200 flex items-center justify-center text-3xl bg-gray-50 shrink-0">
                  {previewEmoji}
                </div>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => setShowPicker((v) => !v)}
                    className="text-brand-600 text-sm font-bold border-2 border-brand-200 px-4 py-2 rounded-xl w-full text-left"
                  >
                    {form.emoji ? `Selected: ${form.emoji}` : "🎨 Pick an emoji"}
                  </button>
                  {form.emoji && (
                    <button type="button" onClick={() => setForm({ ...form, emoji: "" })}
                      className="text-xs text-gray-400 mt-1 underline">
                      Clear (use category default)
                    </button>
                  )}
                </div>
              </div>

              {/* Emoji grid */}
              {showPicker && (
                <div className="mt-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <p className="text-xs text-gray-400 mb-2">Tap to select:</p>
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { setForm({ ...form, emoji: e }); setShowPicker(false); }}
                        className={`text-2xl p-1.5 rounded-xl transition hover:bg-white hover:shadow ${
                          form.emoji === e ? "bg-brand-100 ring-2 ring-brand-400" : ""
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <input
                placeholder="Vegetable / fruit name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none ${formErrors.name ? "border-red-400" : "border-gray-200 focus:border-brand-400"}`}
              />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">⚠️ {formErrors.name}</p>}
            </div>

            {/* Category */}
            <div>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none ${formErrors.category ? "border-red-400" : "border-gray-200 focus:border-brand-400"}`}
              >
                <option value="">Select category *</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_EMOJI[c] || "🥦"} {c}</option>
                ))}
              </select>
              {formErrors.category && <p className="text-red-500 text-xs mt-1">⚠️ {formErrors.category}</p>}
            </div>

            {/* Unit + Price */}
            <div className="flex gap-2">
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="flex-1 px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-400 text-sm outline-none"
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number" placeholder="Price (blank = market)"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  min="0"
                  className={`w-full pl-7 pr-3 py-3 rounded-xl border-2 text-sm outline-none ${formErrors.price ? "border-red-400" : "border-gray-200 focus:border-brand-400"}`}
                />
              </div>
            </div>
            {formErrors.price && <p className="text-red-500 text-xs">⚠️ {formErrors.price}</p>}

            <p className="text-xs text-gray-400">💡 Leave price blank to show "Market Price (added at delivery)"</p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowForm(false); setFormErrors({}); setForm(emptyProduct); setShowPicker(false); }}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl text-sm">
                Cancel
              </button>
              <button onClick={handleAddProduct} disabled={saving}
                className="flex-1 bg-brand-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60">
                {saving ? "Saving…" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 mt-4">
        <input type="text" placeholder="Search products…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-400 text-sm outline-none" />
      </div>

      {productsLoading && <LoadingSpinner message="Loading products…" />}

      {/* Product list grouped by category */}
      <div className="px-4 mt-4 space-y-4">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              {CATEGORY_EMOJI[cat] || "🥦"} {cat}
            </h3>
            <div className="space-y-2">
              {items.map((p) => {
                const emoji = p.emoji || CATEGORY_EMOJI[p.category] || "🥦";
                return (
                  <div key={p.id} className="bg-white rounded-2xl shadow-sm p-3">
                    <div className="flex items-start gap-3">
                      {/* Stock toggle */}
                      <button onClick={() => handleToggleStock(p)}
                        className={`shrink-0 mt-1 w-10 h-6 rounded-full transition-colors ${p.inStock ? "bg-brand-500" : "bg-gray-300"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${p.inStock ? "translate-x-4" : ""}`} />
                      </button>

                      {/* Emoji */}
                      <span className="text-2xl leading-none mt-0.5 shrink-0">{emoji}</span>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.category} · {p.unit}</p>
                      </div>

                      {/* Inline price edit */}
                      {editingId === p.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-sm">₹</span>
                          <input type="number" value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            placeholder="market" autoFocus min="0"
                            className="w-20 px-2 py-1 border-2 border-brand-400 rounded-lg text-sm outline-none" />
                          <button onClick={() => handlePriceSave(p)} className="text-brand-600 text-xs font-bold px-2">✓</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 text-xs px-1">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(p.id); setEditPrice(p.price ?? ""); }} className="text-right">
                          {p.price && p.price > 0
                            ? <span className="text-brand-700 font-bold text-sm">₹{p.price}/{p.unit}</span>
                            : <span className="text-earth-600 text-xs italic">Market</span>
                          }
                          <p className="text-gray-400 text-xs">tap to edit</p>
                        </button>
                      )}

                      <button onClick={() => handleDelete(p)} className="text-red-400 text-lg ml-1" title="Delete">🗑</button>
                    </div>

                    {!p.inStock && (
                      <p className="text-xs text-red-500 font-semibold mt-1 ml-12">● Out of Stock</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!productsLoading && products.length === 0 && (
        <div className="text-center py-12">
          <span className="text-5xl">🌱</span>
          <p className="text-gray-400 mt-3">No products yet. Add your first vegetable above.</p>
        </div>
      )}
    </div>
  );
};

export default PriceMaster;
