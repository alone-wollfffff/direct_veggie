// src/pages/customer/Cart.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import { formatPrice } from "../../utils/validation";

const Cart = () => {
  const { cart, itemCount, total, hasMarketPriceItems, updateQty, removeItem, clearCart } = useCart();
  const navigate = useNavigate();

  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <span className="text-6xl mb-4">🛒</span>
        <h2 className="font-display font-bold text-gray-800 text-xl mb-2">Your cart is empty</h2>
        <p className="text-gray-400 text-sm mb-6">Add vegetables from the shop to get started.</p>
        <button
          onClick={() => navigate("/")}
          className="bg-brand-600 text-white font-bold px-8 py-3 rounded-2xl"
        >
          Browse Vegetables
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-600 text-xl">←</button>
        <h1 className="font-display font-bold text-gray-900 text-xl">Your Cart</h1>
        <span className="ml-auto text-sm text-gray-400">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
      </div>

      {/* Items */}
      <div className="px-4 mt-4 space-y-3">
        {cart.items.map((item) => (
          <div key={item.productId} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-gray-900 text-sm">{item.name}</p>
              <p className={`text-xs mt-0.5 ${!item.price || item.price === 0 ? "text-earth-600 italic" : "text-brand-700"}`}>
                {formatPrice(item.price, item.unit)}
              </p>
            </div>

            {/* Qty controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQty(item.productId, item.qty - 1)}
                className="w-8 h-8 rounded-full border-2 border-gray-200 text-gray-700 font-bold flex items-center justify-center active:bg-gray-100"
              >
                −
              </button>
              <span className="font-bold text-gray-900 w-6 text-center text-sm">{item.qty}</span>
              <button
                onClick={() => updateQty(item.productId, item.qty + 1)}
                className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center"
              >
                +
              </button>
            </div>

            {/* Row total */}
            <div className="text-right min-w-fit ml-2">
              {item.price && item.price > 0 ? (
                <p className="font-bold text-gray-900 text-sm">₹{(item.price * item.qty).toFixed(0)}</p>
              ) : (
                <p className="text-earth-600 text-xs font-semibold italic">Market<br/>Price</p>
              )}
              <button
                onClick={() => removeItem(item.productId)}
                className="text-red-400 text-xs mt-1"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Market price note */}
      {hasMarketPriceItems && (
        <div className="mx-4 mt-3 bg-earth-50 border border-earth-200 rounded-2xl p-3">
          <p className="text-earth-700 text-xs">
            ⚡ Some items are at <strong>Market Price</strong> – the final amount will be added at delivery.
          </p>
        </div>
      )}

      {/* Clear cart */}
      <div className="px-4 mt-3 text-right">
        <button
          onClick={clearCart}
          className="text-red-400 text-xs underline"
        >
          Clear cart
        </button>
      </div>

      {/* Order summary footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-2xl px-4 pt-4 pb-8 z-40">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-500">Subtotal</span>
          <span className="font-bold text-gray-900">
            {total > 0 ? `₹${total.toFixed(2)}` : "—"}
            {hasMarketPriceItems && total > 0 && <span className="text-earth-600 text-xs"> + Market items</span>}
          </span>
        </div>
        <div className="flex justify-between mb-4">
          <span className="text-xs text-gray-400">Delivery charges may apply</span>
        </div>
        <button
          onClick={() => navigate("/checkout")}
          className="w-full bg-brand-600 text-white font-bold py-4 rounded-2xl active:scale-95 transition text-base"
        >
          Proceed to Checkout →
        </button>
      </div>
    </div>
  );
};

export default Cart;
