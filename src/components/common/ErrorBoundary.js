// src/components/common/ErrorBoundary.js
// ─────────────────────────────────────────────────────────────
//  React Error Boundary. Catches rendering errors anywhere in
//  the tree and displays a friendly recovery UI.
// ─────────────────────────────────────────────────────────────
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-brand-50 p-6 text-center">
          <span className="text-6xl mb-4">🥬</span>
          <h1 className="text-2xl font-display font-bold text-brand-800 mb-2">
            Oops! Something went wrong.
          </h1>
          <p className="text-brand-600 text-sm mb-2">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <p className="text-gray-400 text-xs mb-6">
            This is usually a temporary glitch. Try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-semibold shadow hover:bg-brand-700 transition"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
