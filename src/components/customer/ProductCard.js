// src/components/customer/ProductCard.js
import React, { useState } from "react";
import { useCart } from "../../contexts/CartContext";
import { formatPrice } from "../../utils/validation";
import toast from "react-hot-toast";

// Category → emoji fallback (used when product has no custom emoji set)
const CATEGORY_EMOJI = {
  Leafy:   "🥬",
  Root:    "🥕",
  Gourd:   "🎃",
  Exotic:  "🫑",
  Fruit:   "🍅",
  Herbs:   "🌿",
  Default: "🥦",
};

const ProductCard = ({ product }) => {
  const { addItem, cart, updateQty, removeItem } = useCart();
  const [adding, setAdding] = useState(false);

  const cartItem = cart.items.find((i) => i.productId === product.id);
  // Use custom emoji set by admin, fall back to category default
  const emoji = product.emoji || CATEGORY_EMOJI[product.category] || CATEGORY_EMOJI.Default;

  const handleAdd = () => {
    if (!product.inStock) {
      toast.error(`"${product.name}" is out of stock right now.`, { icon: "🚫" });
      return;
    }
    setAdding(true);
    try {
      addItem({ ...product, emoji }, 1);   // store emoji in cart item too
      toast.success(`Added ${product.name}!`, { icon: emoji, duration: 1500 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTimeout(() => setAdding(false), 400);
    }
  };

  const handleQtyChange = (delta) => {
    const newQty = (cartItem?.qty ?? 0) + delta;
    if (newQty <= 0) {
      removeItem(product.id);
      toast(`${product.name} removed from cart`, { icon: "🗑️", duration: 1500 });
    } else {
      updateQty(product.id, newQty);
    }
  };

  return (
    <div className={`
      relative bg-white rounded-2xl shadow-sm border transition-all duration-200
      ${product.inStock
        ? "border-gray-100 hover:shadow-md hover:-translate-y-0.5"
        : "border-gray-100 opacity-60"
      }
      animate-slide-up
    `}>
      {!product.inStock && (
        <span className="absolute top-2 right-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full z-10">
          Out of Stock
        </span>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3 mb-2">
          <span className="text-3xl leading-none">{emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-gray-900 text-sm leading-tight truncate">
              {product.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{product.category} · {product.unit}</p>
          </div>
        </div>

        <p className={`text-xs font-semibold mb-3 ${
          !product.price || product.price === 0 ? "text-earth-600 italic" : "text-brand-700"
        }`}>
          {formatPrice(product.price, product.unit)}
        </p>

        {!cartItem ? (
          <button onClick={handleAdd} disabled={!product.inStock || adding}
            className={`
              w-full py-2 rounded-xl text-sm font-bold transition-all duration-200
              ${product.inStock
                ? "bg-brand-600 text-white active:scale-95 hover:bg-brand-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }
              ${adding ? "scale-95 opacity-75" : ""}
            `}>
            {adding ? "Adding…" : product.inStock ? "Add +" : "Unavailable"}
          </button>
        ) : (
          <div className="flex items-center justify-between bg-brand-50 rounded-xl px-3 py-1.5">
            <button onClick={() => handleQtyChange(-1)}
              className="w-7 h-7 rounded-full bg-white shadow text-brand-700 font-bold text-lg flex items-center justify-center active:scale-90 transition">
              −
            </button>
            <span className="font-display font-bold text-brand-800 text-sm">
              {cartItem.qty} {product.unit}
            </span>
            <button onClick={() => handleQtyChange(+1)}
              className="w-7 h-7 rounded-full bg-brand-600 shadow text-white font-bold text-lg flex items-center justify-center active:scale-90 transition">
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
