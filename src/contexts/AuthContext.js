// src/contexts/AuthContext.js
// DUAL-PATH AUTH: Customers (email/pass) | Admin (phone+pass → admin email)
// Blocks login for isBlocked users.
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase/config";
import {
  createUserProfile,
  getUser,
  checkAdminByUid,
  isAdminEmail,
  adminEmailFromPhone,
} from "../firebase/firestoreService";

const AuthContext = createContext(null);

const EMAIL_ERROR_MAP = {
  "auth/email-already-in-use":   "An account with this email already exists. Please log in instead.",
  "auth/invalid-email":          "The email address is not valid.",
  "auth/weak-password":          "Password is too weak. Use at least 8 characters.",
  "auth/user-not-found":         "No account found with this email. Please sign up first.",
  "auth/wrong-password":         "Incorrect password. Please try again.",
  "auth/too-many-requests":      "Too many failed attempts. Please wait 5 minutes.",
  "auth/user-disabled":          "This account has been disabled.",
  "auth/network-request-failed": "Network error – check your internet connection.",
  "auth/invalid-credential":     "Invalid credentials. Please check your details.",
};

export const AuthProvider = ({ children }) => {
  const [user,            setUser]            = useState(null);
  const [profile,         setProfile]         = useState(null);
  const [isAdmin,         setIsAdmin]         = useState(false);
  const [isMasterAdmin,   setIsMasterAdmin]   = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [isBlocked,       setIsBlocked]       = useState(false);
  const [authLoading,     setAuthLoading]     = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Admin auth → email ends with @admin.veggiedirect.app
        if (isAdminEmail(firebaseUser.email)) {
          const { isAdmin: adminFlag, isMasterAdmin: masterFlag } =
            await checkAdminByUid(firebaseUser.uid);
          setIsAdmin(adminFlag);
          setIsMasterAdmin(masterFlag);
          setProfile(null);
          setPendingApproval(false);
          setIsBlocked(false);
          setAuthLoading(false);
          return;
        }

        // Customer email auth
        setIsAdmin(false);
        setIsMasterAdmin(false);
        try {
          const p = await getUser(firebaseUser.uid);
          setProfile(p);
          setIsBlocked(!!p?.isBlocked);
          setPendingApproval(p ? !p.isApproved && !p.isBlocked : false);
        } catch {
          setProfile(null);
          setPendingApproval(false);
          setIsBlocked(false);
        }
      } else {
        setUser(null); setProfile(null);
        setIsAdmin(false); setIsMasterAdmin(false);
        setPendingApproval(false); setIsBlocked(false);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ── CUSTOMER: Register ────────────────────────────────────
  const registerWithEmail = async (name, email, password, phone = "") => {
    if (!name?.trim())   throw new Error("Name is required.");
    if (!email?.trim())  throw new Error("Email address is required.");
    if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await createUserProfile(cred.user.uid, { name: name.trim(), email: email.trim(), phone: phone.trim() });
    } catch (err) {
      const msg = EMAIL_ERROR_MAP[err.code] ?? err.message ?? "Registration failed.";
      throw new Error(msg);
    }
  };

  // ── CUSTOMER: Login ───────────────────────────────────────
  const loginWithEmail = async (email, password) => {
    if (!email?.trim()) throw new Error("Email address is required.");
    if (!password)      throw new Error("Password is required.");
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const p    = await getUser(cred.user.uid);

      // Profile deleted = account was rejected by admin
      if (!p) {
        await signOut(auth);
        const err  = new Error("Your registration was rejected by the admin. Please sign up again with a valid account.");
        err.code = "REJECTED";
        throw err;
      }
      if (p?.isBlocked) {
        await signOut(auth);
        const err  = new Error("Your account has been blocked by the admin. Please contact support.");
        err.code = "BLOCKED";
        throw err;
      }
      if (p && !p.isApproved) {
        await signOut(auth);
        const err  = new Error("Your account is pending approval by the admin. Please wait for verification.");
        err.code = "PENDING_APPROVAL";
        throw err;
      }
    } catch (err) {
      if (err.code === "PENDING_APPROVAL" || err.code === "BLOCKED" || err.code === "REJECTED") throw err;
      const msg = EMAIL_ERROR_MAP[err.code] ?? err.message ?? "Login failed.";
      throw new Error(msg);
    }
  };

  // ── ADMIN: Login with phone + password ────────────────────
  const adminLogin = async (phone, password) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) throw new Error("Enter a valid phone number.");
    const e164  = digits.length === 10 ? `+91${digits}` : `+${digits}`;
    const email = adminEmailFromPhone(e164);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const { isAdmin: adminFlag, isMasterAdmin: masterFlag } = await checkAdminByUid(cred.user.uid);

      if (!adminFlag) {
        await signOut(auth);
        const err  = new Error("Access denied. This phone is not registered as an admin. Contact the master admin.");
        err.code = "NOT_ADMIN";
        throw err;
      }
      setIsAdmin(true);
      setIsMasterAdmin(masterFlag);
    } catch (err) {
      if (err.code === "NOT_ADMIN") throw err;
      const msg = EMAIL_ERROR_MAP[err.code] ?? err.message ?? "Admin login failed.";
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try { await signOut(auth); }
    catch { throw new Error("Logout failed. Please try again."); }
  };

  return (
    <AuthContext.Provider value={{
      user, profile, isAdmin, isMasterAdmin, pendingApproval, isBlocked, authLoading,
      registerWithEmail, loginWithEmail, adminLogin, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};