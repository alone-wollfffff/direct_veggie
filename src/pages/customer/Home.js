// src/pages/customer/Home.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";
import { useCart } from "../../contexts/CartContext";
import { subscribeUserOrders } from "../../firebase/firestoreService";
import ProductCard from "../../components/customer/ProductCard";
import RepeatOrderCard from "../../components/customer/RepeatOrderCard";
import { SkeletonCard } from "../../components/common/LoadingSpinner";

const Home = () => {
  const { user, profile, logout } = useAuth();
  const { products, categories, productsLoading, productsError } = useApp();
  const { itemCount, total, hasMarketPriceItems } = useCart();
  const navigate = useNavigate();

  const [search,       setSearch]       = useState("");
  const [activeCategory, setCategory]   = useState("All");
  const [lastOrder,    setLastOrder]    = useState(null);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  // Load last order for Repeat card
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUserOrders(
      user.uid,
      (orders) => {
        setLastOrder(orders[0] ?? null);
        setOrdersLoaded(true);
      },
      () => setOrdersLoaded(true) // Non-fatal – just hide repeat card
    );
    return unsub;
  }, [user]);

  // Filter products
  const displayed = products.filter((p) => {
    const matchCat    = activeCategory === "All" || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const allCategories = ["All", ...categories];

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-gradient-to-b from-brand-700 to-brand-600 px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-brand-200 text-xs">Good {getGreeting()},</p>
            <h1 className="text-white font-display font-black text-2xl">
              {profile?.name || user?.displayName || user?.email?.split("@")[0] || "Shopper"} 👋
            </h1>
          </div>
          <button
            onClick={() => navigate("/orders")}
            className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-semibold"
          >
            My Orders
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search vegetables…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-2xl text-sm outline-none shadow-sm border border-gray-100 font-body"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Repeat Last Order */}
      {ordersLoaded && lastOrder && (
        <div className="mt-4">
          <RepeatOrderCard lastOrder={lastOrder} />
        </div>
      )}

      {/* Category chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`
              shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition
              ${activeCategory === cat
                ? "bg-brand-600 text-white shadow"
                : "bg-white text-gray-600 border border-gray-200"
              }
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Error state */}
      {productsError && (
        <div className="mx-4 mb-4 bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700 text-sm font-semibold">⚠️ Could not load products</p>
          <p className="text-red-500 text-xs mt-1">{productsError}</p>
          <p className="text-red-400 text-xs mt-1">Please check your internet connection and pull to refresh.</p>
        </div>
      )}

      {/* Product grid */}
      <div className="px-4">
        {productsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl">🌱</span>
            <p className="text-gray-500 font-semibold mt-3">
              {search ? `No results for "${search}"` : "No vegetables in this category"}
            </p>
            <p className="text-gray-400 text-sm mt-1">Try a different search or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayed.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-40 animate-bounce-in">
          <button
            onClick={() => navigate("/cart")}
            className="w-full bg-brand-600 text-white rounded-2xl shadow-xl px-5 py-4 flex items-center justify-between active:scale-95 transition"
          >
            <span className="bg-white/20 text-white font-bold w-7 h-7 rounded-full flex items-center justify-center text-sm">
              {itemCount}
            </span>
            <span className="font-display font-bold">View Cart</span>
            <span className="font-bold text-sm">
              {hasMarketPriceItems
                ? total > 0 ? `₹${total.toFixed(0)}+` : "Market Price"
                : `₹${total.toFixed(0)}`
              }
            </span>
          </button>
        </div>
      )}

      {/* Logout */}
      <div className="text-center mt-6">
        <button onClick={logout} className="text-gray-400 text-xs underline">Sign Out</button>
      </div>
    </div>
  );
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
};

export default Home;
