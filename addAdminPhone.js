// addAdminPhone.js
// ══════════════════════════════════════════════════════════════
//  One-time setup: registers the MASTER admin in Firebase Auth
//  AND in both Firestore collections (admins + adminUids).
//
//  Run this ONCE when setting up the project for the first time.
//  After this, you can add/remove other admins from within the
//  Admin Panel itself (Admin → Manage Admins).
//
//  USAGE:
//  ───────
//  1. Download serviceAccountKey.json:
//       Firebase Console → Project Settings → Service accounts
//       → Generate new private key → save as serviceAccountKey.json
//       in this folder
//
//  2. Edit MASTER_PHONE, MASTER_NAME, and MASTER_PASSWORD below
//
//  3. Run:
//       node addAdminPhone.js
//
//  LOGIN AFTER SETUP:
//  ───────────────────
//  Go to your app → Admin tab → enter your phone + MASTER_PASSWORD
// ══════════════════════════════════════════════════════════════

const admin = require("firebase-admin");
const path  = require("path");
const fs    = require("fs");

// ── EDIT THESE ────────────────────────────────────────────────
const MASTER_PHONE    = "+919702081134";   // ← your phone in E.164
const MASTER_NAME     = "lonw wolf";   // ← your name
const MASTER_PASSWORD = "wolf@2005";    // ← CHANGE THIS! min 8 chars
// ─────────────────────────────────────────────────────────────

const keyPath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(keyPath)) {
  console.error("\n❌  serviceAccountKey.json not found!");
  console.error("   Download from: Firebase Console → Project Settings → Service accounts");
  console.error("   → Generate new private key → save as serviceAccountKey.json here\n");
  process.exit(1);
}

if (!MASTER_PHONE.startsWith("+") || MASTER_PHONE.replace(/\D/g, "").length < 10) {
  console.error("\n❌  MASTER_PHONE must be in E.164 format, e.g. +919876543210\n");
  process.exit(1);
}

if (MASTER_PASSWORD.length < 8) {
  console.error("\n❌  MASTER_PASSWORD must be at least 8 characters\n");
  process.exit(1);
}

if (MASTER_PASSWORD === "changeme123") {
  console.error("\n❌  Please change MASTER_PASSWORD to something secure before running!\n");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
const db   = admin.firestore();
const auth = admin.auth();

// Derive the admin email from phone (matches client-side logic)
// "+919876543210" → "919876543210@admin.veggiedirect.app"
const adminEmail = `${MASTER_PHONE.replace(/\D/g, "")}@admin.veggiedirect.app`;

async function run() {
  console.log("\n⏳ Setting up master admin...");
  console.log("   Phone:", MASTER_PHONE);
  console.log("   Email:", adminEmail);

  // ── Step 1: Create or get Firebase Auth user ──────────────
  let uid;
  try {
    const existingUser = await auth.getUserByEmail(adminEmail);
    uid = existingUser.uid;
    console.log("ℹ️  Firebase Auth user already exists. UID:", uid);

    // Update password in case it changed
    await auth.updateUser(uid, { password: MASTER_PASSWORD });
    console.log("   Password updated.");
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      const newUser = await auth.createUser({
        email:    adminEmail,
        password: MASTER_PASSWORD,
        displayName: MASTER_NAME,
      });
      uid = newUser.uid;
      console.log("✅  Firebase Auth user created. UID:", uid);
    } else {
      throw err;
    }
  }

  // ── Step 2: Write admins/{phone} ─────────────────────────
  const adminRef = db.collection("admins").doc(MASTER_PHONE);
  const adminSnap = await adminRef.get();
  if (adminSnap.exists) {
    if (!adminSnap.data().isMaster) {
      await adminRef.update({ isMaster: true, uid });
      console.log("✅  Existing admin doc upgraded to master.");
    } else {
      await adminRef.update({ uid }); // ensure uid field is up to date
      console.log("ℹ️  Master admin doc already exists. Updated uid field.");
    }
  } else {
    await adminRef.set({
      phone:     MASTER_PHONE,
      name:      MASTER_NAME,
      isMaster:  true,
      uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅  admins/" + MASTER_PHONE + " created.");
  }

  // ── Step 3: Write adminUids/{uid} ────────────────────────
  const uidRef  = db.collection("adminUids").doc(uid);
  const uidSnap = await uidRef.get();
  if (uidSnap.exists) {
    await uidRef.update({ phone: MASTER_PHONE, isMaster: true });
    console.log("ℹ️  adminUids/" + uid + " updated.");
  } else {
    await uidRef.set({ phone: MASTER_PHONE, isMaster: true });
    console.log("✅  adminUids/" + uid + " created.");
  }

  console.log("\n✅  Master admin setup complete!");
  console.log("──────────────────────────────────────────────────");
  console.log("   Phone    :", MASTER_PHONE);
  console.log("   Name     :", MASTER_NAME);
  console.log("   Password :", MASTER_PASSWORD, "← share this with yourself");
  console.log("   isMaster : true");
  console.log("──────────────────────────────────────────────────");
  console.log("\n   Next steps:");
  console.log("   1. Deploy Firestore rules:  firebase deploy --only firestore:rules");
  console.log("   2. Open your app → Admin tab → enter phone + password above");
  console.log("   3. From Admin Panel → Manage Admins → add other admins\n");
  process.exit(0);
}

run().catch((err) => {
  console.error("\n❌  Error:", err.message, "\n");
  process.exit(1);
});
