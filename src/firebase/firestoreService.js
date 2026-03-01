// src/firebase/firestoreService.js  — v3
// Central Firestore service — single source of truth for all DB ops.
//
// ADMIN AUTH MODEL (v2 — Password-based, no OTP):
//   admins/{phone}      — admin info, doc ID = E.164 phone
//   adminUids/{uid}     — fast lookup by Firebase Auth UID for security rules
//   Admin Firebase Auth email = "{digitsOnly}@admin.veggiedirect.app"
//
// NEW in v3:
//   • blockUser / unblockUser  — isBlocked flag on users
//   • getSettings / updateSettings — settings/app document
//   • updateOrderItems — modify items on a pending order within edit window
//   • deleteOrder / deleteOldOrders — order cleanup

import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, onSnapshot, query, where,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, secondaryAuth } from "./config";

export const COLS = {
  products:  "products",
  buildings: "buildings",
  orders:    "orders",
  users:     "users",
  admins:    "admins",
  adminUids: "adminUids",
  settings:  "settings",
};

// ── Helper: derive admin email from phone ─────────────────────
export const adminEmailFromPhone = (phone) =>
  `${phone.replace(/\D/g, "")}@admin.veggiedirect.app`;

export const adminPhoneFromEmail = (email) => {
  const digits = email?.split("@")[0] || "";
  return digits ? `+${digits}` : null;
};

export const isAdminEmail = (email) =>
  !!email?.endsWith("@admin.veggiedirect.app");

// ══ SETTINGS ══════════════════════════════════════════════════

const DEFAULT_SETTINGS = {
  orderEditWindowMinutes: 15,   // how long user can edit/cancel after placing
  autoDeleteAfterDays:    3,    // days before delivered/cancelled orders are hidden
};

export const getSettings = async () => {
  try {
    const snap = await getDoc(doc(db, COLS.settings, "app"));
    if (snap.exists()) return { ...DEFAULT_SETTINGS, ...snap.data() };
    return DEFAULT_SETTINGS;
  } catch (err) {
    console.warn("[Firestore] getSettings failed, using defaults:", err.code);
    return DEFAULT_SETTINGS;
  }
};

export const subscribeSettings = (callback) => {
  return onSnapshot(
    doc(db, COLS.settings, "app"),
    (snap) => callback(snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS),
    (err) => { console.warn("[Firestore] subscribeSettings:", err.code); callback(DEFAULT_SETTINGS); }
  );
};

export const updateSettings = async (updates) => {
  try {
    await setDoc(doc(db, COLS.settings, "app"), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) { throw buildError(err, "Failed to update settings."); }
};

// ══ ADMINS ════════════════════════════════════════════════════

export const checkAdminByUid = async (uid) => {
  try {
    const snap = await getDoc(doc(db, COLS.adminUids, uid));
    if (snap.exists()) {
      const data = snap.data();
      return { isAdmin: true, isMasterAdmin: !!data.isMaster, phone: data.phone || null };
    }
    return { isAdmin: false, isMasterAdmin: false, phone: null };
  } catch (err) {
    console.error("[Firestore] checkAdminByUid failed:", err.code);
    return { isAdmin: false, isMasterAdmin: false, phone: null };
  }
};

export const checkAdminPhone = async (phone) => {
  try {
    const snap = await getDoc(doc(db, COLS.admins, phone));
    if (snap.exists()) {
      const data = snap.data();
      return { isAdmin: true, isMasterAdmin: !!data.isMaster, adminDoc: { id: snap.id, ...data } };
    }
    return { isAdmin: false, isMasterAdmin: false, adminDoc: null };
  } catch (err) {
    console.error("[Firestore] checkAdminPhone failed:", err.code);
    return { isAdmin: false, isMasterAdmin: false, adminDoc: null };
  }
};

export const subscribeAllAdmins = (callback, onError) => {
  return onSnapshot(
    collection(db, COLS.admins),
    (snap) => {
      const admins = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          if (a.isMaster && !b.isMaster) return -1;
          if (!a.isMaster && b.isMaster) return 1;
          return (a.name || "").localeCompare(b.name || "");
        });
      callback(admins);
    },
    (err) => { console.error("[Firestore] subscribeAllAdmins:", err.code); onError?.(buildError(err)); }
  );
};

export const addAdmin = async (phone, name, password) => {
  try {
    const existing = await getDoc(doc(db, COLS.admins, phone));
    if (existing.exists()) throw new Error("This phone number is already registered as an admin.");

    const email = adminEmailFromPhone(phone);
    let newUid;
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      newUid = cred.user.uid;
      await signOut(secondaryAuth);
    } catch (authErr) {
      if (authErr.code === "auth/email-already-in-use") {
        throw new Error("A Firebase Auth account for this phone already exists. Delete from Firebase Console → Authentication first.");
      }
      throw new Error(`Auth account creation failed: ${authErr.message}`);
    }

    const adminData = { phone, name: name || "Admin", isMaster: false, uid: newUid, createdAt: serverTimestamp() };
    await setDoc(doc(db, COLS.admins, phone), adminData);
    await setDoc(doc(db, COLS.adminUids, newUid), { phone, isMaster: false });
  } catch (err) {
    if (err.message.includes("already") || err.message.includes("Auth account")) throw err;
    throw buildError(err, "Failed to add admin.");
  }
};

export const removeAdmin = async (phone, isMaster) => {
  if (isMaster) throw new Error("The master admin cannot be removed.");
  try {
    const adminSnap = await getDoc(doc(db, COLS.admins, phone));
    const uid = adminSnap.exists() ? adminSnap.data().uid : null;
    await deleteDoc(doc(db, COLS.admins, phone));
    if (uid) await deleteDoc(doc(db, COLS.adminUids, uid));
  } catch (err) { throw buildError(err, "Failed to remove admin."); }
};

// ══ PRODUCTS ══════════════════════════════════════════════════

export const subscribeProducts = (callback, onError) => {
  return onSnapshot(
    collection(db, COLS.products),
    (snap) => {
      const products = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const catCmp = (a.category || "").localeCompare(b.category || "");
          return catCmp !== 0 ? catCmp : (a.name || "").localeCompare(b.name || "");
        });
      callback(products);
    },
    (err) => { console.error("[Firestore] subscribeProducts:", err.code); onError?.(buildError(err)); }
  );
};

export const addProduct = async (product) => {
  try {
    const ref = await addDoc(collection(db, COLS.products), {
      ...product, price: product.price ?? null, inStock: true,
      emoji: product.emoji || null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) { throw buildError(err, "Failed to add product."); }
};

export const updateProduct = async (productId, updates) => {
  try {
    await updateDoc(doc(db, COLS.products, productId), { ...updates, updatedAt: serverTimestamp() });
  } catch (err) { throw buildError(err, "Failed to update product."); }
};

export const deleteProduct = async (productId) => {
  try { await deleteDoc(doc(db, COLS.products, productId)); }
  catch (err) { throw buildError(err, "Failed to delete product."); }
};

// ══ BUILDINGS ═════════════════════════════════════════════════

export const subscribeBuildings = (callback, onError) => {
  return onSnapshot(
    collection(db, COLS.buildings),
    (snap) => {
      const buildings = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      callback(buildings);
    },
    (err) => { console.error("[Firestore] subscribeBuildings:", err.code); onError?.(buildError(err)); }
  );
};

export const addBuilding = async (building) => {
  try {
    const ref = await addDoc(collection(db, COLS.buildings), { ...building, active: true, createdAt: serverTimestamp() });
    return ref.id;
  } catch (err) { throw buildError(err, "Failed to add building."); }
};

export const updateBuilding = async (buildingId, updates) => {
  try { await updateDoc(doc(db, COLS.buildings, buildingId), updates); }
  catch (err) { throw buildError(err, "Failed to update building."); }
};

export const deleteBuilding = async (buildingId) => {
  try { await deleteDoc(doc(db, COLS.buildings, buildingId)); }
  catch (err) { throw buildError(err, "Failed to remove building."); }
};

// ══ ORDERS ════════════════════════════════════════════════════

export const placeOrder = async (uid, orderPayload) => {
  try {
    const productSnaps = await Promise.all(
      orderPayload.items.map((item) => getDoc(doc(db, COLS.products, item.productId)))
    );
    const outOfStock = [];
    productSnaps.forEach((snap, i) => {
      if (!snap.exists()) outOfStock.push(`"${orderPayload.items[i].name}" no longer exists`);
      else if (!snap.data().inStock) outOfStock.push(`"${snap.data().name}" is now out of stock`);
    });
    if (outOfStock.length > 0) {
      const err = new Error("Some items became unavailable");
      err.code = "OUT_OF_STOCK"; err.itemNames = outOfStock; throw err;
    }
    const ref = await addDoc(collection(db, COLS.orders), {
      uid, ...orderPayload, status: "pending",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    if (err.code === "OUT_OF_STOCK") throw err;
    throw buildError(err, "Failed to place order.");
  }
};

/**
 * Update items on a pending order (within edit window).
 * Also recalculates totalKnown and hasMarketPriceItems.
 */
export const updateOrderItems = async (orderId, items) => {
  try {
    const totalKnown = items.reduce((sum, i) => (i.price && i.price > 0 ? sum + i.price * i.qty : sum), 0);
    const hasMarketPriceItems = items.some((i) => !i.price || i.price === 0);
    await updateDoc(doc(db, COLS.orders, orderId), {
      items, totalKnown, hasMarketPriceItems, updatedAt: serverTimestamp(),
    });
  } catch (err) { throw buildError(err, "Failed to update order."); }
};

export const subscribeUserOrders = (uid, callback, onError) => {
  const q = query(collection(db, COLS.orders), where("uid", "==", uid));
  return onSnapshot(q,
    (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      callback(orders);
    },
    (err) => { console.error("[Firestore] subscribeUserOrders:", err.code); onError?.(buildError(err)); }
  );
};

export const subscribeAllOrders = (callback, onError, statusFilter = null) => {
  return onSnapshot(collection(db, COLS.orders),
    (snap) => {
      let orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (statusFilter) orders = orders.filter((o) => o.status === statusFilter);
      orders.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      callback(orders);
    },
    (err) => { console.error("[Firestore] subscribeAllOrders:", err.code); onError?.(buildError(err)); }
  );
};

export const updateOrderStatus = async (orderId, status) => {
  try { await updateDoc(doc(db, COLS.orders, orderId), { status, updatedAt: serverTimestamp() }); }
  catch (err) { throw buildError(err, "Failed to update order status."); }
};

/**
 * Delete a single order by ID.
 */
export const deleteOrder = async (orderId) => {
  try { await deleteDoc(doc(db, COLS.orders, orderId)); }
  catch (err) { throw buildError(err, "Failed to delete order."); }
};

/**
 * Delete all delivered/cancelled orders older than `daysBefore` days.
 * Returns the count of deleted orders.
 * Note: runs in batches of 20 to stay within Firestore limits without batch writes.
 */
export const deleteOldOrders = async (daysBefore = 3) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBefore);
    const cutoffTs = Timestamp.fromDate(cutoff);

    const snap = await getDocs(collection(db, COLS.orders));
    const toDelete = snap.docs.filter((d) => {
      const data = d.data();
      const isDone = ["delivered", "cancelled"].includes(data.status);
      const isOld = (data.createdAt?.seconds ?? 0) < cutoffTs.seconds;
      return isDone && isOld;
    });

    // Delete sequentially to avoid hitting rate limits
    for (const d of toDelete) {
      await deleteDoc(d.ref);
    }
    return toDelete.length;
  } catch (err) { throw buildError(err, "Failed to delete old orders."); }
};

// ══ USERS ═════════════════════════════════════════════════════

export const createUserProfile = async (uid, data) => {
  try {
    await setDoc(doc(db, COLS.users, uid), {
      name:       data.name  || "",
      email:      data.email || "",
      phone:      data.phone || "",
      isApproved: false,
      isBlocked:  false,
      authMethod: "email",
      createdAt:  serverTimestamp(),
      updatedAt:  serverTimestamp(),
    });
  } catch (err) { throw buildError(err, "Failed to create your profile."); }
};

export const upsertUser = async (uid, data) => {
  try {
    await setDoc(doc(db, COLS.users, uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) { throw buildError(err, "Failed to save your profile."); }
};

export const getUser = async (uid) => {
  try {
    const snap = await getDoc(doc(db, COLS.users, uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) { throw buildError(err, "Failed to load your profile."); }
};

export const subscribeAllUsers = (callback, onError) => {
  return onSnapshot(collection(db, COLS.users),
    (snap) => {
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      callback(users);
    },
    (err) => { console.error("[Firestore] subscribeAllUsers:", err.code); onError?.(buildError(err)); }
  );
};

export const approveUser = async (uid) => {
  try {
    await updateDoc(doc(db, COLS.users, uid), {
      isApproved: true, isBlocked: false, approvedAt: serverTimestamp(),
    });
  } catch (err) { throw buildError(err, "Failed to approve user."); }
};

export const revokeUser = async (uid) => {
  try {
    await updateDoc(doc(db, COLS.users, uid), { isApproved: false, revokedAt: serverTimestamp() });
  } catch (err) { throw buildError(err, "Failed to revoke user access."); }
};

/** Block user — they cannot log in. Also removes approval. */
export const blockUser = async (uid) => {
  try {
    await updateDoc(doc(db, COLS.users, uid), {
      isBlocked: true, isApproved: false, blockedAt: serverTimestamp(),
    });
  } catch (err) { throw buildError(err, "Failed to block user."); }
};

/** Unblock user — puts them back to pending state. */
export const unblockUser = async (uid) => {
  try {
    await updateDoc(doc(db, COLS.users, uid), {
      isBlocked: false, unblockedAt: serverTimestamp(),
    });
  } catch (err) { throw buildError(err, "Failed to unblock user."); }
};

/**
 * Reject a pending user — permanently DELETES their Firestore profile.
 * Their Firebase Auth account still exists so if they try to log in again
 * they get a "no account found" error and are prompted to sign up again.
 */
export const rejectUser = async (uid) => {
  try {
    await deleteDoc(doc(db, COLS.users, uid));
  } catch (err) { throw buildError(err, "Failed to reject user."); }
};

// ══ ERROR HELPER ══════════════════════════════════════════════

export const buildError = (err, fallback = null) => {
  const errorMap = {
    "permission-denied":      "You don't have permission for this action.",
    "not-found":              "The requested data was not found.",
    "already-exists":         "This entry already exists.",
    "resource-exhausted":     "Too many requests. Please wait and retry.",
    "unavailable":            "Service unavailable. Check your internet.",
    "deadline-exceeded":      "Request timed out.",
    "cancelled":              "Operation was cancelled.",
    "unauthenticated":        "Your session expired. Please log in again.",
    "invalid-argument":       "Invalid data submitted.",
    "failed-precondition":    "A required Firestore index is missing.",
    "internal":               "An internal server error occurred.",
    "network-request-failed": "Network error – check your internet connection.",
  };
  const message  = errorMap[err?.code] ?? fallback ?? err?.message ?? "An unexpected error occurred.";
  const enhanced = new Error(message);
  enhanced.originalCode    = err?.code;
  enhanced.originalMessage = err?.message;
  return enhanced;
};