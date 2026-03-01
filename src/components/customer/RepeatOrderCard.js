// src/components/customer/RepeatOrderCard.js
import React, { useState } from "react";
import { useCart } from "../../contexts/CartContext";
import { useApp } from "../../contexts/AppContext";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../../utils/validation";
import toast from "react-hot-toast";

const RepeatOrderCard = ({ lastOrder }) => {
  const { applyRepeat, clearCart } = useCart();
  const { products } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!lastOrder) return null;

  const handleRepeat = () => {
    setLoading(true);
    try {
      // Cross-check items against current product list for stock status
      const unavailable = [];
      const validItems  = [];

      lastOrder.items.forEach((item) => {
        const current = products.find((p) => p.id === item.productId);
        if (!current) {
          unavailable.push(`${item.name} (no longer listed)`);
        } else if (!current.inStock) {
          unavailable.push(`${item.name} (out of stock)`);
        } else {
          // Use current price (it may have changed since last order)
          validItems.push({ ...item, price: current.price });
        }
      });

      if (validItems.length === 0) {
        toast.error("All items from your last order are currently unavailable.", { duration: 4000 });
        setLoading(false);
        return;
      }

      clearCart();
      applyRepeat(validItems);

      if (unavailable.length > 0) {
        toast(
          `Cart loaded! Skipped: ${unavailable.join(", ")} — currently unavailable.`,
          { icon: "⚠️", duration: 5000 }
        );
      } else {
        toast.success("Last order loaded into your cart!", { duration: 2000 });
      }

      navigate("/cart");
    } catch (err) {
      toast.error(err.message || "Failed to repeat order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const itemSummary = lastOrder.items
    .slice(0, 3)
    .map((i) => `${i.name} ×${i.qty}`)
    .join(", ");
  const more = lastOrder.items.length > 3 ? ` +${lastOrder.items.length - 3} more` : "";

  return (
    <div className="mx-4 mb-4 bg-gradient-to-r from-earth-50 to-brand-50 border border-earth-200 rounded-2xl p-4 shadow-sm animate-fade-in">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔄</span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-gray-800 text-sm">Repeat Last Order</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {itemSummary}{more}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Placed {formatDate(lastOrder.createdAt)}
          </p>
        </div>
        <button
          onClick={handleRepeat}
          disabled={loading}
          className="shrink-0 bg-brand-600 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition disabled:opacity-60"
        >
          {loading ? "Loading…" : "Repeat"}
        </button>
      </div>
    </div>
  );
};

export default RepeatOrderCard;
