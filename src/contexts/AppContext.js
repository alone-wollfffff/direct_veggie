// src/contexts/AppContext.js
// ─────────────────────────────────────────────────────────────
//  Holds global real-time data (products, buildings) via Firestore
//  subscriptions so all components share one connection.
// ─────────────────────────────────────────────────────────────
import React, { createContext, useContext, useState, useEffect } from "react";
import { subscribeProducts, subscribeBuildings } from "../firebase/firestoreService";
import toast from "react-hot-toast";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [products,         setProducts]         = useState([]);
  const [buildings,        setBuildings]        = useState([]);
  const [productsLoading,  setProductsLoading]  = useState(true);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [productsError,    setProductsError]    = useState(null);
  const [buildingsError,   setBuildingsError]   = useState(null);

  // ── Subscribe to products ─────────────────────────────────
  useEffect(() => {
    const unsub = subscribeProducts(
      (data) => {
        setProducts(data);
        setProductsLoading(false);
        setProductsError(null);
      },
      (err) => {
        setProductsError(err.message);
        setProductsLoading(false);
        toast.error(`Products: ${err.message}`, { duration: 5000 });
      }
    );
    return unsub;
  }, []);

  // ── Subscribe to buildings ────────────────────────────────
  useEffect(() => {
    const unsub = subscribeBuildings(
      (data) => {
        setBuildings(data);
        setBuildingsLoading(false);
        setBuildingsError(null);
      },
      (err) => {
        setBuildingsError(err.message);
        setBuildingsLoading(false);
        toast.error(`Buildings: ${err.message}`, { duration: 5000 });
      }
    );
    return unsub;
  }, []);

  // ── Derived helpers ────────────────────────────────────────
  /** Unique sorted categories */
  const categories = [...new Set(products.map((p) => p.category))].sort();

  /** Active (non-archived) buildings for the address dropdown */
  const activeBuildings = buildings.filter((b) => b.active !== false);

  const value = {
    products,
    buildings,
    activeBuildings,
    categories,
    productsLoading,
    buildingsLoading,
    productsError,
    buildingsError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
};
