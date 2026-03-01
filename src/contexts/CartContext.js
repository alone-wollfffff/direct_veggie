// src/contexts/CartContext.js
// ─────────────────────────────────────────────────────────────
//  Manages the shopping cart state in memory.
//  Persists cart to localStorage so it survives page refreshes.
// ─────────────────────────────────────────────────────────────
import React, { createContext, useContext, useReducer, useEffect } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "vd_cart";

// ── Reducer ───────────────────────────────────────────────────
const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.productId === action.item.productId);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.productId === action.item.productId
              ? { ...i, qty: i.qty + action.item.qty }
              : i
          ),
        };
      }
      return { ...state, items: [...state.items, action.item] };
    }

    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((i) => i.productId !== action.productId) };

    case "UPDATE_QTY": {
      if (action.qty <= 0) {
        return { ...state, items: state.items.filter((i) => i.productId !== action.productId) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.productId === action.productId ? { ...i, qty: action.qty } : i
        ),
      };
    }

    case "CLEAR":
      return { ...state, items: [] };

    case "LOAD":
      return action.cart;

    case "APPLY_REPEAT": {
      // Merge a previous order's items into the cart
      // Only include items that are still in-stock (caller must filter)
      return { ...state, items: action.items };
    }

    default:
      return state;
  }
};

const initialState = { items: [] };

// ── Provider ──────────────────────────────────────────────────
export const CartProvider = ({ children }) => {
  const [cart, dispatch] = useReducer(cartReducer, initialState, (init) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : init;
    } catch {
      // Corrupted localStorage – start fresh
      return init;
    }
  });

  // Persist to localStorage whenever cart changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      // Storage quota exceeded – not critical; cart still works in memory
      console.warn("[Cart] Failed to persist to localStorage:", err.message);
    }
  }, [cart]);

  // ── Derived values ─────────────────────────────────────────
  const itemCount = cart.items.reduce((sum, i) => sum + i.qty, 0);

  /**
   * Total price. Items with null/0 price are excluded from the numeric
   * total, but a flag `hasMarketPriceItems` is set so UI can show a note.
   */
  const { total, hasMarketPriceItems } = cart.items.reduce(
    (acc, item) => {
      const priceKnown = item.price && item.price > 0;
      if (priceKnown) {
        acc.total += item.price * item.qty;
      } else {
        acc.hasMarketPriceItems = true;
      }
      return acc;
    },
    { total: 0, hasMarketPriceItems: false }
  );

  // ── Actions ────────────────────────────────────────────────
  const addItem = (product, qty = 1) => {
    if (!product.inStock) {
      throw new Error(`"${product.name}" is currently out of stock and cannot be added to your cart.`);
    }
    dispatch({
      type: "ADD_ITEM",
      item: {
        productId: product.id,
        name:      product.name,
        unit:      product.unit,
        price:     product.price ?? null,
        qty,
      },
    });
  };

  const removeItem  = (productId) => dispatch({ type: "REMOVE_ITEM", productId });
  const updateQty   = (productId, qty) => dispatch({ type: "UPDATE_QTY", productId, qty });
  const clearCart   = () => dispatch({ type: "CLEAR" });
  const applyRepeat = (items) => dispatch({ type: "APPLY_REPEAT", items });

  const value = {
    cart,
    dispatch,
    itemCount,
    total,
    hasMarketPriceItems,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    applyRepeat,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
};
