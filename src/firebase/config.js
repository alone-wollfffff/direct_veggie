// src/firebase/config.js
// ─────────────────────────────────────────────────────────────
//  Primary Firebase app  → used for all regular auth sessions.
//  Secondary Firebase app → used ONLY when master admin creates
//  a new admin account (so the master doesn't get signed out).
// ─────────────────────────────────────────────────────────────
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

// Primary app
const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// Secondary app — only for creating new admin Firebase Auth accounts
// without signing out the current master admin session.
const secondaryApp = getApps().find((a) => a.name === "secondary")
  || initializeApp(firebaseConfig, "secondary");
export const secondaryAuth = getAuth(secondaryApp);

// ── Emulator support (development only) ──────────────────────
if (process.env.REACT_APP_USE_EMULATOR === "true") {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectAuthEmulator(auth, "http://localhost:9099");
}

export default app;
