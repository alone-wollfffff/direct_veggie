# 🥬 Veggie Direct — Complete Setup Guide

A vegetable delivery web app (React + Firebase) that works as an installable PWA.
Customers browse, order and track deliveries. Admins manage products, buildings, users and orders.

---

## 🐛 What Was Fixed in This Version

| # | Problem | Fix Applied |
|---|---------|-------------|
| 1 | **No CSS styling** (plain HTML look) | Config files were named `tailwind_config.js` and `postcss_config.js`. Fixed to correct names `tailwind.config.js` and `postcss.config.js` |
| 2 | **Settings page 404** | `/admin/settings` route was missing from App.js — added |
| 3 | **No saved addresses** | AddressSelector rebuilt with Amazon-style saved addresses using localStorage |
| 4 | **firebase-admin in React** | Removed from package.json (it's Node-only, breaks browser builds) |
| 5 | **Missing config files** | Added `firebase.json`, `firestore.rules`, `.gitignore`, `.firebaserc`, GitHub Actions workflow |

---

## 📋 Prerequisites

Before you start, make sure you have:
- [Node.js 18+](https://nodejs.org) installed
- [Firebase CLI](https://firebase.google.com/docs/cli) installed: `npm install -g firebase-tools`
- A Firebase project already created at [console.firebase.google.com](https://console.firebase.google.com)

---

## ⚡ Quick Start (Local Testing)

### Step 1 — Fill in your Firebase credentials

Copy the example env file:
```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your actual values from Firebase Console → Project Settings → Your Apps → Web:
```
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=1234567890
REACT_APP_FIREBASE_APP_ID=1:1234567890:web:abc123
```

### Step 2 — Update .firebaserc

Open `.firebaserc` and replace `YOUR-FIREBASE-PROJECT-ID` with your actual project ID:
```json
{ "projects": { "default": "your-actual-project-id" } }
```

### Step 3 — Install dependencies

```bash
npm install --legacy-peer-deps
```

### Step 4 — Run locally

```bash
npm start
```

Opens at http://localhost:3000 — the app should now look fully styled (green branded UI).

---

## 🔑 Setting Up the Master Admin (One Time Only)

You need to do this once to create your first admin account.

### Step 1 — Download service account key

Firebase Console → Project Settings → Service accounts → **Generate new private key**

Save the downloaded file as `serviceAccountKey.json` in the project root (same folder as `package.json`).

> ⚠️ This file is in `.gitignore`. Never commit it to GitHub!

### Step 2 — Edit addAdminPhone.js

Open `addAdminPhone.js` and set:
```js
const MASTER_PHONE    = "+919876543210";  // your phone in E.164 format
const MASTER_NAME     = "Your Name";
const MASTER_PASSWORD = "YourSecurePass123";  // min 8 chars
```

### Step 3 — Install firebase-admin (for the script only)

```bash
npm install firebase-admin --save-dev
```

### Step 4 — Run the script

```bash
node addAdminPhone.js
```

You'll see: `✅ Master admin created successfully`

### Step 5 — Log in as admin

Go to http://localhost:3000/login → click **🔑 Admin** tab → enter your phone number and password.

---

## 🚀 Deploy to Firebase

### Step 1 — Login to Firebase CLI

```bash
firebase login
firebase use your-project-id
```

### Step 2 — Deploy Firestore security rules

```bash
firebase deploy --only firestore:rules
```

### Step 3 — Build and deploy everything

```bash
npm run build
firebase deploy
```

Your app is live at `https://your-project-id.web.app` 🎉

---

## 🔄 Push to GitHub + Auto-Deploy

Every push to the `main` branch automatically builds and deploys via GitHub Actions.

### Step 1 — Initialize Git and push

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2 — Add GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

Add all 7 secrets:

| Secret Name | Where to get it |
|---|---|
| `REACT_APP_FIREBASE_API_KEY` | Firebase Project Settings → Web App |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase Project Settings → Web App |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase Project Settings → Web App |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Firebase Project Settings → Web App |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Firebase Project Settings → Web App |
| `REACT_APP_FIREBASE_APP_ID` | Firebase Project Settings → Web App |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase → Service accounts → Generate key → paste the **entire JSON content** |

### Step 3 — Test auto-deploy

```bash
git add .
git commit -m "test: trigger auto deploy"
git push origin main
```

Watch the deployment progress at: GitHub repo → **Actions** tab

---

## 📲 PWA — Installing on Phone

### Android (Chrome)
1. Open your live URL in Chrome
2. After a few seconds, a green banner appears: **"Install VeggieDirect"**
3. Tap **📲 Install App**
4. Icon appears on home screen, opens full-screen like a native app

### iPhone (Safari — must use Safari, not Chrome)
1. Open your live URL in Safari
2. A banner appears: **"Install VeggieDirect"**
3. Tap **"Show Me How"**
4. Follow the 3 steps: Share button → Add to Home Screen → Add

### Testing PWA locally (must build first — PWA doesn't work with `npm start`)
```bash
npm run build
npx serve -s build
```
Open http://localhost:3000 in Chrome to test install prompt.

---

## 🏠 Saved Addresses Feature

The checkout now has Amazon-style address saving:
- After filling in building + flat number, tap **"💾 Save this address for future orders"**
- Give it a label like "Home" or "Office"
- Next time you order, tap **"📍 Use a Saved Address"** to auto-fill
- Up to 5 addresses saved per device
- Addresses are stored in browser localStorage (not uploaded to Firestore — fully private)
- Delete any saved address with the 🗑 button

---

## 👥 User System

**Customers:** Register with email + password → admin approves → can order

**Admins:** Created by master admin via Admin Panel → log in with phone number + password

**Master Admin:** Created via `addAdminPhone.js` script → has all powers including managing other admins and app settings

---

## 🔐 Admin Login

Go to `/login` → click **🔑 Admin** tab → enter your 10-digit phone number + password

> Admin accounts use phone number as identity. The password is set when the account is created.

---

## 📂 File Structure

```
veggie-direct/
├── public/
│   ├── index.html          ← iOS PWA tags + fonts
│   ├── manifest.json       ← PWA manifest
│   ├── sw.js               ← Service worker (caching + offline)
│   ├── logo192.png         ← Android home screen icon
│   ├── logo512.png         ← Splash screen icon
│   ├── apple-touch-icon.png ← iPhone home screen icon
│   └── favicon-32.png      ← Browser tab icon
├── src/
│   ├── firebase/
│   │   ├── config.js             ← Firebase init
│   │   └── firestoreService.js   ← All database functions
│   ├── contexts/
│   │   ├── AuthContext.js        ← Login/logout/auth state
│   │   ├── AppContext.js         ← Products + buildings (real-time)
│   │   └── CartContext.js        ← Shopping cart (localStorage)
│   ├── components/
│   │   ├── common/
│   │   │   ├── ErrorBoundary.js
│   │   │   ├── LoadingSpinner.js
│   │   │   └── InstallPrompt.js  ← PWA install banner
│   │   └── customer/
│   │       ├── ProductCard.js
│   │       ├── AddressSelector.js ← Amazon-style saved addresses
│   │       └── RepeatOrderCard.js
│   ├── pages/
│   │   ├── LoginPage.js          ← Customer (email/pass) + Admin (phone/pass)
│   │   ├── customer/
│   │   │   ├── Home.js
│   │   │   ├── Cart.js
│   │   │   ├── Checkout.js
│   │   │   └── OrderHistory.js   ← Edit/cancel within window
│   │   └── admin/
│   │       ├── AdminDashboard.js
│   │       ├── PriceMaster.js    ← Products + emoji picker
│   │       ├── BuildingManager.js
│   │       ├── OrderBatcher.js   ← Orders + cleanup
│   │       ├── UserRequests.js   ← Approve/reject/block users
│   │       ├── AdminManager.js   ← Manage admins (master only)
│   │       └── Settings.js       ← Edit window + auto-delete (master only)
│   ├── utils/
│   │   └── validation.js
│   ├── App.js                    ← Routes + guards
│   ├── index.js                  ← SW registration
│   └── index.css                 ← Tailwind directives
├── tailwind.config.js            ← ✅ Fixed (was tailwind_config.js)
├── postcss.config.js             ← ✅ Fixed (was postcss_config.js)
├── firebase.json
├── firestore.rules
├── .firebaserc                   ← Set your project ID here
├── .env.local.example            ← Copy to .env.local and fill in values
├── .gitignore
├── addAdminPhone.js              ← One-time master admin setup script
└── package.json
```

---

## 🔧 Troubleshooting

**App has no styling (plain HTML)**
→ This was the main bug — config files had wrong names. If it happens again, make sure `tailwind.config.js` and `postcss.config.js` exist with the correct names (not underscores).

**"Network not available" error**
→ Your Firebase env variables are wrong or missing. Double-check `.env.local`. Variable names must start with `REACT_APP_`.

**Admin login says "Invalid credentials"**
→ Run `addAdminPhone.js` to create the account. Phone number format: enter just the 10 digits (e.g. 9876543210), the app adds +91 automatically.

**Settings page not found (/admin/settings)**
→ Fixed in this version. The route was missing from App.js.

**Buildings not loading**
→ Firestore rules weren't deployed. Run: `firebase deploy --only firestore:rules`

**PWA install banner not showing**
→ PWA only works on HTTPS (your live site). Locally, use `npm run build && npx serve -s build`.

**GitHub Actions deploy failing**
→ Check all 7 secrets are added. The `FIREBASE_SERVICE_ACCOUNT` must be the full JSON (including the `{` `}` braces).

**`serviceAccountKey.json not found`**
→ Download from Firebase Console → Project Settings → Service accounts → Generate new private key. Place in project root.

---

*Built with React 18, Firebase, Tailwind CSS, and PWA.*
