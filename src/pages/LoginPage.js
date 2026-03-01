// src/pages/LoginPage.js
// Two-tab login: Customer (Email/Password) and Admin (Phone + Password)
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const Field = ({ label, required, error, hint, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-gray-700 mb-1">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {hint  && !error && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
    {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠️ {error}</p>}
  </div>
);

const inputCls = (err) =>
  `w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition
   ${err ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-brand-500"}`;

// ─────────────────────────────────────────────────────────────
// CUSTOMER TAB
// ─────────────────────────────────────────────────────────────
const CustomerAuth = ({ onSuccess }) => {
  const { registerWithEmail, loginWithEmail } = useAuth();
  const [mode,    setMode]    = useState("login");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [pass,    setPass]    = useState("");
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});

  const set = (field) => (e) => {
    const val = field === "phone"
      ? e.target.value.replace(/\D/g, "").slice(0, 10)
      : e.target.value;
    if (field === "name")  { setName(val);  setErrors((p) => ({ ...p, name:  "" })); }
    if (field === "email") { setEmail(val); setErrors((p) => ({ ...p, email: "" })); }
    if (field === "phone") { setPhone(val); setErrors((p) => ({ ...p, phone: "" })); }
    if (field === "pass")  { setPass(val);  setErrors((p) => ({ ...p, pass:  "" })); }
  };

  const validate = () => {
    const e = {};
    if (mode === "register") {
      if (!name.trim())       e.name  = "Full name is required.";
      if (!phone.trim())      e.phone = "Phone number is required.";
      else if (phone.length !== 10) e.phone = "Enter a valid 10-digit phone number.";
      if (pass.length < 8)   e.pass  = "Password must be at least 8 characters.";
    }
    if (!email.trim())        e.email = "Email address is required.";
    if (!pass)                e.pass  = "Password is required.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      if (mode === "register") {
        const formattedPhone = phone ? `+91${phone}` : "";
        await registerWithEmail(name, email, pass, formattedPhone);
        toast(
          "Account created! Your account is pending admin approval. You'll get access once verified.",
          { icon: "⏳", duration: 8000 }
        );
        setMode("login");
        setName(""); setEmail(""); setPhone(""); setPass("");
      } else {
        await loginWithEmail(email, pass);
        onSuccess();
      }
    } catch (err) {
      if (err.code === "PENDING_APPROVAL") {
        toast.error(err.message, { duration: 8000 });
      } else {
        setErrors({ general: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
        {["login", "register"].map((m) => (
          <button key={m} onClick={() => { setMode(m); setErrors({}); }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${
              mode === m ? "bg-white shadow text-brand-700" : "text-gray-500"
            }`}>
            {m === "login" ? "Log In" : "Sign Up"}
          </button>
        ))}
      </div>

      {errors.general && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-sm">⚠️ {errors.general}</p>
        </div>
      )}

      {mode === "register" && (
        <Field label="Full Name" required error={errors.name}>
          <input type="text" placeholder="e.g. Priya Sharma"
            value={name} onChange={set("name")} className={inputCls(errors.name)} />
        </Field>
      )}

      <Field label="Email Address" required error={errors.email}>
        <input type="email" placeholder="you@example.com"
          value={email} onChange={set("email")} className={inputCls(errors.email)} />
      </Field>

      {mode === "register" && (
        <Field
          label="WhatsApp / Mobile Number"
          required
          error={errors.phone}
          hint="So the admin can call you to verify your account"
        >
          <div className="flex gap-2">
            <div className="bg-gray-100 px-3 py-3 rounded-xl text-sm font-semibold text-gray-600 whitespace-nowrap">
              🇮🇳 +91
            </div>
            <input type="tel" placeholder="9876543210"
              value={phone} onChange={set("phone")} maxLength={10}
              className={inputCls(errors.phone)} />
          </div>
        </Field>
      )}

      <Field label="Password" required error={errors.pass}>
        <input type="password"
          placeholder={mode === "register" ? "Min 8 characters" : "Your password"}
          value={pass} onChange={set("pass")} className={inputCls(errors.pass)} />
      </Field>

      {mode === "register" && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-700 font-semibold mb-1">🔔 What happens next?</p>
          <p className="text-xs text-amber-600">
            After signing up, the admin may call your number to verify you.
            Once approved, you'll be able to place orders.
          </p>
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading}
        className="w-full bg-brand-600 text-white font-bold py-3.5 rounded-2xl transition active:scale-95 hover:bg-brand-700 disabled:opacity-60">
        {loading
          ? (mode === "register" ? "Creating Account…" : "Logging In…")
          : (mode === "register" ? "Create Account →" : "Log In →")
        }
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ADMIN TAB — Phone + Password (no OTP)
// ─────────────────────────────────────────────────────────────
const AdminAuth = ({ onSuccess }) => {
  const { adminLogin } = useAuth();
  const [phone,    setPhone]    = useState("");
  const [pass,     setPass]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    const e = {};
    if (!phone.trim())      e.phone = "Phone number is required.";
    else if (phone.replace(/\D/g, "").length !== 10)
                            e.phone = "Enter a valid 10-digit number.";
    if (!pass)              e.pass  = "Password is required.";
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      await adminLogin(phone, pass);
      toast.success("Admin access granted! 🔑");
      onSuccess(true);
    } catch (err) {
      if (err.code === "NOT_ADMIN") {
        setErrors({ general: err.message });
      } else {
        setErrors({ general: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls2 = (err) =>
    `w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition
     ${err ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-brand-500"}`;

  return (
    <div>
      {errors.general && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-sm">⚠️ {errors.general}</p>
        </div>
      )}

      <Field label="Admin Phone Number" required error={errors.phone}>
        <div className="flex gap-2">
          <div className="bg-gray-100 px-3 py-3 rounded-xl text-sm font-semibold text-gray-600 whitespace-nowrap">
            🇮🇳 +91
          </div>
          <input type="tel" placeholder="9876543210"
            value={phone}
            onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErrors((p) => ({ ...p, phone: "" })); }}
            maxLength={10} className={inputCls2(errors.phone)} />
        </div>
      </Field>

      <Field label="Admin Password" required error={errors.pass}>
        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            placeholder="Your admin password"
            value={pass}
            onChange={(e) => { setPass(e.target.value); setErrors((p) => ({ ...p, pass: "" })); }}
            className={inputCls2(errors.pass)}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
          >
            {showPass ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

      <p className="text-xs text-gray-400 mb-4">
        🔒 Your password was set by the master admin when your account was created.
      </p>

      <button onClick={handleLogin} disabled={loading}
        className="w-full bg-brand-600 text-white font-bold py-3.5 rounded-2xl transition active:scale-95 hover:bg-brand-700 disabled:opacity-60">
        {loading ? "Signing In…" : "Sign In as Admin →"}
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from || "/";
  const [tab, setTab] = useState("customer");

  const handleSuccess = (isAdmin = false) => {
    navigate(isAdmin ? "/admin" : returnTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-700 to-brand-900 flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="text-6xl mb-2">🥬</div>
        <h1 className="text-white font-display font-black text-3xl">Veggie Direct</h1>
        <p className="text-brand-300 text-sm mt-1">Fresh. Local. Delivered.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
          {[
            { key: "customer", label: "🛒 Customer" },
            { key: "admin",    label: "🔑 Admin" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                tab === t.key ? "bg-white shadow text-brand-700" : "text-gray-500"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "customer"
          ? <CustomerAuth onSuccess={handleSuccess} />
          : <AdminAuth    onSuccess={handleSuccess} />
        }
      </div>

      {tab === "customer" && (
        <p className="text-brand-400 text-xs mt-5 text-center max-w-xs">
          New accounts require admin verification before shop access is granted.
        </p>
      )}
    </div>
  );
};

export default LoginPage;
