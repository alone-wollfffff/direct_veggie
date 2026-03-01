// src/utils/validation.js

/**
 * Validate a phone number string.
 * Accepts formats: +919876543210 | 9876543210 | 09876543210
 */
export const validatePhone = (raw = "", countryCode = "+91") => {
  const stripped = raw.replace(/\s+/g, "").replace(/-/g, "");

  if (/^\+\d{10,15}$/.test(stripped)) {
    return { valid: true, formatted: stripped, error: null };
  }
  if (/^\d{10}$/.test(stripped)) {
    return { valid: true, formatted: `${countryCode}${stripped}`, error: null };
  }
  if (/^0\d{10}$/.test(stripped)) {
    return { valid: true, formatted: `${countryCode}${stripped.slice(1)}`, error: null };
  }

  return {
    valid:     false,
    formatted: "",
    error:     "Enter a valid 10-digit mobile number (e.g. 9876543210 or +919876543210).",
  };
};

/**
 * Validate that a cart is non-empty and all items have a positive quantity.
 */
export const validateCart = (items = []) => {
  if (!items || items.length === 0) {
    return {
      valid: false,
      error: "Your cart is empty. Please add at least one item before placing an order.",
    };
  }
  const badQty = items.find((i) => !i.qty || i.qty <= 0);
  if (badQty) {
    return {
      valid: false,
      error: `"${badQty.name}" has an invalid quantity. Please update and try again.`,
    };
  }
  return { valid: true, error: null };
};

/**
 * Validate the checkout address form.
 */
export const validateAddress = (address = {}) => {
  const errors = {};

  if (!address.buildingId) {
    errors.buildingId =
      "Please select your building from the dropdown. Free-text entries are not accepted.";
  }

  if (!address.flatNo || address.flatNo.trim().length === 0) {
    errors.flatNo = "Flat / Door number is required so we can deliver to the right unit.";
  } else if (address.flatNo.trim().length > 20) {
    errors.flatNo = "Flat number seems too long. Please double-check.";
  }

  if (address.wing && address.wing.trim().length > 10) {
    errors.wing = "Wing/Block label is too long (max 10 characters).";
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate a product form (admin add/edit).
 */
export const validateProduct = (product = {}) => {
  const errors = {};

  if (!product.name || product.name.trim().length === 0) {
    errors.name = "Product name is required.";
  } else if (product.name.trim().length > 80) {
    errors.name = "Product name must be under 80 characters.";
  }

  if (!product.category || product.category.trim().length === 0) {
    errors.category = "Category is required (e.g. Leafy, Root, Exotic).";
  }

  if (!product.unit || product.unit.trim().length === 0) {
    errors.unit = "Unit is required (e.g. kg, g, bunch, piece).";
  }

  if (product.price !== null && product.price !== undefined && product.price !== "") {
    const priceNum = Number(product.price);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.price = "Price must be a positive number, or leave blank for Market Price.";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate a building form (admin).
 */
export const validateBuilding = (building = {}) => {
  const errors = {};

  if (!building.name || building.name.trim().length === 0) {
    errors.name = "Building name is required.";
  } else if (building.name.trim().length > 100) {
    errors.name = "Building name must be under 100 characters.";
  }

  if (!building.address || building.address.trim().length === 0) {
    errors.address = "Building address / locality is required for routing.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

/** Format price for display. Handles null/0 as Market Price. */
export const formatPrice = (price, unit = "kg") => {
  if (price === null || price === undefined || price === 0) {
    return "Market Price (To be added on delivery)";
  }
  return `₹${Number(price).toFixed(2)} / ${unit}`;
};

/** Format a Firestore timestamp or Date to a readable string */
export const formatDate = (ts) => {
  if (!ts) return "—";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("en-IN", {
    day:    "numeric",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
};
