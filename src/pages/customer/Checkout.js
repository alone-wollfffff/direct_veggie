// src/pages/customer/Checkout.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useApp } from "../../contexts/AppContext";
import { placeOrder } from "../../firebase/firestoreService";
import AddressSelector from "../../components/customer/AddressSelector";
import { validateCart, validateAddress, formatPrice } from "../../utils/validation";
import toast from "react-hot-toast";

const Checkout = () => {
  const { user, profile } = useAuth();
  const { cart, total, hasMarketPriceItems, clearCart } = useCart();
  const { activeBuildings } = useApp();
  const navigate = useNavigate();

  const [address,    setAddress]    = useState({ buildingId: "", wing: "", flatNo: "", landmark: "" });
  const [notes,      setNotes]      = useState("");
  const [placing,    setPlacing]    = useState(false);
  const [addrErrors, setAddrErrors] = useState({});

  const handlePlaceOrder = async () => {
    // 1. Validate cart
    const cartValidation = validateCart(cart.items);
    if (!cartValidation.valid) {
      toast.error(cartValidation.error, { duration: 5000 });
      return;
    }

    // 2. Validate address
    const addrValidation = validateAddress(address);
    if (!addrValidation.valid) {
      setAddrErrors(addrValidation.errors);
      const firstErr = Object.values(addrValidation.errors)[0];
      toast.error(firstErr, { duration: 5000 });
      return;
    }
    setAddrErrors({});

    // 3. Get building name for display
    const building = activeBuildings.find((b) => b.id === address.buildingId);

    setPlacing(true);

    try {
      const orderId = await placeOrder(user.uid, {
        customerName:  profile?.name  || "",
        customerPhone: profile?.phone || user?.phoneNumber || user?.email || "",
        items:         cart.items,
        address: {
          ...address,
          buildingName: building?.name || "",
          buildingAddress: building?.address || "",
        },
        buildingId:   address.buildingId,
        buildingName: building?.name || "",
        notes,
        totalKnown:   total,
        hasMarketPriceItems,
      });

      clearCart();
      toast.success("Order placed successfully! 🎉", { duration: 3000 });
      navigate(`/orders`, { replace: true });
    } catch (err) {
      // Handle "out of stock mid-checkout" gracefully
      if (err.code === "OUT_OF_STOCK") {
        toast.error(
          `Order blocked – ${err.itemNames.join("; ")}. Please update your cart.`,
          { duration: 8000, icon: "🚫" }
        );
        navigate("/cart");
      } else {
        toast.error(err.message || "Failed to place order. Please retry.", { duration: 5000 });
      }
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-600 text-xl">←</button>
        <h1 className="font-display font-bold text-gray-900 text-xl">Checkout</h1>
      </div>

      <div className="px-4 mt-5 space-y-5">
        {/* Order summary */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-display font-bold text-gray-800 mb-3">Order Summary</h2>
          <div className="space-y-2">
            {cart.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{item.name} × {item.qty} {item.unit}</span>
                <span className={item.price && item.price > 0 ? "font-semibold" : "text-earth-600 italic text-xs"}>
                  {item.price && item.price > 0
                    ? `₹${(item.price * item.qty).toFixed(0)}`
                    : "Market Price"
                  }
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-brand-700">
              {total > 0 ? `₹${total.toFixed(2)}` : "—"}
              {hasMarketPriceItems && <span className="text-earth-600 text-xs font-normal"> + market items</span>}
            </span>
          </div>
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-display font-bold text-gray-800 mb-4">Delivery Address</h2>
          <AddressSelector
            value={address}
            onChange={setAddress}
            errors={addrErrors}
          />
        </div>

        {/* Special notes */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-display font-bold text-gray-800 mb-3">Special Instructions</h2>
          <textarea
            placeholder="e.g. Leave at door, call before delivery, no plastic bags…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={200}
            className="w-full text-sm px-3 py-2 border-2 border-gray-200 rounded-xl outline-none focus:border-brand-400 resize-none"
          />
          <p className="text-xs text-gray-400 text-right">{notes.length}/200</p>
        </div>

        {/* Market price notice */}
        {hasMarketPriceItems && (
          <div className="bg-earth-50 border border-earth-200 rounded-2xl p-4">
            <p className="text-earth-800 text-sm font-semibold mb-1">📋 Market Price Items</p>
            <p className="text-earth-600 text-xs">
              One or more items don't have a set price today. The vendor will add the final price at delivery.
              Your total shown above excludes these items.
            </p>
          </div>
        )}
      </div>

      {/* Place Order */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-4 pb-8 z-40">
        <button
          onClick={handlePlaceOrder}
          disabled={placing}
          className="w-full bg-brand-600 text-white font-bold py-4 rounded-2xl active:scale-95 transition disabled:opacity-60 text-base"
        >
          {placing ? "Placing Order…" : "Place Order 🥬"}
        </button>
      </div>
    </div>
  );
};

export default Checkout;
