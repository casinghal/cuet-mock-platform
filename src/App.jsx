/**
 * CUET English Mock Test Platform — App.jsx v2.0
 * React + Firebase + Razorpay + GA4
 * Subject: English 101 | CUET UG 2026
 * All 6 screens: auth, dashboard, generating, exam, results, review
 */

import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";

// ── Google Fonts ──────────────────────────────────────────────────────────────
if (!document.getElementById("cuet-fonts")) {
  const l = document.createElement("link");
  l.id = "cuet-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap";
  document.head.appendChild(l);
}

// ── Global CSS ────────────────────────────────────────────────────────────────
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --navy:#0F2747;--navy-mid:#1E3A5F;--navy-light:#2D5282;
  --indigo:#4338CA;--indigo-light:#6366F1;
  --amber:#D97706;--amber-light:#FCD34D;
  --success:#059669;--danger:#DC2626;
  --surface:#FFFFFF;--bg:#F8FAFC;--bg-alt:#F1F5F9;--border:#E2E8F0;
  --text-primary:#0F172A;--text-secondary:#475569;--text-muted:#94A3B8;
  --font-body:'Sora',sans-serif;--font-display:'DM Serif Display',serif;--font-mono:'JetBrains Mono',monospace;
  --card-shadow:0 1px 3px rgba(15,39,71,.08),0 4px 16px rgba(15,39,71,.06);
}
body{font-family:var(--font-body);background:var(--bg);color:var(--text-primary);font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased;}
button{cursor:pointer;border:none;outline:none;font-family:var(--font-body);}
.btn-primary{background:var(--navy);color:#fff;height:44px;padding:0 24px;border-radius:8px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .15s;}
.btn-primary:hover{background:var(--navy-light);}
.btn-primary:disabled{background:var(--text-muted);cursor:not-allowed;}
.btn-primary.full{width:100%;}
.btn-amber{background:#FFFBEB;color:var(--amber);border:1px solid #FDE68A;height:36px;padding:0 16px;border-radius:6px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;transition:background .15s;}
.btn-amber:hover{background:#FEF3C7;}
.btn-navy-sm{background:var(--navy);color:#fff;height:36px;padding:0 18px;border-radius:6px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;transition:background .15s;}
.btn-navy-sm:hover{background:var(--navy-light);}
.btn-outline{background:transparent;color:var(--navy);border:1.5px solid var(--navy);height:44px;padding:0 24px;border-radius:8px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s;}
.btn-outline:hover{background:var(--navy);color:#fff;}
@keyframes indeterminate{0%{transform:translateX(-100%) scaleX(.5)}50%{transform:translateX(0) scaleX(.5)}100%{transform:translateX(100%) scaleX(.5)}}
.pbar-track{width:100%;height:4px;background:#E0E7FF;border-radius:2px;overflow:hidden;}
.pbar-fill{height:100%;background:var(--indigo);border-radius:2px;animation:indeterminate 1.6s ease-in-out infinite;transform-origin:left;}
.option-box{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:1.5px solid var(--border);border-radius:4px;cursor:pointer;transition:border-color .12s,background .12s;background:#fff;}
.option-box:hover{border-color:var(--indigo-light);background:#EEF2FF;}
.option-box.selected{border-color:var(--indigo);background:#EEF2FF;}
.option-box.correct{border-color:var(--success);background:#ECFDF5;}
.option-box.wrong{border-color:var(--danger);background:#FEF2F2;}
.option-key{width:24px;height:24px;min-width:24px;border:1.5px solid var(--border);border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--text-secondary);font-family:var(--font-mono);}
.option-box.selected .option-key{background:var(--indigo);border-color:var(--indigo);color:#fff;}
.option-box.correct .option-key{background:var(--success);border-color:var(--success);color:#fff;}
.option-box.wrong .option-key{background:var(--danger);border-color:var(--danger);color:#fff;}
.pill{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.02em;text-transform:uppercase;}
.pill-indigo{background:#EEF2FF;color:var(--indigo);}
.pill-green{background:#ECFDF5;color:var(--success);}
.pill-amber{background:#FFFBEB;color:var(--amber);}
.pill-navy{background:#E8EDF5;color:var(--navy);}
.pill-red{background:#FEF2F2;color:var(--danger);}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--card-shadow);}
.stat-strip{border-left:4px solid var(--indigo);padding:10px 14px;background:var(--surface);border-radius:0 8px 8px 0;}
.nta-header{background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:52px;flex-shrink:0;}
.nta-logo{font-family:var(--font-display);font-size:18px;letter-spacing:.02em;}
.nta-logo span{color:var(--amber-light);}
.section-bar{background:var(--bg-alt);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:8px 24px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-secondary);display:flex;align-items:center;gap:12px;}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--navy);color:#fff;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.2);animation:toastIn .2s ease;}
.toast.error{background:var(--danger);}
.modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:999;padding:24px;}
.modal-box{background:#fff;border-radius:16px;padding:32px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(15,39,71,.25);}
.error-msg{background:#FEF2F2;border:1px solid #FECACA;color:var(--danger);border-radius:8px;padding:10px 14px;font-size:13px;margin-top:8px;}
::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
@media(max-width:700px){
  .nta-header{padding:0 16px;height:48px;}
  .nta-logo{font-size:15px;}
  .section-bar{padding:6px 16px;font-size:11px;}
  .modal-box{padding:24px 20px;}
  .btn-primary{font-size:13px;}
  .option-box{padding:12px 14px;}
  table{font-size:12px;}
  th,td{padding:8px 10px !important;}
}
`;
if (!document.getElementById("cuet-styles")) {
  const s = document.createElement("style"); s.id = "cuet-styles"; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── GA4 — inject gtag if measurement ID is provided ──────────────────────────
const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
if (GA4_ID && !document.getElementById("gtag-init")) {
  const sc = document.createElement("script");
  sc.id = "gtag-init"; sc.async = true;
  sc.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(sc);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA4_ID, { send_page_view: false });
}

// ── Firebase ──────────────────────────────────────────────────────────────────
// Defensive Firebase init — app runs in localStorage-only mode if credentials missing
const FIREBASE_CONFIGURED = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let auth, db;
try {
  const fbApp = initializeApp({
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  });
  auth = getAuth(fbApp);
  db   = getFirestore(fbApp);
} catch(e) {
  console.warn("[Vantiq] Firebase not configured — running in demo/localStorage mode");
  auth = null; db = null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CF_BASE       = import.meta.env.VITE_CLOUD_FUNCTION_BASE || "";
const RZP_KEY_ID    = import.meta.env.VITE_RAZORPAY_KEY_ID;
const FREE_LIMIT    = 5;
const EXAM_SECS     = 3600; // 60 min
const MARKS_CORRECT = 5;
const MARKS_WRONG   = -1;

// ── GA4 ───────────────────────────────────────────────────────────────────────
// All calls wrapped in try/catch — GA4 errors must never break exam or payment flows
function logEvent(name, params = {}) {
  try { if (typeof window.gtag === "function") window.gtag("event", name, params); } catch(_) {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ", " +
         d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtTimer(s) { return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; }
function scoreColor(p) { return p >= 70 ? "var(--success)" : p >= 45 ? "var(--amber)" : "var(--danger)"; }

// ── Auth Token — required for all Cloud Function calls ────────────────────────
async function getAuthToken() {
  try {
    if (!auth?.currentUser) return null;
    return await auth.currentUser.getIdToken();
  } catch(_) { return null; }
}
function authHeaders(token) {
  return token ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
               : { "Content-Type": "application/json" };
}

// ── Mobile detection hook ─────────────────────────────────────────────────────
function useMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 700);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3500); return () => clearTimeout(t); }, []);
  return <div className={"toast" + (type === "error" ? " error" : "")}>{message}</div>;
}

// ── Paywall Modal ─────────────────────────────────────────────────────────────
function PaywallModal({ user, onSuccess, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function pay() {
    setLoading(true); setError(null);
    logEvent("payment_initiated", { user_id: user?.uid });
    try {
      const token = await getAuthToken();
      const hdrs  = authHeaders(token);

      // Step 1: Create order server-side
      const orderRes = await fetch(`${CF_BASE}/createOrder`, {
        method: "POST", headers: hdrs, body: JSON.stringify({}),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Could not create order");
      const order_id = orderData.id; // CF returns { id, amount, currency }

      // Step 2: Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: RZP_KEY_ID, order_id,
        amount: 19900, currency: "INR",
        name: "Vantiq CUET", description: "Unlock Full Access",
        theme: { color: "#0F2747" },
        prefill: { name: user?.displayName || "", email: user?.email || "" },
        handler: async (resp) => {
          try {
            // Step 3: Verify HMAC server-side before unlocking
            const vRes = await fetch(`${CF_BASE}/verifyPayment`, {
              method: "POST", headers: hdrs,
              body: JSON.stringify(resp), // { razorpay_order_id, razorpay_payment_id, razorpay_signature }
            });
            const vData = await vRes.json();
            if (vData.unlocked) {
              logEvent("payment_success", { user_id: user?.uid, value: 199, currency: "INR" });
              onSuccess();
            } else throw new Error(vData.error || "Verification failed");
          } catch(e) {
            logEvent("payment_failed", { user_id: user?.uid, reason: e.message });
            setError("Payment verification failed. Contact support if amount was deducted.");
          } finally { setLoading(false); }
        },
        modal: { ondismiss: () => { logEvent("payment_failed", { reason: "dismissed" }); setLoading(false); } },
      });
      rzp.on("payment.failed", r => {
        logEvent("payment_failed", { reason: r.error.description });
        setError(r.error.description); setLoading(false);
      });
      rzp.open();
    } catch(e) { setError(e.message || "Could not create order. Try again."); setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>
            🔓
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--navy)", marginBottom: 8 }}>
            Unlock Full Access
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
            You have used all 4 free Mock Exams. Unlock unlimited access for CUET English 2026.
          </p>
        </div>
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)" }}>Full Platform Access</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)", fontFamily: "var(--font-mono)" }}>&#8377;199</span>
          </div>
          {["Unlimited Mock Exams every day", "Quick Practice always free, forever", "Topic-wise performance analytics", "One-time payment, unlimited till 30 June"].map(f => (
            <div key={f} style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <span style={{ color: "var(--success)" }}>&#10003;</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{f}</span>
            </div>
          ))}
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn-primary full" onClick={pay} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? "Processing..." : "Pay ₹199 · One-time"}
        </button>
        <p style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
          Secured by Razorpay &middot; UPI, Cards, Net Banking
        </p>
      </div>
    </div>
  );
}

// ── AUTH SCREEN — Premium Landing Page ────────────────────────────────────────
function AuthScreen({ onLogin, showToast }) {
  const [loading, setLoading] = useState(null);
  const [error,   setError]   = useState(null);
  const [mode,    setMode]    = useState("login");
  const isMobile = useMobile();

  useEffect(() => { logEvent("page_view", { page: "auth" }); }, []);

  async function ensureUserDoc(user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid, email: user.email, displayName: user.displayName,
        photoURL: user.photoURL, testsUsed: 0, unlocked: false, createdAt: serverTimestamp(),
      });
    }
  }

  async function handleGoogle() {
    setLoading("google"); setError(null);
    try {
      const r = await signInWithPopup(auth, new GoogleAuthProvider());
      const isNew = r._tokenResponse?.isNewUser;
      await ensureUserDoc(r.user);
      logEvent(isNew ? "sign_up" : "login", { method: "google" });
      onLogin(r.user);
    } catch(e) { setError(e.message || "Google sign-in failed. Try again."); }
    finally { setLoading(null); }
  }

  const subjects = [
    { name: "English (101)", live: true  },
    { name: "General Aptitude Test (GAT)", live: false },
    { name: "Economics",     live: false },
  ];

  const features = [
    { icon: "\u2728", title: "Fresh Test Papers",    desc: "A new 50-question paper every attempt. No repeats, ever." },
    { icon: "\u26A1", title: "Instant Analytics", desc: "Topic-wise breakdown the moment you submit. Know your weak spots immediately." },
    { icon: "\u2705", title: "Exact NTA Pattern", desc: "+5 correct, \u22121 wrong. Same interface as the real exam." },
  ];

  // Inline styles for the premium landing
  const S = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #080F1E 0%, #0D1B3E 50%, #0A1628 100%)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "var(--font-body)",
      position: "relative",
      overflow: "hidden",
    },
    // Decorative mesh blobs
    blob1: {
      position: "absolute", top: "-20%", right: "-10%",
      width: 600, height: 600, borderRadius: "50%",
      background: "radial-gradient(circle, rgba(67,56,202,0.15) 0%, transparent 70%)",
      pointerEvents: "none",
    },
    blob2: {
      position: "absolute", bottom: "-15%", left: "-10%",
      width: 500, height: 500, borderRadius: "50%",
      background: "radial-gradient(circle, rgba(217,119,6,0.08) 0%, transparent 70%)",
      pointerEvents: "none",
    },
    // Top nav
    nav: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: isMobile ? "16px 20px" : "20px 32px", position: "relative", zIndex: 10,
    },
    navLogo: {
      fontFamily: "var(--font-display)", fontSize: 22, color: "#fff",
      letterSpacing: "0.02em",
    },
    navLogoAccent: { color: "#F59E0B" },
    navBadge: {
      background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)",
      color: "#F59E0B", padding: "4px 12px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
    },
    // Main layout
    main: {
      flex: 1, display: "flex",
      flexDirection: isMobile ? "column" : "row",
      alignItems: isMobile ? "stretch" : "stretch",
      padding: isMobile ? "16px 20px 40px" : "24px 32px 48px",
      gap: isMobile ? 28 : 48,
      position: "relative", zIndex: 10,
      maxWidth: 1100, margin: "0 auto", width: "100%",
    },
    // Left hero panel
    hero: {
      flex: isMobile ? "none" : "1 1 55%",
      display: isMobile ? "flex" : "flex",
      flexDirection: "column",
      justifyContent: "center",
      paddingRight: isMobile ? 0 : 24,
    },
    eyebrow: {
      display: "inline-flex", alignItems: "center", gap: 8,
      background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
      color: "#A5B4FC", padding: "6px 14px", borderRadius: 20,
      fontSize: 12, fontWeight: 600, letterSpacing: "0.05em",
      textTransform: "uppercase", marginBottom: 24, width: "fit-content",
    },
    dot: {
      width: 6, height: 6, borderRadius: "50%", background: "#6EE7B7",
      boxShadow: "0 0 6px #6EE7B7", display: "inline-block",
    },
    h1: {
      fontFamily: "var(--font-display)", fontSize: "clamp(36px, 5vw, 56px)",
      color: "#FFFFFF", lineHeight: 1.1, marginBottom: 20,
      fontStyle: "normal",
    },
    h1accent: { color: "#F59E0B", display: "block" },
    subtext: {
      fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.7,
      marginBottom: 36, maxWidth: 480,
    },
    // Social proof strip
    proofStrip: {
      display: "flex", gap: 32, marginBottom: 40, flexWrap: "wrap",
    },
    proofItem: { display: "flex", flexDirection: "column", gap: 2 },
    proofNum: {
      fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700,
      color: "#FFFFFF", lineHeight: 1,
    },
    proofLabel: { fontSize: 12, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" },
    // Features
    featuresGrid: { display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 },
    featureRow: {
      display: "flex", alignItems: "flex-start", gap: 14,
      padding: "14px 16px", background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
    },
    featureIcon: { fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 2 },
    featureTitle: { fontSize: 14, fontWeight: 600, color: "#FFFFFF", marginBottom: 3 },
    featureDesc: { fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 },
    // Subjects coming soon
    subjectLabel: {
      fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)",
      textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10,
    },
    subjectChips: { display: "flex", flexWrap: "wrap", gap: 8 },
    chipLive: {
      background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
      color: "#6EE7B7", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      display: "flex", alignItems: "center", gap: 5,
    },
    chipSoon: {
      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
      color: "rgba(255,255,255,0.35)", padding: "5px 12px", borderRadius: 20, fontSize: 12,
    },
    // Right auth card
    authCard: {
      flex: isMobile ? "none" : "0 0 380px",
      width: isMobile ? "100%" : undefined,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 20, padding: isMobile ? "28px 24px" : "36px 32px",
      backdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column", justifyContent: "center",
      boxShadow: "0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
    },
    authHeading: {
      fontFamily: "var(--font-display)", fontSize: 26, color: "#FFFFFF",
      marginBottom: 6, lineHeight: 1.2,
    },
    authSub: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 28, lineHeight: 1.5 },
    // Free trial badge
    trialBadge: {
      background: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.08) 100%)",
      border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10,
      padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10,
    },
    trialIcon: { fontSize: 20 },
    trialText: { fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.4 },
    trialStrong: { color: "#F59E0B", fontWeight: 700 },
    // Google button
    googleBtn: {
      width: "100%", height: 50, background: "#FFFFFF",
      border: "none", borderRadius: 10, display: "flex",
      alignItems: "center", justifyContent: "center", gap: 12,
      fontSize: 14, fontWeight: 600, color: "#1A1A2E",
      cursor: "pointer", transition: "all 0.2s",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      fontFamily: "var(--font-body)",
      marginBottom: 12,
    },
    fbBtn: {
      width: "100%", height: 50, background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
      fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)",
      cursor: "pointer", transition: "all 0.2s", fontFamily: "var(--font-body)",
      marginBottom: 20,
    },
    divider: {
      display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
    },
    dividerLine: { flex: 1, height: 1, background: "rgba(255,255,255,0.1)" },
    dividerText: { fontSize: 11, color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" },
    // Pricing note
    pricingNote: {
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8, padding: "12px 14px", marginBottom: 20,
    },
    pricingRow: {
      display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
    },
    pricingLabel: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
    pricingValue: { fontSize: 12, fontWeight: 600, color: "#FFFFFF" },
    pricingFinal: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)",
    },
    pricingFinalLabel: { fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" },
    pricingFinalValue: { fontSize: 18, fontWeight: 700, color: "#F59E0B", fontFamily: "var(--font-mono)" },
    // Register toggle
    toggleText: {
      textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.35)",
      marginBottom: 16,
    },
    toggleLink: {
      color: "#818CF8", fontWeight: 600, cursor: "pointer",
      textDecoration: "underline", textDecorationColor: "rgba(129,140,248,0.3)",
    },
    // Trust line
    trustLine: {
      textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)",
      lineHeight: 1.6,
    },
    // Error
    errorBox: {
      background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)",
      color: "#FCA5A5", borderRadius: 8, padding: "10px 14px", fontSize: 12.5,
      marginBottom: 12,
    },
  };

  return (
    <div style={S.page}>
      {/* Decorative blobs */}
      <div style={S.blob1} />
      <div style={S.blob2} />

      {/* Top nav */}
      <nav style={S.nav}>
        <span style={S.navLogo}>
          Vantiq <span style={S.navLogoAccent}>CUET</span>
        </span>
        <span style={S.navBadge}>2026 Edition</span>
      </nav>

      {/* Main split layout */}
      <div style={S.main}>

        {/* ── Left: Hero — hidden on mobile ── */}
        {!isMobile && (
        <div style={S.hero}>
          <div style={S.eyebrow}>
            <span style={S.dot} />
            English (101) Live Now
          </div>

          <h1 style={S.h1}>
            India&#39;s Smartest
            <span style={S.h1accent}>CUET Prep Platform</span>
          </h1>

          <p style={S.subtext}>
            NTA-pattern mock tests with expert-crafted papers and instant analytics.
            Know exactly where you stand — topic by topic — before exam day.
          </p>

          {/* Social proof */}
          <div style={S.proofStrip}>
            {[
              { num: "50Q", label: "Per Test Paper" },
              { num: "6", label: "Topics Covered" },
              { num: "+5/−1", label: "NTA Marking" },
              { num: "60min", label: "Timed Exam" },
            ].map(p => (
              <div key={p.label} style={S.proofItem}>
                <span style={S.proofNum}>{p.num}</span>
                <span style={S.proofLabel}>{p.label}</span>
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={S.featuresGrid}>
            {features.map(f => (
              <div key={f.title} style={S.featureRow}>
                <span style={S.featureIcon}>{f.icon}</span>
                <div>
                  <div style={S.featureTitle}>{f.title}</div>
                  <div style={S.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Subjects */}
          <div style={S.subjectLabel}>Subjects on this platform</div>
          <div style={S.subjectChips}>
            {subjects.map(s => (
              <span key={s.name} style={s.live ? S.chipLive : S.chipSoon}>
                {s.live && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6EE7B7", display: "inline-block" }} />}
                {s.name}
                {!s.live && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.6 }}>soon</span>}
              </span>
            ))}
          </div>
        </div>
        )}

        {/* ── Right: Auth Card ── */}
        <div style={S.authCard}>
          <h2 style={S.authHeading}>Start Preparing Today</h2>
          <p style={S.authSub}>
            4 full-length Mock Exams free. No credit card needed to begin.
          </p>

          {/* Free trial badge */}
          <div style={S.trialBadge}>
            <span style={S.trialIcon}>&#127381;</span>
            <div style={S.trialText}>
              <span style={S.trialStrong}>4 full Mock Exams — free.</span>{" "}
              Then unlock unlimited access at one flat price.
            </div>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading === "google"}
            style={S.googleBtn}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)"; }}
          >
            <GoogleIcon />
            {loading === "google" ? "Signing you in..." : "Continue with Google"}
          </button>

          {/* Hook line */}
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 20, textAlign: "center" }}>
            Find your weak topics before the exam does.
          </p>

          {/* Error */}
          {error && <div style={S.errorBox}>{error}</div>}

          {/* Toggle */}
          <p style={S.toggleText}>
            {mode === "login"
              ? <React.Fragment>New here?{" "}<span style={S.toggleLink} onClick={() => setMode("register")}>Create your account</span></React.Fragment>
              : <React.Fragment>Have an account?{" "}<span style={S.toggleLink} onClick={() => setMode("login")}>Sign in</span></React.Fragment>
            }
          </p>

          {/* Trust */}
          <p style={S.trustLine}>
            By continuing you agree to our Terms &amp; Privacy Policy.
            <br />Your data is safe and never shared.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Google + Facebook icons ───────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.909-2.258c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
// ── DASHBOARD SCREEN ──────────────────────────────────────────────────────────
function DashboardScreen({ user, userData, testHistory, onBeginTest, onLogout, showToast }) {
  const [mode,        setMode]        = useState("Mock");
  const [showPaywall, setShowPaywall] = useState(false);
  const [checking,    setChecking]    = useState(false);
  const isMobile = useMobile();

  const testsUsed = userData?.testsUsed || 0;
  const unlocked  = userData?.unlocked  || false;
  const testsLeft = Math.max(0, FREE_LIMIT - testsUsed);
  const scores    = testHistory.map(t => t.accuracy || 0);
  const avgScore  = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const bestScore = scores.length ? Math.max(...scores) : null;

  useEffect(() => { logEvent("page_view", { page: "dashboard", user_id: user?.uid }); }, []);

  const MODES = {
    QuickPractice: { label: "Quick Practice", desc: "15 questions · Always Free", free: true },
    Mock:          { label: "Mock Exam",       desc: "50 questions · 60 min · NTA standard", free: false },
  };

  async function handleBegin() {
    // QuickPractice is always free — no limit check needed
    if (mode === "QuickPractice") {
      onBeginTest({ mode });
      return;
    }

    setChecking(true);
    try {
      if (CF_BASE) {
        const token = await getAuthToken();
        const r = await fetch(`${CF_BASE}/checkTestLimit`, {
          method: "POST", headers: authHeaders(token), body: JSON.stringify({}),
        });
        const d = await r.json();
        if (!d.allowed) {
          logEvent("paywall_triggered", { user_id: user?.uid, tests_used: testsUsed });
          setShowPaywall(true); return;
        }
      } else {
        const effectiveCount = testsUsed || parseInt(localStorage.getItem("cuet_tests_used") || "0");
        const effectiveUnlocked = unlocked || localStorage.getItem("cuet_unlocked") === "true";
        if (!effectiveUnlocked && effectiveCount >= FREE_LIMIT) {
          logEvent("paywall_triggered", { user_id: user?.uid, tests_used: effectiveCount });
          setShowPaywall(true); return;
        }
      }
      onBeginTest({ mode });
    } catch(_) {
      const effectiveCount = testsUsed || parseInt(localStorage.getItem("cuet_tests_used") || "0");
      if (!unlocked && effectiveCount >= FREE_LIMIT) { setShowPaywall(true); return; }
      onBeginTest({ mode });
    } finally { setChecking(false); }
  }

  function handlePaySuccess() {
    setShowPaywall(false);
    showToast("Payment verified! Full access unlocked.", "info");
    onBeginTest({ mode });
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {showPaywall && <PaywallModal user={user} onSuccess={handlePaySuccess} onClose={() => setShowPaywall(false)} />}

      <div className="nta-header">
        <span className="nta-logo">Vantiq <span>CUET</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>{user?.displayName?.split(" ")[0]}</span>
          <button onClick={onLogout} style={{ background: "transparent", color: "#fff", fontSize: 12, opacity: 0.7, padding: "4px 8px", border: "1px solid rgba(255,255,255,.2)", borderRadius: 4, fontFamily: "var(--font-body)", cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 900, margin: "0 auto", width: "100%", padding: isMobile ? "20px 16px" : "28px 24px" }}>
        <h2 style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
          Your Practice Summary
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 36 }}>
          {[
            { label: "Tests Taken",  val: testsUsed,  sub: unlocked ? "Unlimited" : `${testsLeft} free left` },
            { label: "Avg. Score",   val: avgScore != null ? `${avgScore}%` : "—", sub: "across all tests" },
            { label: "Best Score",   val: bestScore != null ? `${bestScore}%` : "—", sub: "personal best" },
            { label: "Access",       val: unlocked ? "Pro" : "Free", sub: unlocked ? "Unlimited till 30 Jun" : `${testsLeft} of 4 Mock Exams free` },
          ].map(s => (
            <div key={s.label} className="stat-strip">
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)", fontFamily: "var(--font-mono)" }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: "24px 28px", marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--navy)", marginBottom: 4 }}>New Test Paper</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
            Choose a format and begin.
          </p>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {Object.entries(MODES).map(([k, cfg]) => (
                <div key={k} onClick={() => setMode(k)} style={{
                  border: `2px solid ${mode === k ? "var(--navy)" : "var(--border)"}`,
                  borderRadius: 10, padding: "12px 18px", cursor: "pointer", minWidth: 160,
                  background: mode === k ? "#EEF2FF" : "#fff",
                  boxShadow: mode === k ? "0 2px 8px rgba(67,56,202,.12)" : "none",
                  transition: "all .15s", position: "relative",
                }}>
                  {cfg.free && (
                    <div style={{
                      position: "absolute", top: -10, right: 10,
                      background: "var(--success)", color: "#fff",
                      fontSize: 9, fontWeight: 700, padding: "2px 7px",
                      borderRadius: 20, letterSpacing: ".04em", textTransform: "uppercase",
                    }}>Always Free</div>
                  )}
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--navy)", marginBottom: 4 }}>{cfg.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{cfg.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-primary full" onClick={handleBegin} disabled={checking && mode !== "QuickPractice"}>
            {checking ? "Checking..." : "Begin Test →"}
          </button>
          {mode === "QuickPractice" ? (
            <p style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "var(--success)", fontWeight: 600 }}>
              ✓ Quick Practice is always free — no limits, ever.
            </p>
          ) : !unlocked ? (
            <p style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
              {testsLeft > 0 ? `${testsLeft} free Mock Exam${testsLeft !== 1 ? "s" : ""} remaining` : "Free limit reached — unlock above"}
            </p>
          ) : (
            <p style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
              {Math.max(0, 15 - ((userData?.dailyTests || {})[new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })] || 0))} mock tests remaining today
            </p>
          )}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)", marginBottom: 14 }}>Recent Tests</h3>
        {testHistory.length === 0 ? (
          <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No tests attempted yet. Start your first test above.
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: isMobile ? 500 : "auto" }}>
              <thead>
                <tr style={{ background: "var(--bg-alt)", borderBottom: "1px solid var(--border)" }}>
                  {["Date", "Mode", "Score", "Correct", "Accuracy", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-secondary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {testHistory.map((t, i) => {
                  const p = t.accuracy || 0;
                  return (
                    <tr key={i} style={{ borderBottom: i < testHistory.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "12px 14px", color: "var(--text-secondary)" }}>{fmtDate(t.completedAt)}</td>
                      <td style={{ padding: "12px 14px" }}><span className="pill pill-navy">{t.mode || "Mock"}</span></td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{t.totalScore ?? "—"}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)" }}>{t.correct}/{t.attempted}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: scoreColor(p), fontFamily: "var(--font-mono)" }}>{p}%</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span className={"pill " + (p >= 70 ? "pill-green" : p >= 45 ? "pill-amber" : "pill-red")}>
                          {p >= 70 ? "Strong" : p >= 45 ? "Average" : "Needs Work"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── GENERATING SCREEN ─────────────────────────────────────────────────────────
function GeneratingScreen({ config }) {
  useEffect(() => { logEvent("page_view", { page: "generating" }); }, []);
  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <div className="nta-header"><span className="nta-logo">Vantiq <span>CUET</span></span></div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32 }}>
            <span className="pill pill-indigo">{config?.mode || "Mock"}</span>
            <span className="pill pill-navy">English 101</span>
            <span className="pill pill-navy">50Q &middot; 60 min</span>
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)", marginBottom: 8 }}>Preparing Your Test</h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 32 }}>
            Preparing your test paper. Please do not close this tab.
          </p>
          <div className="pbar-track"><div className="pbar-fill" /></div>
        </div>
      </div>
    </div>
  );
}

// ── EXAM SCREEN ───────────────────────────────────────────────────────────────
function ExamScreen({ questions, config, user, onSubmit, showToast }) {
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState({});
  const [marked,    setMarked]    = useState(new Set());
  const [timeLeft,  setTimeLeft]  = useState(EXAM_SECS);
  const [exitModal, setExitModal] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const isMobile = useMobile();
  const timerRef = useRef(null);

  useEffect(() => { logEvent("page_view", { page: "exam" }); }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); submitTest(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  function submitTest(auto = false) {
    clearInterval(timerRef.current);
    logEvent("test_completed", { user_id: user?.uid, mode: config?.mode, answered: Object.keys(answers).length });
    onSubmit(answers);
  }

  const q    = questions[current];
  const warn = timeLeft < 300;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
      {exitModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--navy)", marginBottom: 8 }}>Exit Test?</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
              Your progress will be lost. This test still counts toward your limit.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-outline" style={{ flex: 1, height: 40, fontSize: 13 }} onClick={() => setExitModal(false)}>Stay</button>
              <button className="btn-primary" style={{ flex: 1, height: 40, fontSize: 13 }} onClick={() => submitTest(true)}>Submit and Exit</button>
            </div>
          </div>
        </div>
      )}

      <div className="nta-header">
        <span className="nta-logo">Vantiq <span>CUET</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, color: warn ? "#FCD34D" : "#fff", background: warn ? "rgba(220,38,38,.15)" : "transparent", padding: warn ? "4px 10px" : "0", borderRadius: 6, transition: "all .3s" }}>
            &#9201; {fmtTimer(timeLeft)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, textAlign: "right" }}>
            <div style={{ fontWeight: 600 }}>{user?.displayName}</div>
            <button onClick={() => setExitModal(true)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.5)", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-body)", padding: 0 }}>
              Exit Test
            </button>
          </div>
        </div>
      </div>

      <div className="section-bar">
        <span>Section I &mdash; Languages (English)</span>
        <span style={{ marginLeft: "auto" }}>Q {current + 1} of {questions.length}</span>
        <span className="pill pill-navy" style={{ marginLeft: 8 }}>{Object.keys(answers).length} answered</span>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 16px" : "28px 32px" }}>
          {q.passage && (
            <div style={{ borderLeft: "4px solid var(--indigo)", background: "#F5F7FF", borderRadius: "0 8px 8px 0", padding: "16px 20px", marginBottom: 20, fontSize: 13.5, lineHeight: 1.8, color: "var(--text-primary)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--indigo)", marginBottom: 8 }}>Reading Passage</div>
              {q.passage}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
            <span className="pill pill-indigo">{q.topic}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Q.{current + 1}</span>
          </div>
          <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.65, marginBottom: 24 }}>{q.question}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, i) => (
              <div key={i} className={"option-box" + (answers[current] === i ? " selected" : "")} onClick={() => setAnswers(p => ({ ...p, [current]: i }))}>
                <span className="option-key">{String.fromCharCode(65 + i)}</span>
                <span style={{ fontSize: isMobile ? 13 : 14, color: "var(--text-primary)", flex: 1 }}>{opt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop sidebar palette */}
        {!isMobile && (
          <div style={{ width: 196, borderLeft: "1px solid var(--border)", background: "var(--bg-alt)", overflowY: "auto", padding: 16, flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>Question Palette</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {questions.map((_, i) => {
                const ans = answers[i] !== undefined, mrk = marked.has(i), cur = i === current;
                let bg = "#fff", bc = "var(--border)", cl = "var(--text-secondary)";
                if (ans && mrk) { bg = "#FEF3C7"; bc = "var(--amber)"; cl = "var(--amber)"; }
                else if (ans)   { bg = "#ECFDF5"; bc = "var(--success)"; cl = "var(--success)"; }
                else if (mrk)   { bg = "#FFFBEB"; bc = "var(--amber)"; cl = "var(--amber)"; }
                return (
                  <button key={i} onClick={() => setCurrent(i)} style={{ width: 30, height: 30, border: `2px solid ${cur ? "var(--indigo)" : bc}`, borderRadius: 4, background: bg, color: cl, fontSize: 11, fontWeight: cur ? 700 : 500, fontFamily: "var(--font-mono)", cursor: "pointer", boxShadow: cur ? "0 0 0 2px var(--indigo)" : "none", transition: "all .12s" }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 16 }}>
              <div>&#x1F7E9; Answered</div><div>&#x1F7E8; Marked</div><div>&#x2B1C; Not visited</div>
            </div>
            <button className="btn-primary" onClick={() => submitTest(false)} style={{ width: "100%", fontSize: 12, height: 38, marginTop: "auto" }}>
              Submit Test
            </button>
          </div>
        )}
      </div>

      {/* Mobile palette modal */}
      {isMobile && showPalette && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.7)", zIndex: 998, display: "flex", alignItems: "flex-end" }} onClick={() => setShowPalette(false)}>
          <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 16px 32px", width: "100%", maxHeight: "60vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>Question Palette</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{Object.keys(answers).length}/{questions.length} answered</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {questions.map((_, i) => {
                const ans = answers[i] !== undefined, mrk = marked.has(i), cur = i === current;
                let bg = "#fff", bc = "var(--border)", cl = "var(--text-secondary)";
                if (ans && mrk) { bg = "#FEF3C7"; bc = "var(--amber)"; cl = "var(--amber)"; }
                else if (ans)   { bg = "#ECFDF5"; bc = "var(--success)"; cl = "var(--success)"; }
                else if (mrk)   { bg = "#FFFBEB"; bc = "var(--amber)"; cl = "var(--amber)"; }
                return (
                  <button key={i} onClick={() => { setCurrent(i); setShowPalette(false); }} style={{ width: 36, height: 36, border: `2px solid ${cur ? "var(--indigo)" : bc}`, borderRadius: 4, background: bg, color: cl, fontSize: 12, fontWeight: cur ? 700 : 500, fontFamily: "var(--font-mono)", cursor: "pointer" }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <button className="btn-primary full" onClick={() => { setShowPalette(false); submitTest(false); }}>Submit Test</button>
          </div>
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--border)", background: "#fff", padding: isMobile ? "10px 16px" : "12px 32px", display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
        <button className="btn-amber" onClick={() => setMarked(p => { const n = new Set(p); n.has(current) ? n.delete(current) : n.add(current); return n; })}>
          {marked.has(current) ? "✓ Marked" : "Mark"}
        </button>
        {isMobile && (
          <button onClick={() => setShowPalette(true)} style={{ height: 36, padding: "0 12px", border: "1.5px solid var(--border)", borderRadius: 6, background: "#fff", fontSize: 12, fontWeight: 600, color: "var(--navy)", cursor: "pointer", fontFamily: "var(--font-body)" }}>
            Questions ({Object.keys(answers).length}/{questions.length})
          </button>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: isMobile ? 8 : 10 }}>
          <button
            onClick={() => current > 0 && setCurrent(c => c - 1)}
            style={{ height: 36, padding: "0 14px", border: "1.5px solid var(--border)", borderRadius: 6, background: "#fff", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", cursor: current > 0 ? "pointer" : "not-allowed", opacity: current > 0 ? 1 : 0.4, fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 4 }}
          >
            ← {!isMobile && "Back"}
          </button>
          <button className="btn-navy-sm" onClick={() => { if (current < questions.length - 1) setCurrent(c => c + 1); else showToast("Last question. Submit when ready.", "info"); }}>
            {isMobile ? "Next →" : "Save & Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RESULTS SCREEN ────────────────────────────────────────────────────────────
function ResultsScreen({ questions, answers, config, user, onNewTest, onReview }) {
  const [analysis, setAnalysis]  = useState(null);
  const [aLoading, setALoading]  = useState(true);

  useEffect(() => { logEvent("page_view", { page: "results" }); }, []);

  let correct = 0, wrong = 0, unanswered = 0, totalScore = 0;
  questions.forEach((q, i) => {
    if (answers[i] === undefined) unanswered++;
    else if (answers[i] === q.correct) { correct++; totalScore += MARKS_CORRECT; }
    else { wrong++; totalScore += MARKS_WRONG; }
  });
  const attempted  = correct + wrong;
  const maxScore   = questions.length * MARKS_CORRECT;
  const pct        = Math.round((totalScore / maxScore) * 100);
  const accuracy   = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  const topicStats = {};
  questions.forEach((q, i) => {
    if (!topicStats[q.topic]) topicStats[q.topic] = { att: 0, cor: 0 };
    if (answers[i] !== undefined) {
      topicStats[q.topic].att++;
      if (answers[i] === q.correct) topicStats[q.topic].cor++;
    }
  });
  const topicRows = Object.entries(topicStats)
    .map(([t, s]) => ({ topic: t, attempted: s.att, correct: s.cor, accuracy: s.att > 0 ? Math.round((s.cor / s.att) * 100) : 0 }))
    .sort((a, b) => a.accuracy - b.accuracy);

  useEffect(() => {
    async function fetchAnalysis() {
      setALoading(true);
      try {
        if (!CF_BASE) {
          setAnalysis("Review your answers below to identify improvement areas. Focus on your weakest topic first.");
          return;
        }
        const token = await getAuthToken();
        const prompt = `You are a CUET English expert. Give a concise 3-4 sentence performance analysis for a student who scored ${pct}% (${correct}/${questions.length} correct, ${wrong} wrong, ${unanswered} unanswered) in ${config?.mode} mode. Weakest topic: ${topicRows[0]?.topic} at ${topicRows[0]?.accuracy}% accuracy. Give specific actionable advice. Be encouraging but honest. Do not mention AI or any generation tool.`;
        const res = await fetch(`${CF_BASE}/generateAdvisory`, {
          method: "POST", headers: authHeaders(token),
          body: JSON.stringify({ prompt }),
        });
        const d = await res.json();
        setAnalysis(d?.text || "Keep practising — consistency leads to improvement.");
      } catch(_) { setAnalysis("Review your answers below to identify improvement areas."); }
      finally { setALoading(false); }
    }
    fetchAnalysis();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="nta-header">
        <span className="nta-logo">Vantiq <span>CUET</span></span>
        <span className="pill pill-indigo" style={{ fontSize: 11 }}>{config?.mode}</span>
      </div>
      <div style={{ flex: 1, maxWidth: 860, margin: "0 auto", width: "100%", padding: "28px 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)", marginBottom: 24 }}>
          Test Performance Report
        </h1>

        <div className="card" style={{ padding: "28px 32px", marginBottom: 20, display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Total Score</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 48, fontWeight: 700, color: scoreColor(pct), lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, color: "var(--navy)", marginTop: 4 }}>{totalScore} / {maxScore}</div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { l: "Attempted", v: attempted, c: "pill-navy" },
              { l: "Correct",   v: correct,   c: "pill-green" },
              { l: "Accuracy",  v: `${accuracy}%`, c: "pill-indigo" },
              { l: "Wrong",     v: wrong,      c: "pill-red" },
              { l: "Skipped",   v: unanswered, c: "pill-amber" },
            ].map(s => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div className={"pill " + s.c} style={{ height: "auto", padding: "4px 12px", fontSize: 18, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)" }}>
              Topic Breakdown <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>(weakest first)</span>
            </h3>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-alt)" }}>
                {["Topic", "Attempted", "Correct", "Accuracy %"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-secondary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topicRows.map((r, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{r.topic}</td>
                  <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)" }}>{r.attempted}</td>
                  <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)" }}>{r.correct}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 700, fontFamily: "var(--font-mono)", color: scoreColor(r.accuracy) }}>{r.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: "20px 24px", marginBottom: 28 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)", marginBottom: 12 }}>Performance Review</h3>
          {aLoading ? (
            <div>
              <div className="pbar-track"><div className="pbar-fill" /></div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Preparing your performance breakdown...</p>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{analysis}</p>
          )}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-outline" style={{ flex: 1 }} onClick={onReview}>Review Answers</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={onNewTest}>New Test Paper</button>
        </div>
      </div>
    </div>
  );
}

// ── REVIEW SCREEN ─────────────────────────────────────────────────────────────
function ReviewScreen({ questions, answers, onBack }) {
  useEffect(() => { logEvent("page_view", { page: "review" }); }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="nta-header">
        <span className="nta-logo">Vantiq <span>CUET</span></span>
        <button onClick={onBack} style={{ background: "transparent", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 6, padding: "4px 14px", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)" }}>
          ← Back to Report
        </button>
      </div>
      <div style={{ flex: 1, maxWidth: 800, margin: "0 auto", width: "100%", padding: "28px 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--navy)", marginBottom: 24 }}>Answer Review</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {questions.map((q, i) => {
            const ua = answers[i], ok = ua === q.correct, skip = ua === undefined;
            const bc = skip ? "var(--border)" : ok ? "var(--success)" : "var(--danger)";
            return (
              <div key={i} style={{ borderLeft: `4px solid ${bc}`, background: "#fff", borderRadius: "0 10px 10px 0", padding: "20px 20px 16px", boxShadow: "var(--card-shadow)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <span className="pill pill-navy" style={{ fontSize: 10 }}>Q.{i + 1}</span>
                  <span className="pill pill-indigo" style={{ fontSize: 10 }}>{q.topic}</span>
                  {skip && <span className="pill pill-amber" style={{ fontSize: 10 }}>Skipped</span>}
                  {!skip && ok && <span className="pill pill-green" style={{ fontSize: 10 }}>+5</span>}
                  {!skip && !ok && <span className="pill pill-red" style={{ fontSize: 10 }}>&minus;1</span>}
                </div>
                {q.passage && (
                  <div style={{ background: "#F5F7FF", borderLeft: "3px solid var(--indigo)", padding: "10px 14px", borderRadius: "0 6px 6px 0", fontSize: 12.5, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 10 }}>
                    <em>Passage: {q.passage.substring(0, 200)}...</em>
                  </div>
                )}
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 14 }}>{q.question}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {q.options.map((opt, oi) => {
                    const isUser = ua === oi, isRight = q.correct === oi;
                    let cls = "";
                    if (isRight) cls = "correct";
                    else if (isUser && !isRight) cls = "wrong";
                    return (
                      <div key={oi} className={"option-box" + (cls ? " " + cls : "")} style={{ cursor: "default" }}>
                        <span className="option-key">{String.fromCharCode(65 + oi)}</span>
                        <span style={{ fontSize: 13, flex: 1 }}>{opt}</span>
                        {isRight && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--success)", marginLeft: 8 }}>✓ Correct</span>}
                        {isUser && !isRight && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--danger)", marginLeft: 8 }}>✗ Your Answer</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-muted)", marginBottom: 8, flexWrap: "wrap" }}>
                  {!skip && <span>Your Answer: <span style={{ color: ok ? "var(--success)" : "var(--danger)" }}>{String.fromCharCode(65 + ua)} — {q.options[ua]}</span></span>}
                  <span>Correct Answer: <span style={{ color: "var(--success)" }}>{String.fromCharCode(65 + q.correct)} — {q.options[q.correct]}</span></span>
                </div>
                {q.explanation && (
                  <div style={{ background: "var(--bg-alt)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 14px", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.65 }}>
                    <span style={{ fontWeight: 600, color: "var(--navy)", marginRight: 4 }}>Explanation:</span>{q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button className="btn-primary" style={{ marginTop: 28, width: "100%" }} onClick={onBack}>
          ← Back to Performance Report
        </button>
      </div>
    </div>
  );
}

// ── Question Generator ────────────────────────────────────────────────────────
async function generateQuestions(config, uid) {
  // Server-side handles all prompt building — client sends config only
  if (CF_BASE) {
    const token = await getAuthToken();
    const res = await fetch(`${CF_BASE}/generateQuestions`, {
      method: "POST", headers: authHeaders(token),
      body: JSON.stringify({ uid, config }),
    });
    const d = await res.json();
    if (d.paywall) throw Object.assign(new Error("Paywall"), { paywall: true });
    if (!d.questions) throw new Error(d.error || "Generation failed");
    return d.questions;
  }
  throw new Error("Cloud Function URL not configured. Set VITE_CLOUD_FUNCTION_BASE in environment variables.");
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,      setScreen]     = useState("auth");
  const [user,        setUser]       = useState(null);
  const [userData,    setUserData]   = useState(null);
  const [testHistory, setHistory]    = useState([]);
  const [testConfig,  setConfig]     = useState(null);
  const [questions,   setQuestions]  = useState([]);
  const [answers,     setAnswers]    = useState({});
  const [toast,       setToast]      = useState(null);
  const [authLoading, setAuthLoad]   = useState(true);

  const showToast = (message, type = "info") => setToast({ message, type, key: Date.now() });

  async function loadUserData(u) {
    if (!db) return; // Firebase not configured — skip
    try {
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) setUserData(snap.data());
      const q = query(collection(db, "tests"), where("uid", "==", u.uid), orderBy("completedAt", "desc"), limit(10));
      const hs = await getDocs(q);
      setHistory(hs.docs.map(d => d.data()));
    } catch(e) { /* Firestore unavailable — continue without history */ }
  }

  useEffect(() => {
    // If Firebase not configured — go straight to auth screen (localStorage-only mode)
    if (!auth) { setAuthLoad(false); setScreen("auth"); return; }
    return onAuthStateChanged(auth, async u => {
      if (u) { setUser(u); await loadUserData(u); setScreen("dashboard"); }
      else { setUser(null); setUserData(null); setHistory([]); setScreen("auth"); }
      setAuthLoad(false);
    });
  }, []);

  // ── localStorage freemium fallback (works without Firebase credentials)
  function getLocalTestCount() {
    try { return parseInt(localStorage.getItem("cuet_tests_used") || "0"); } catch(_) { return 0; }
  }
  function incrementLocalTestCount() {
    try { localStorage.setItem("cuet_tests_used", String(getLocalTestCount() + 1)); } catch(_) {}
  }
  function getLocalUnlocked() {
    try { return localStorage.getItem("cuet_unlocked") === "true"; } catch(_) { return false; }
  }

  async function handleBeginTest(config) {
    setConfig(config); setScreen("generating");
    logEvent("test_started", { user_id: user?.uid, mode: config.mode });
    try {
      const qs = await generateQuestions(config, user?.uid);
      if (!qs || qs.length < 10) throw new Error("Invalid question set");
      setQuestions(qs); setAnswers({}); setScreen("exam");
      // Update count — Firestore (authoritative) + localStorage (fallback)
      try {
        await updateDoc(doc(db, "users", user.uid), { testsUsed: (userData?.testsUsed || 0) + 1 });
      } catch(_) { /* Firestore not configured yet — localStorage is the fallback */ }
      incrementLocalTestCount();
      setUserData(p => ({ ...p, testsUsed: (p?.testsUsed || 0) + 1 }));
    } catch(e) {
      if (e.paywall) { showToast("Test limit reached — unlock to continue.", "error"); }
      else { showToast("Could not generate test. Please try again.", "error"); }
      setScreen("dashboard");
    }
  }

  async function handleSubmitTest(submittedAnswers) {
    setAnswers(submittedAnswers);
    let correct = 0, wrong = 0, total = 0;
    questions.forEach((q, i) => {
      if (submittedAnswers[i] !== undefined) {
        if (submittedAnswers[i] === q.correct) { correct++; total += MARKS_CORRECT; }
        else { wrong++; total += MARKS_WRONG; }
      }
    });
    const accuracy = (correct + wrong) > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;
    try {
      await addDoc(collection(db, "tests"), {
        uid: user.uid, mode: testConfig?.mode, totalScore: total,
        correct, wrong, attempted: correct + wrong, accuracy, score: accuracy,
        completedAt: serverTimestamp(),
      });
      await loadUserData(user);
    } catch(_) { /* non-blocking — results still show */ }
    setScreen("results");
  }

  if (authLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
      <div className="pbar-track" style={{ width: 200 }}><div className="pbar-fill" /></div>
    </div>
  );

  return (
    <React.Fragment>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      {screen === "auth"       && <AuthScreen      onLogin={u => { setUser(u); loadUserData(u); setScreen("dashboard"); }} showToast={showToast} />}
      {screen === "dashboard"  && <DashboardScreen user={user} userData={userData} testHistory={testHistory} onBeginTest={handleBeginTest} onLogout={() => auth ? signOut(auth) : setScreen("auth")} showToast={showToast} />}
      {screen === "generating" && <GeneratingScreen config={testConfig} />}
      {screen === "exam"       && <ExamScreen      questions={questions} config={testConfig} user={user} onSubmit={handleSubmitTest} showToast={showToast} />}
      {screen === "results"    && <ResultsScreen   questions={questions} answers={answers} config={testConfig} user={user} onNewTest={() => setScreen("dashboard")} onReview={() => setScreen("review")} />}
      {screen === "review"     && <ReviewScreen    questions={questions} answers={answers} onBack={() => setScreen("results")} />}
    </React.Fragment>
  );
}
