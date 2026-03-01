// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── PWA Service Worker Registration ──────────────────────────
// Only runs in production (npm run build), never in npm start.
if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[SW] Registered, scope:", registration.scope);

        // When a new service worker is found (new deployment),
        // dispatch a custom event that App.js listens for.
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent("swUpdateReady"));
            }
          });
        });
      })
      .catch((err) => console.error("[SW] Registration failed:", err));

    // When SW controller changes (after skipWaiting), reload for fresh version
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) { refreshing = true; window.location.reload(); }
    });
  });
}
