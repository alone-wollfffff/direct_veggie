// src/components/common/LoadingSpinner.js
import React from "react";

export const LoadingSpinner = ({ message = "Loading…", fullScreen = false }) => {
  const inner = (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-brand-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-600 animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-lg">🥦</span>
      </div>
      {message && <p className="text-brand-700 text-sm font-medium animate-pulse-soft">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-brand-50 flex items-center justify-center z-50">
        {inner}
      </div>
    );
  }
  return <div className="flex items-center justify-center py-12">{inner}</div>;
};

export const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
    <div className="h-3 bg-gray-200 rounded w-1/4" />
  </div>
);

export default LoadingSpinner;
