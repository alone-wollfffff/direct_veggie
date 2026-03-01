// src/components/common/InstallPrompt.js
// ─────────────────────────────────────────────────────────────
//  PWA "Add to Home Screen" install banner.
//
//  On Android/Chrome: Uses the native beforeinstallprompt event.
//    The browser fires this automatically when all PWA criteria
//    are met (HTTPS, manifest, service worker, icons).
//    We capture it, suppress the default mini-bar, and show our
//    own nicer banner so users understand what they're installing.
//
//  On iOS/Safari: The beforeinstallprompt event does NOT exist.
//    We detect iOS + Safari and show manual instructions instead
//    ("tap Share → Add to Home Screen").
//
//  Dismissed state is saved in localStorage so the banner doesn't
//  re-appear every session after the user says "Not now".
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect } from "react";

const DISMISSED_KEY = "vd_install_dismissed";
const INSTALLED_KEY = "vd_installed";

// Detect iOS (iPhone/iPad)
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Detect standalone mode (already installed)
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

// Detect iOS Safari specifically (not Chrome on iOS which can't install)
const isIOSSafari = () =>
  isIOS() &&
  /safari/i.test(navigator.userAgent) &&
  !/crios|fxios|opios/i.test(navigator.userAgent);

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null); // Android/Chrome
  const [showAndroid,    setShowAndroid]    = useState(false);
  const [showIOS,        setShowIOS]        = useState(false);
  const [showIOSSteps,   setShowIOSSteps]   = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (isStandalone()) {
      localStorage.setItem(INSTALLED_KEY, "1");
      return;
    }
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (localStorage.getItem(INSTALLED_KEY))  return;

    // ── Android / Chrome / Edge: capture native prompt ─────
    const handleBeforeInstall = (e) => {
      e.preventDefault();          // suppress the mini browser bar
      setDeferredPrompt(e);        // save for our button
      setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // ── iOS Safari: show manual instructions ───────────────
    // Only show on iOS Safari — not Chrome/Firefox on iOS
    // which don't support PWA installation at all
    if (isIOSSafari()) {
      // Small delay so it doesn't flash on first load
      const t = setTimeout(() => setShowIOS(true), 2000);
      return () => clearTimeout(t);
    }

    // ── Listen for successful install ──────────────────────
    window.addEventListener("appinstalled", () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setShowAndroid(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "1");
    }
    setDeferredPrompt(null);
    setShowAndroid(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowAndroid(false);
    setShowIOS(false);
  };

  // ── Android / Chrome install banner ───────────────────────
  if (showAndroid) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 animate-slide-up">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-5 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-black text-xl shrink-0 shadow-md">
              VD
            </div>
            <div className="flex-1">
              <p className="font-display font-black text-gray-900 text-base">Install VeggieDirect</p>
              <p className="text-gray-400 text-xs mt-0.5">Add to your home screen — works like an app</p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-300 hover:text-gray-500 text-2xl leading-none w-8 h-8 flex items-center justify-center shrink-0"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { icon: "⚡", label: "Fast launch" },
              { icon: "📵", label: "Works offline" },
              { icon: "🔔", label: "Easy access" },
            ].map((b) => (
              <div key={b.label} className="bg-brand-50 rounded-2xl py-2.5 px-1">
                <p className="text-xl mb-1">{b.icon}</p>
                <p className="text-brand-700 text-xs font-semibold">{b.label}</p>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 border-2 border-gray-200 text-gray-500 font-bold py-3 rounded-2xl text-sm"
            >
              Not Now
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-2 flex-1 bg-brand-600 text-white font-bold py-3 rounded-2xl text-sm shadow-md active:scale-95 transition"
            >
              📲 Install App
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── iOS Safari manual instructions ────────────────────────
  if (showIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 animate-slide-up">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-black text-lg shrink-0">
                VD
              </div>
              <div>
                <p className="font-display font-black text-gray-900">Install VeggieDirect</p>
                <p className="text-gray-400 text-xs">Add to your iPhone home screen</p>
              </div>
            </div>
            <button onClick={handleDismiss}
              className="text-gray-300 text-2xl leading-none w-8 h-8 flex items-center justify-center">
              ×
            </button>
          </div>

          {!showIOSSteps ? (
            <button
              onClick={() => setShowIOSSteps(true)}
              className="w-full bg-brand-600 text-white font-bold py-3 rounded-2xl text-sm active:scale-95 transition"
            >
              📲 Show Me How
            </button>
          ) : (
            <div className="space-y-3">
              {[
                { step: "1", icon: "⬆️", text: 'Tap the Share button at the bottom of Safari (the box with arrow pointing up)' },
                { step: "2", icon: "➕", text: 'Scroll down and tap "Add to Home Screen"' },
                { step: "3", icon: "✅", text: 'Tap "Add" in the top-right corner' },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3 bg-brand-50 rounded-2xl p-3">
                  <span className="text-xl shrink-0">{s.icon}</span>
                  <p className="text-sm text-gray-700 leading-snug">{s.text}</p>
                </div>
              ))}
              <p className="text-xs text-gray-400 text-center pt-1">
                After installing, open from your home screen for the full app experience
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default InstallPrompt;
