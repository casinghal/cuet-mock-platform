/**
 * CUET Mock Test Platform — App.jsx v2.0
 * React + Firebase + Razorpay + GA4
 * Subject: English 101 | CUET UG 2026
 * All 6 screens: auth, dashboard, generating, exam, results, review
 */

import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// ── Google Fonts ──────────────────────────────────────────────────────────────
if (!document.getElementById("cuet-fonts")) {
  const l = document.createElement("link");
  l.id = "cuet-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Poppins:wght@400;500;600;700&display=swap";
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
.btn-primary{background:linear-gradient(180deg,#1a3a6b 0%,#0F2747 100%);color:#fff;height:44px;padding:0 24px;border-radius:8px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 0 #07192e,0 6px 12px rgba(15,39,71,0.35),inset 0 1px 0 rgba(255,255,255,0.12);transition:all .12s;border:1px solid #0a1e3a;}
.btn-primary:hover{background:linear-gradient(180deg,#20467f 0%,#163356 100%);box-shadow:0 4px 0 #07192e,0 8px 16px rgba(15,39,71,0.4),inset 0 1px 0 rgba(255,255,255,0.15);transform:translateY(-1px);}
.btn-primary:active{transform:translateY(3px);box-shadow:0 1px 0 #07192e,0 2px 4px rgba(15,39,71,0.2),inset 0 1px 0 rgba(255,255,255,0.08);}
.btn-primary:disabled{background:var(--text-muted);box-shadow:none;cursor:not-allowed;border-color:transparent;}
.btn-primary.full{width:100%;}
.btn-amber{background:#FFFBEB;color:var(--amber);border:1px solid #FDE68A;height:36px;padding:0 16px;border-radius:6px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;transition:background .15s;}
.btn-amber:hover{background:#FEF3C7;}
.btn-navy-sm{background:linear-gradient(180deg,#1a3a6b 0%,#0F2747 100%);color:#fff;height:36px;padding:0 18px;border-radius:6px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;box-shadow:0 3px 0 #07192e,0 5px 8px rgba(15,39,71,0.3),inset 0 1px 0 rgba(255,255,255,0.1);transition:all .12s;border:1px solid #0a1e3a;}
.btn-navy-sm:hover{transform:translateY(-1px);box-shadow:0 4px 0 #07192e,0 7px 12px rgba(15,39,71,0.35),inset 0 1px 0 rgba(255,255,255,0.12);}
.btn-navy-sm:active{transform:translateY(2px);box-shadow:0 1px 0 #07192e,0 2px 4px rgba(15,39,71,0.2);}
.btn-outline{background:linear-gradient(180deg,#fff 0%,#f0f4fa 100%);color:var(--navy);border:1.5px solid #c5d3e8;height:44px;padding:0 24px;border-radius:8px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 3px 0 #c5d3e8,0 5px 10px rgba(15,39,71,0.1),inset 0 1px 0 rgba(255,255,255,0.9);transition:all .12s;}
.btn-outline:hover{background:linear-gradient(180deg,#f0f4fa 0%,#e2eaf6 100%);box-shadow:0 3px 0 #b0c2d8,0 6px 12px rgba(15,39,71,0.15),inset 0 1px 0 rgba(255,255,255,0.9);transform:translateY(-1px);}
.btn-outline:active{transform:translateY(2px);box-shadow:0 1px 0 #b0c2d8,inset 0 1px 0 rgba(255,255,255,0.7);}
@keyframes indeterminate{0%{transform:translateX(-100%) scaleX(.5)}50%{transform:translateX(0) scaleX(.5)}100%{transform:translateX(100%) scaleX(.5)}}
@keyframes pillGlow{0%,100%{box-shadow:0 0 0 0 rgba(110,231,183,0);}50%{box-shadow:0 0 0 4px rgba(110,231,183,0.18),0 0 16px rgba(110,231,183,0.12);}}
@keyframes caretBlink{0%,100%{opacity:1;}50%{opacity:0;}}
@keyframes hookGlow{0%,100%{text-shadow:0 0 12px rgba(251,191,36,0.5),0 0 24px rgba(251,191,36,0.2);}50%{text-shadow:0 0 20px rgba(251,191,36,0.8),0 0 40px rgba(251,191,36,0.35);}}
@keyframes hookFadeIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}
@keyframes fadeSlideUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
@keyframes liveDot{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.35;transform:scale(0.8);}}
@keyframes shimmerChip{0%{transform:translateX(-120%);}100%{transform:translateX(400%);}}
@keyframes scanLine{0%{left:-20%;}100%{left:115%;}}
@keyframes recencyPop{from{opacity:0;transform:translateY(5px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}
@keyframes valueIn{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:translateX(0);}}
@keyframes recoveryGlow{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0);}50%{box-shadow:0 0 24px rgba(99,102,241,0.25),0 0 48px rgba(99,102,241,0.1);}}
.eyebrow-live{animation:pillGlow 2.4s ease-in-out infinite;}
@keyframes livePulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(5,150,105,0);}60%{opacity:.55;box-shadow:0 0 0 5px rgba(5,150,105,0.12);}}
.typewriter-caret{display:inline-block;width:2px;height:1em;background:rgba(255,255,255,0.7);margin-left:2px;vertical-align:text-bottom;animation:caretBlink 0.8s step-end infinite;}
.hook-caret{display:inline-block;width:2px;height:0.9em;background:#FBBF24;margin-left:2px;vertical-align:text-bottom;animation:caretBlink 0.7s step-end infinite;}
.hook-text{animation:hookGlow 2s ease-in-out infinite,hookFadeIn 0.3s ease-out;}
.live-pulse-dot{animation:liveDot 1.6s ease-in-out infinite;}
.feature-stagger{opacity:0;}.feature-stagger.vis{animation:fadeSlideUp 0.45s ease-out forwards;}
.feature-stagger:nth-child(1).vis{animation-delay:0ms;}.feature-stagger:nth-child(2).vis{animation-delay:130ms;}.feature-stagger:nth-child(3).vis{animation-delay:260ms;}
.proof-stagger{opacity:0;}.proof-stagger.vis{animation:fadeSlideUp 0.4s ease-out forwards;}
.proof-stagger:nth-child(1).vis{animation-delay:0ms;}.proof-stagger:nth-child(2).vis{animation-delay:90ms;}.proof-stagger:nth-child(3).vis{animation-delay:180ms;}.proof-stagger:nth-child(4).vis{animation-delay:270ms;}.proof-stagger:nth-child(5).vis{animation-delay:360ms;}
.value-stagger{opacity:0;}.value-stagger.vis{animation:valueIn 0.35s ease-out forwards;}
.value-stagger:nth-child(1).vis{animation-delay:0ms;}.value-stagger:nth-child(2).vis{animation-delay:110ms;}.value-stagger:nth-child(3).vis{animation-delay:220ms;}.value-stagger:nth-child(4).vis{animation-delay:330ms;}
.chip-prep-shimmer{position:relative;overflow:hidden;}.chip-prep-shimmer::after{content:'';position:absolute;top:0;left:-80%;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.35),transparent);animation:shimmerChip 2.4s ease-in-out infinite;}
.recency-pop{animation:recencyPop 0.5s 0.9s ease-out both;}
.below-vis{opacity:0;}.below-vis.vis{animation:fadeSlideUp 0.55s ease-out forwards;}
.below-vis:nth-child(1).vis{animation-delay:0ms;}.below-vis:nth-child(2).vis{animation-delay:150ms;}
.recovery-glow{animation:recoveryGlow 3.5s ease-in-out infinite;}
.topic-bar{width:0%;transition:width 1.1s cubic-bezier(0.25,0.46,0.45,0.94);}
.pbar-track{width:100%;height:4px;background:#E0E7FF;border-radius:2px;overflow:hidden;}
.pbar-fill{height:100%;background:var(--indigo);border-radius:2px;animation:indeterminate 1.6s ease-in-out infinite;transform-origin:left;}
.option-box{display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border:1.5px solid var(--border);border-radius:4px;cursor:pointer;transition:border-color .12s,background .12s;background:#fff;}
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
  .nta-header{padding:0 12px;height:48px;}
  /* Analytics zone — reduce padding on mobile */
  .az-card{padding:12px 14px !important;}
  .nta-logo{font-size:14px;}
  /* Section bar: truncate long labels — GAT label is very long */
  .section-bar{padding:5px 12px;font-size:11px;overflow:hidden;}
  .section-bar span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1;}
  .modal-box{padding:20px 16px;}
  .btn-primary{font-size:13px;height:40px;}
  .btn-navy-sm{font-size:12px;height:32px;padding:0 12px;}
  .btn-amber{font-size:12px;height:32px;padding:0 10px;}
  /* Option boxes: prevent text overflow */
  .option-box{padding:11px 12px;font-size:13px;min-width:0;}
  .option-box span:last-child{min-width:0;word-break:break-word;}
  table{font-size:12px;}
  th,td{padding:7px 8px !important;}
  /* Dashboard stat strip */
  .stat-strip{flex-wrap:wrap;gap:8px;}
  .stat-item{min-width:calc(50% - 4px);}
  /* Exam palette — full width on mobile */
  .palette-grid{grid-template-columns:repeat(8,1fr) !important;}
  /* Results topic table */
  .topic-table th,.topic-table td{padding:6px 8px !important;font-size:11px;}
  /* Toast */
  .toast{left:12px;right:12px;bottom:16px;font-size:12px;}
  /* Results stat pills — smaller on mobile */
  .result-stat-pill{font-size:14px !important;padding:3px 10px !important;}
  /* Review screen answer lines */
  .review-answer{flex-wrap:wrap;gap:4px !important;}
  /* Feedback button — move up to avoid nav bar */
  .feedback-float{bottom:80px !important;}
}
@media(max-width:420px){
  .nta-header{padding:0 10px;height:44px;}
  .nta-logo{font-size:13px;}
  .option-box{padding:10px 11px;font-size:12px;}
  .palette-grid{grid-template-columns:repeat(6,1fr) !important;}
  /* Bottom nav: wrap to 2 rows on tiny screens */
  .exam-footer{flex-wrap:wrap;gap:6px !important;}
  .exam-footer-right{width:100%;justify-content:flex-end;}
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
  // App Check — blocks bots from calling Firebase functions directly
  if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    initializeAppCheck(fbApp, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }
} catch(e) {
  console.warn("[Vantiq] Firebase not configured — running in demo/localStorage mode");
  auth = null; db = null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CF_BASE       = import.meta.env.VITE_CLOUD_FUNCTION_BASE || "";
const RZP_KEY_ID    = import.meta.env.VITE_RAZORPAY_KEY_ID;
const FREE_LIMIT    = 4;
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
function PaywallModal({ user, onSuccess, onClose, subject }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function pay() {
    setLoading(true); setError(null);
    // Guard: if Razorpay key is missing, show a clear error — don't silently fail
    if (!RZP_KEY_ID) {
      setError("Payment is not configured. Please contact support.");
      setLoading(false);
      return;
    }
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
            You have used all 4 free {subject === "GAT" ? "GAT" : subject === "Economics" ? "Economics" : "English"} Mock Exams. Unlock unlimited access across all CUET subjects till 30 June 2026.
          </p>
        </div>
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)" }}>Full Platform Access</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)", fontFamily: "var(--font-mono)" }}>&#8377;199</span>
          </div>
          {["Unlimited Mock Exams every day till 30 June", "Quick Practice free forever — even without paying", "Topic-wise breakdown after every test", "Less than one coaching class. One-time. No renewals."].map(f => (
            <div key={f} style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <span style={{ color: "var(--success)" }}>&#10003;</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{f}</span>
            </div>
          ))}
        </div>
        {error && (() => {
          if (error.startsWith("__PERMANENTLY_BLOCKED__:")) {
            const reason = error.replace("__PERMANENTLY_BLOCKED__:", "");
            return (
              <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"16px 18px", marginTop:10, textAlign:"left" }}>
                <div style={{ fontWeight:700, color:"#DC2626", fontSize:13, marginBottom:6 }}>⛔ Account Permanently Blocked</div>
                <div style={{ color:"#7F1D1D", fontSize:12, lineHeight:1.6 }}>{reason}</div>
                <div style={{ color:"#94A3B8", fontSize:11, marginTop:8 }}>Contact support if you believe this is an error.</div>
              </div>
            );
          }
          if (error.startsWith("__TEMPORARILY_BLOCKED__:")) {
            const parts = error.replace("__TEMPORARILY_BLOCKED__:", "").split(":");
            const mins = parts[0];
            const reason = parts.slice(1).join(":");
            return (
              <div style={{ background:"#FEF3C7", border:"1px solid #FCD34D", borderRadius:10, padding:"16px 18px", marginTop:10, textAlign:"left" }}>
                <div style={{ fontWeight:700, color:"#D97706", fontSize:13, marginBottom:6 }}>⚠️ Account Temporarily Suspended</div>
                <div style={{ color:"#78350F", fontSize:12, lineHeight:1.6 }}>{reason || "Unusual activity was detected on your account."}</div>
                <div style={{ color:"#92400E", fontSize:12, marginTop:8, fontWeight:600 }}>You can try again in {mins} minute{mins!=="1"?"s":""}.</div>
                <div style={{ color:"#94A3B8", fontSize:11, marginTop:6 }}>Repeated violations will result in a permanent ban.</div>
              </div>
            );
          }
          return <div className="error-msg">{error}</div>;
        })()}
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
// ── Subjects catalogue — single source of truth for both AuthScreen and DashboardScreen ──
// Flip live: false → true when a subject is ready to launch
const SUBJECTS = [
  { name: "English (101)",               live: true  },
  { name: "General Aptitude Test (GAT)", live: true  }, // GAT is live
  { name: "Economics (118)",             live: true  }, // LIVE — Economics IED engine deployed
];

function AuthScreen({ onLogin, showToast }) {
  const [loading, setLoading] = useState(null);
  const [error,   setError]   = useState(null);
  const [mode,    setMode]    = useState("login");
  const isMobile = useMobile();

  // ── Cycling typewriter hook — above auth card, keeps moving ─────────────────
  const HOOK_LINES = [
    "Every test paper is new. No recycled content, ever.",
    "No old PDFs. Questions built to the current NTA pattern — not last year's.",
    "Every question reflects the current NTA exam pattern.",
    "Built fresh for CUET 2026 — not last year's coaching material.",
    "The platform reads the syllabus. You take the test.",
    "Economics 2026 has a brand-new IED section. We cover it. No one else does yet.",
    "Indian Economic Development is new in CUET 2026 — no past papers exist anywhere. We built them.",
    "IED question bank refreshed every week. Be the student who prepared while others guessed.",
  ];
  const [hookIdx,   setHookIdx]   = useState(0);
  const [hookText,  setHookText]  = useState("");
  const [hookPhase, setHookPhase] = useState("typing"); // "typing" | "pausing" | "deleting"
  useEffect(() => {
    const full = HOOK_LINES[hookIdx];
    let timer;
    if (hookPhase === "typing") {
      if (hookText.length < full.length) {
        timer = setTimeout(() => setHookText(full.slice(0, hookText.length + 1)), 32);
      } else {
        timer = setTimeout(() => setHookPhase("pausing"), 1800);
      }
    } else if (hookPhase === "pausing") {
      timer = setTimeout(() => setHookPhase("deleting"), 400);
    } else if (hookPhase === "deleting") {
      if (hookText.length > 0) {
        timer = setTimeout(() => setHookText(hookText.slice(0, -1)), 16);
      } else {
        setHookIdx(i => (i + 1) % HOOK_LINES.length);
        setHookPhase("typing");
      }
    }
    return () => clearTimeout(timer);
  }, [hookText, hookPhase, hookIdx]);

  useEffect(() => { logEvent("page_view", { page: "auth" }); }, []);

  async function ensureUserDoc(user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid, email: user.email, displayName: user.displayName,
        photoURL: user.photoURL, createdAt: serverTimestamp(),
        // testsUsed intentionally omitted — Firestore create rule blocks it;
        // CF increments via admin SDK on test start
      });
    } else {
      const data = snap.data();
      // ── Block checks ────────────────────────────────────────────────────────
      if (data.blocked) {
        const err = new Error("PERMANENTLY_BLOCKED");
        err.blockType = "permanent";
        err.blockReason = data.blockReason || "Your account has been permanently blocked.";
        throw err;
      }
      if (data.blockedUntil) {
        const until = data.blockedUntil.toDate ? data.blockedUntil.toDate() : new Date(data.blockedUntil);
        if (until > new Date()) {
          const minsLeft = Math.ceil((until - new Date()) / 60000);
          const err = new Error("TEMPORARILY_BLOCKED");
          err.blockType = "temporary";
          err.minutesLeft = minsLeft;
          err.blockReason = data.blockReason || `Access suspended for ${minsLeft} more minutes.`;
          throw err;
        }
      }
      // Update profile fields on every login
      if (!data.email || !data.displayName) {
        await setDoc(ref, {
          email: user.email, displayName: user.displayName, photoURL: user.photoURL,
        }, { merge: true });
      }
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
    } catch(e) {
      // Sign out silently so Google session doesn't persist on block
      try { if (auth) await import("firebase/auth").then(m => m.signOut(auth)); } catch(_) {}
      if (e.blockType === "permanent") {
        setError("__PERMANENTLY_BLOCKED__:" + (e.blockReason || "Your account has been permanently blocked."));
      } else if (e.blockType === "temporary") {
        setError("__TEMPORARILY_BLOCKED__:" + e.minutesLeft + ":" + (e.blockReason || ""));
      } else {
        setError(e.message || "Google sign-in failed. Try again.");
      }
    }
    finally { setLoading(null); }
  }

  const subjects = SUBJECTS; // use module-level constant — keeps landing page and dashboard in sync

  // CUET-LIVE-PREMIUM: Weak Area Report first — most differentiating feature
  const features = [
    { icon: "⚡", title: "Instant Weak Area Report",  desc: "Know exactly which topics hurt you the moment you submit — sorted weakest first. No guesswork. Act on it immediately.", top: true },
    { icon: "✨", title: "Lifetime Free Mock Papers", desc: "15-question practice papers — free forever, no card needed, no limits. Test yourself daily." },
    { icon: "✅", title: "Exact NTA Pattern",        desc: "+5 correct, −1 wrong. Same interface, same marking, same pressure as the real exam. Not a simulation — a replica." },
  ];

  // IntersectionObserver for stagger animations
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("vis"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    // Observe staggered elements after mount
    const timer = setTimeout(() => {
      document.querySelectorAll(".feature-stagger, .proof-stagger, .value-stagger, .below-vis").forEach(el => io.observe(el));
      // Topic bars in below-fold
      document.querySelectorAll(".topic-bar[data-w]").forEach((bar, i) => {
        setTimeout(() => { bar.style.width = bar.dataset.w; }, 400 + i * 140);
      });
    }, 100);
    return () => { clearTimeout(timer); io.disconnect(); };
  }, []);

  // Inline styles for the premium landing
  const S = {
    page: {
      minHeight: "100vh",
      // ORIGINAL NAVY (restore): "linear-gradient(135deg, #080F1E 0%, #0D1B3E 50%, #0A1628 100%)"
      // CHARCOAL GREY (restore): "linear-gradient(135deg, #1C1C1C 0%, #2A2A2A 50%, #232323 100%)"
      background: "#000000", // black
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

      {/* Top nav — CUET-LIVE-PREMIUM: added LIVE indicator */}
      <nav style={S.nav}>
        <span style={S.navLogo}>
          Vantiq <span style={S.navLogoAccent}>CUET</span>
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 10px", borderRadius:20, border:"1px solid rgba(110,231,183,0.25)", background:"rgba(110,231,183,0.07)", fontSize:10, fontWeight:700, letterSpacing:1, color:"#6EE7B7", textTransform:"uppercase" }}>
            <span className="live-pulse-dot" style={{ width:6, height:6, borderRadius:"50%", background:"#6EE7B7", display:"inline-block" }} />
            Live
          </div>
          <span style={S.navBadge}>2026 Edition</span>
        </div>
      </nav>

      {/* Main split layout */}
      <div style={S.main}>

        {/* ── Left: Hero — desktop full / mobile compact strip above auth card ── */}
        {isMobile ? (
          /* ── Mobile hero — compact, above auth card ── */
          <div style={{ marginBottom: 8 }}>

            {/* Eyebrow pill — live subjects */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:7,
              background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.3)",
              color:"#A5B4FC", padding:"5px 12px", borderRadius:20,
              fontSize:11, fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase",
              marginBottom:14, width:"fit-content"
            }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#6EE7B7",
                boxShadow:"0 0 6px #6EE7B7", display:"inline-block" }} />
              English (101) + GAT (501) + Economics (118) Live Now
            </div>

            {/* Headline */}
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(28px,7vw,38px)",
              color:"#FFFFFF", lineHeight:1.15, marginBottom:8, fontStyle:"normal" }}>
              Practice CUET 2026 Mock Tests
              <span style={{ color:"#F59E0B", display:"block" }}>— Free to Start</span>
            </h1>

            <p style={{ fontSize:13, color:"rgba(255,255,255,0.55)", lineHeight:1.6, marginBottom:16 }}>
              NTA-standard papers. Instant analytics. Free to start.
            </p>

            {/* Social proof — horizontal scroll strip */}
            <div style={{ display:"flex", gap:20, marginBottom:16, overflowX:"auto",
              paddingBottom:4, WebkitOverflowScrolling:"touch" }}>
              {[
                { num:"50Q", label:"Per Paper" },
                { num:"+5/−1", label:"NTA Marking" },
                { num:"60min", label:"Timed" },
                { num:"3", label:"Subjects live" },
              ].map(p => (
                <div key={p.label} style={{ display:"flex", flexDirection:"column", gap:2, flexShrink:0 }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:20, fontWeight:700,
                    color: p.live ? "#6EE7B7" : "#FFFFFF", lineHeight:1 }}>{p.num}</span>
                  <span style={{ fontSize:10, color: p.live ? "rgba(110,231,183,0.5)" : "rgba(255,255,255,0.4)",
                    letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{p.label}</span>
                </div>
              ))}
            </div>

            {/* Subject chips */}
            <div style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.35)",
              textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
              Subjects on this platform
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:4 }}>
              {subjects.map(s => {
                const isEcon = s.name.includes("Economics");
                return (
                  <span key={s.name} style={s.live ? {
                    background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.3)",
                    color:"#6EE7B7", padding:"4px 11px", borderRadius:20, fontSize:11, fontWeight:600,
                    display:"flex", alignItems:"center", gap:5,
                  } : {
                    background: isEcon ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.05)",
                    border: isEcon ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(255,255,255,0.1)",
                    color:"rgba(255,255,255,0.35)", padding:"4px 11px", borderRadius:20, fontSize:11,
                  }}>
                    {s.live && <span style={{ width:5, height:5, borderRadius:"50%", background:"#6EE7B7", display:"inline-block" }} />}
                    {s.name}
                    {!s.live && <span style={{ fontSize:9, marginLeft:3, opacity:0.6 }}>{isEcon ? "preparing" : "soon"}</span>}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
        /* ── Desktop hero — full ── */
        <div style={S.hero}>
          <div style={S.eyebrow} className="eyebrow-live">
            <span style={S.dot} />
            Continuously updated · English (101) + GAT (501) + Economics (118) Live Now
          </div>

          <h1 style={S.h1}>
            Practice CUET 2026 Mock Tests
            <span style={S.h1accent}>— Free to Start</span>
          </h1>

          <p style={S.subtext}>
            NTA-standard papers. Instant analytics. Free to start.
          </p>

          {/* Social proof — CUET-LIVE-PREMIUM: stagger reveal + live "Papers today" */}
          <div style={S.proofStrip}>
            {[
              { num: "50Q", label: "Per Test Paper" },
              { num: "6", label: "Topics Covered" },
              { num: "+5/−1", label: "NTA Marking" },
              { num: "60min", label: "Timed Exam" },
              { num: "3", label: "Subjects live" },
            ].map(p => (
              <div key={p.label} style={{ ...S.proofItem }} className="proof-stagger">
                <span style={{ ...S.proofNum, ...(p.live ? { color:"#6EE7B7" } : {}) }}>{p.num}</span>
                <span style={{ ...S.proofLabel, ...(p.live ? { color:"rgba(110,231,183,0.5)" } : {}) }}>{p.label}</span>
              </div>
            ))}
          </div>

          {/* Features — CUET-LIVE-PREMIUM: reordered + stagger + top card accent */}
          <div style={S.featuresGrid}>
            {features.map((f, i) => (
              <div key={f.title} className="feature-stagger" style={{
                ...S.featureRow,
                ...(f.top ? {
                  borderLeft: "2px solid #FBBF24",
                  background: "rgba(251,191,36,0.06)",
                  borderColor: "rgba(251,191,36,0.22)",
                } : {}),
              }}>
                <span style={S.featureIcon}>{f.icon}</span>
                <div>
                  <div style={{ ...S.featureTitle, ...(f.top ? { color:"#FCD34D" } : {}) }}>{f.title}</div>
                  <div style={S.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
        )}

        {/* ── Right: Auth Card ── */}
        <div style={S.authCard}>

          {/* ── Subject Status Block — above typewriter ── */}
          <div style={{ background:"#1C1C1E", borderRadius:12, padding:"14px 16px", marginBottom: isMobile ? 10 : 14, border:"1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(255,255,255,0.35)", marginBottom:10, fontFamily:"'Poppins', sans-serif" }}>Live on this platform</div>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {[
                { code:"101", name:"English", section:"Section IA — Languages" },
                { code:"501", name:"General Aptitude Test", section:"Section III — GAT" },
                { code:"118", name:"Economics", section:"Section II — Domain" },
              ].map(s => (
                <div key={s.code} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#6EE7B7", flexShrink:0, boxShadow:"0 0 5px rgba(110,231,183,0.6)", animation:"livePulse 2.4s ease-in-out infinite" }} />
                  <span style={{ fontFamily:"'Poppins', sans-serif", fontSize:12, fontWeight:600, color:"#FFFFFF", letterSpacing:"0.01em" }}>{s.name}</span>
                  <span style={{ fontFamily:"'Poppins', sans-serif", fontSize:10, color:"rgba(255,255,255,0.35)", marginLeft:"auto", letterSpacing:"0.03em" }}>{s.code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Typewriter hook — always shown, compact on mobile ── */}
          <div style={{ minHeight: isMobile ? 42 : 52, marginBottom: isMobile ? 12 : 18, padding: isMobile ? "8px 12px" : "10px 14px", background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.22)", borderRadius:10, borderLeft:"3px solid #FBBF24" }}>
            <span className="hook-text" style={{ fontSize: isMobile ? 12 : 13, fontWeight:600, color:"#FCD34D", lineHeight:1.5, letterSpacing:0.1, display:"inline" }}>{hookText}</span>
            <span className="hook-caret" />
          </div>

          {/* ── GOOGLE BUTTON — first visible CTA, no scroll required ── */}
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

          {/* Trial badge — below button so CTA is never pushed below fold */}
          <div style={{ ...S.trialBadge, marginTop: 4 }}>
            <span style={S.trialIcon}>&#127381;</span>
            <div style={S.trialText}>
              <span style={S.trialStrong}>4 free Mock Exams per subject.</span>{" "}
              Quick Practice free forever. Unlimited access at ₹199 till 30 June.
            </div>
          </div>

          {/* Value props — all 4 on desktop, top 2 on mobile */}
          <div style={{ marginBottom: 20 }}>
            {[
              "Never the same paper twice",
              "Exact 50-question format, +5/−1 marking",
              "Topic mix calibrated to NTA’s declared weightage",
              "4 free Mock Exams per subject — no card required",
            ].filter((_, i) => !isMobile || i < 2).map((v) => (
              <div key={v} className="value-stagger" style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:7 }}>
                <span style={{ color:"#6EE7B7", fontWeight:700, fontSize:13, marginTop:1, flexShrink:0 }}>✓</span>
                <span style={{ fontSize:13, color:"rgba(255,255,255,0.72)", lineHeight:1.45 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && <div style={S.errorBox}>{error}</div>}

          {/* Trust */}
          <p style={S.trustLine}>
            By continuing you agree to our{" "}
            <a href="/terms"   style={{ color:"rgba(255,255,255,0.6)", textDecoration:"underline" }}>Terms</a>{" & "}
            <a href="/privacy" style={{ color:"rgba(255,255,255,0.6)", textDecoration:"underline" }}>Privacy Policy</a>.
            <br />Your data is safe and never shared.
          </p>
        </div>
      </div>

      {/* ── BELOW-FOLD RECOVERY — CUET-LIVE-PREMIUM P1 ──────────────────────
          Catches students who scrolled past the fold without converting.
          Panel 1: Topic Intelligence (active system signal)
          Panel 2: Recovery CTA (second chance, different angle) */}
      {!isMobile && (
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 32px 72px", position:"relative", zIndex:10 }}>
        {/* Divider */}
        <div style={{ width:"100%", height:1, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)", marginBottom:52 }} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

          {/* Topic Intelligence panel */}
          <div className="below-vis" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"24px 24px 20px", position:"relative", overflow:"hidden" }}>
            {/* Scan-line animation */}
            <div style={{ position:"absolute", top:0, left:"-20%", width:"30%", height:2, background:"linear-gradient(90deg,transparent,rgba(99,102,241,0.7),transparent)", animation:"scanLine 3.2s ease-in-out infinite" }} />
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", color:"rgba(255,255,255,0.35)" }}>Topic Intelligence · English 101</span>
              <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, fontWeight:700, color:"#6EE7B7", letterSpacing:"0.5px", textTransform:"uppercase" }}>
                <span className="live-pulse-dot" style={{ width:5, height:5, borderRadius:"50%", background:"#6EE7B7", display:"inline-block" }} />
                Updating
              </span>
            </div>
            {[
              { name:"Reading Comprehension", pct:"44%", w:"44%", color:"#818CF8" },
              { name:"Synonyms & Antonyms",   pct:"18%", w:"18%", color:"#F59E0B" },
              { name:"Sentence Rearrangement",pct:"14%", w:"14%", color:"#6EE7B7" },
              { name:"Choosing Correct Word", pct:"14%", w:"14%", color:"#60A5FA" },
              { name:"Grammar & Vocabulary",  pct:"10%", w:"10%", color:"#F9A8D4" },
            ].map(t => (
              <div key={t.name} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:12.5, color:"rgba(255,255,255,0.72)", fontWeight:500 }}>{t.name}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"rgba(255,255,255,0.45)" }}>{t.pct}</span>
                </div>
                <div style={{ height:4, background:"rgba(255,255,255,0.07)", borderRadius:2, overflow:"hidden" }}>
                  <div className="topic-bar" data-w={t.w} style={{ height:"100%", borderRadius:2, background:t.color, opacity:0.75 }} />
                </div>
              </div>
            ))}
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.22)", marginTop:6, fontStyle:"italic" }}>Based on NTA's declared weightage. Questions reflect current distribution.</p>
          </div>

          {/* Recovery CTA panel */}
          <div className="below-vis recovery-glow" style={{ background:"rgba(99,102,241,0.07)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:16, padding:"32px 28px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:"rgba(129,140,248,0.65)", marginBottom:14 }}>Still thinking about it?</div>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#fff", lineHeight:1.25, marginBottom:12 }}>
              Your first test takes 30 minutes.<br/>It shows you where you stand.
            </h3>
            <p style={{ fontSize:13.5, color:"rgba(255,255,255,0.5)", lineHeight:1.65, marginBottom:24 }}>
              No setup. No payment. Sign in and your first Quick Practice paper is ready instantly. See exactly which topics need work — before you spend a rupee.
            </p>
            {["Ready in under 10 seconds", "Weak area report after every test", "Different paper every single time"].map(it => (
              <div key={it} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, fontSize:13, color:"rgba(255,255,255,0.6)" }}>
                <span style={{ color:"#6EE7B7", fontWeight:700, fontSize:14 }}>✓</span>{it}
              </div>
            ))}
            <button
              onClick={handleGoogle}
              style={{ marginTop:8, display:"inline-flex", alignItems:"center", gap:10, background:"#fff", color:"#1A1A2E", padding:"12px 22px", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", border:"none", fontFamily:"var(--font-body)", boxShadow:"0 4px 16px rgba(0,0,0,0.3)", alignSelf:"flex-start" }}
              onMouseOver={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.4)"; }}
              onMouseOut={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.3)"; }}
            >
              <GoogleIcon />
              Start for Free
            </button>
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.25)", marginTop:10 }}>No credit card · No commitment</p>
          </div>

        </div>
      </div>
      )}

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

// ── IED Disclaimer Banner — typewriter, shown on Economics dashboard tab ─────
// Informs students that IED is new in 2026 with no past papers.
// Also serves as a hook — "first platform to cover this section."
function IEDDisclaimerBanner() {
  const LINES = [
    "Indian Economic Development is brand new in CUET 2026 — no past papers exist. We built the questions from scratch.",
    "No other platform covers IED yet. Vantiq is first. Every question is purpose-built for CUET 2026.",
    "IED questions are reviewed and refreshed every week as the exam pattern evolves.",
    "Getting ahead on IED now is the smartest move — most students are skipping it. Don't be one of them.",
  ];
  const [idx,   setIdx]   = React.useState(0);
  const [text,  setText]  = React.useState("");
  const [phase, setPhase] = React.useState("typing");

  React.useEffect(() => {
    const full = LINES[idx];
    let t;
    if (phase === "typing") {
      if (text.length < full.length) {
        t = setTimeout(() => setText(full.slice(0, text.length + 1)), 28);
      } else {
        t = setTimeout(() => setPhase("pausing"), 3200);
      }
    } else if (phase === "pausing") {
      t = setTimeout(() => setPhase("deleting"), 400);
    } else {
      if (text.length > 0) {
        t = setTimeout(() => setText(text.slice(0, -1)), 14);
      } else {
        setIdx(i => (i + 1) % LINES.length);
        setPhase("typing");
      }
    }
    return () => clearTimeout(t);
  }, [text, phase, idx]);

  return (
    <div style={{
      padding: "10px 18px 10px 16px",
      borderBottom: "1px solid rgba(99,102,241,0.14)",
      background: "linear-gradient(90deg, rgba(99,102,241,0.06) 0%, rgba(99,102,241,0.02) 100%)",
      borderLeft: "3px solid var(--indigo)",
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <span style={{ fontSize: 14, lineHeight: 1, marginTop: 2, flexShrink: 0 }}>📘</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase", color: "var(--indigo)", marginBottom: 3 }}>
          New in CUET 2026 · Indian Economic Development
        </div>
        <div style={{ fontSize: 12, color: "var(--navy)", fontWeight: 500, lineHeight: 1.5, minHeight: 18 }}>
          {text}<span style={{
            display: "inline-block", width: 1.5, height: "1em",
            background: "var(--indigo)", marginLeft: 1.5, verticalAlign: "text-bottom",
            animation: "caretBlink 0.8s step-end infinite",
          }} />
        </div>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--success)", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "3px 8px", borderRadius: 20, flexShrink: 0, whiteSpace: "nowrap" }}>
        Refreshed weekly
      </div>
    </div>
  );
}

// ── DASHBOARD SCREEN ──────────────────────────────────────────────────────────
function DashboardScreen({ user, userData, testHistory, onBeginTest, onReviewTest, onViewAnalytics, onLogout, showToast, subjects, showPaywallOverride, setShowPaywallOverride }) {
  const [mode,          setMode]          = useState(null);   // null = no selection yet
  const [activeSubject, setActiveSubject] = useState(null);   // null = no selection yet
  // showPaywall can be triggered from inside (handleBegin gate) or outside (handleBeginTest 402 catch)
  const [showPaywallLocal, setShowPaywallLocal] = useState(false);
  const showPaywall    = showPaywallLocal || (showPaywallOverride ?? false);
  const setShowPaywall = (v) => { setShowPaywallLocal(v); if (setShowPaywallOverride) setShowPaywallOverride(v); };
  const [checking,    setChecking]    = useState(false);
  const isMobile = useMobile();

  const testsUsed     = userData?.testsUsed     || 0;
  const gatTestsUsed  = userData?.gatTestsUsed  || 0;
  const econTestsUsed = userData?.econTestsUsed || 0;
  const unlocked     = userData?.unlocked     || false;
  // Show tests left for the active subject
  const testsLeft = activeSubject === "GAT"
    ? Math.max(0, FREE_LIMIT - gatTestsUsed)
    : activeSubject === "Economics"
    ? Math.max(0, FREE_LIMIT - econTestsUsed)
    : Math.max(0, FREE_LIMIT - testsUsed);
  const scores    = testHistory.map(t => t.accuracy || 0);
  const avgScore  = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const bestScore = scores.length ? Math.max(...scores) : null;

  // Which subjects are currently live — drives subject tab visibility
  const liveSubjects = (subjects || []).filter(s => s.live);
  const showSubjectTabs = liveSubjects.length > 1;

  useEffect(() => { logEvent("page_view", { page: "dashboard", user_id: user?.uid }); }, []);

  // Auto-select subject if only one is live (no choice to make for Step 1)
  useEffect(() => {
    const live = (subjects || []).filter(s => s.live);
    if (live.length === 1) {
      const key = live[0].name.includes("GAT") ? "GAT" : "English";
      setActiveSubject(key);
    }
  }, [subjects]);

  // Labels are identical for both subjects — subject tab already provides context
  const ALL_MODES = {
    QuickPractice:  { label: "Quick Practice",          icon: "⚡", desc: "15 questions · All topics · Lifetime Free",              free: true,  subject: "English" },
    Mock:           { label: "Mock Exam",                icon: "📝", desc: "50 questions · 60 min · NTA standard marking",           free: false, subject: "English" },
    GAT_QP:         { label: "Quick Practice",           icon: "⚡", desc: "15 questions · All aptitude topics · Always Free",       free: true,  subject: "GAT" },
    GAT_Mock:       { label: "Mock Exam",                icon: "📝", desc: "50 questions · 60 min · General Aptitude",              free: false, subject: "GAT" },
    Economics_QP:   { label: "Quick Practice",           icon: "⚡", desc: "15 questions · All topics · Always Free",               free: true,  subject: "Economics" },
    Economics_Mock: { label: "Mock Exam",                icon: "📝", desc: "50 questions · 60 min · Micro · Macro · Indian Economy", free: false, subject: "Economics" },
  };

  // Filter mode tiles by active subject
  const MODES = Object.fromEntries(
    Object.entries(ALL_MODES).filter(([, cfg]) => cfg.subject === activeSubject)
  );

  // When subject changes, reset mode — user must actively choose format
  function handleSubjectChange(subj) {
    setActiveSubject(subj);
    setMode(null); // clear mode — no default
  }

  const isCurrentModeFree = mode ? (ALL_MODES[mode]?.free ?? false) : false;

  async function handleBegin() {
    if (!activeSubject || !mode) return; // guard: both must be selected
    // Free modes: GAT_QP and QuickPractice — no limit check
    if (isCurrentModeFree) {
      onBeginTest({ mode, subject: activeSubject });
      return;
    }

    setChecking(true);
    try {
      if (CF_BASE) {
        const token = await getAuthToken();
        const r = await fetch(`${CF_BASE}/checkTestLimit`, {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({ mode }), // pass mode so CF checks the right pool
        });
        const d = await r.json();
        if (!d.allowed) {
          logEvent("paywall_triggered", { user_id: user?.uid, tests_used: mode === "GAT_Mock" ? gatTestsUsed : mode === "Economics_Mock" ? econTestsUsed : testsUsed });
          setShowPaywall(true); return;
        }
      } else {
        // localStorage fallback — check appropriate counter
        const effectiveCount = mode === "GAT_Mock"
          ? (gatTestsUsed  || parseInt(localStorage.getItem("cuet_gat_tests_used")  || "0"))
          : mode === "Economics_Mock"
          ? (econTestsUsed || parseInt(localStorage.getItem("cuet_econ_tests_used") || "0"))
          : (testsUsed     || parseInt(localStorage.getItem("cuet_tests_used")      || "0"));
        const effectiveUnlocked = unlocked || localStorage.getItem("cuet_unlocked") === "true";
        if (!effectiveUnlocked && effectiveCount >= FREE_LIMIT) {
          logEvent("paywall_triggered", { user_id: user?.uid, tests_used: effectiveCount });
          setShowPaywall(true); return;
        }
      }
      onBeginTest({ mode, subject: activeSubject });
    } catch(_) {
      const effectiveCount = mode === "GAT_Mock"
        ? (gatTestsUsed  || parseInt(localStorage.getItem("cuet_gat_tests_used")  || "0"))
        : mode === "Economics_Mock"
        ? (econTestsUsed || parseInt(localStorage.getItem("cuet_econ_tests_used") || "0"))
        : (testsUsed     || parseInt(localStorage.getItem("cuet_tests_used")      || "0"));
      if (!unlocked && effectiveCount >= FREE_LIMIT) {
        setShowPaywall(true); return;
      }
      if (!unlocked && effectiveCount >= FREE_LIMIT - 1) {
        setShowPaywall(true); return;
      }
      onBeginTest({ mode, subject: activeSubject });
    } finally { setChecking(false); }
  }

  function handlePaySuccess() {
    setShowPaywall(false);
    showToast("Payment verified! Full access unlocked.", "info");
    onBeginTest({ mode, subject: activeSubject });
  }

  // Section label and subject badge
  const subjectBadge = activeSubject === "GAT" ? "General Aptitude Test (501)" : activeSubject === "Economics" ? "Economics (118)" : "English (101)";
  const sectionLabel = activeSubject === "GAT"
    ? "Your Practice Summary — CUET GAT (501) 2026"
    : activeSubject === "Economics"
    ? "Your Practice Summary — CUET Economics (118) 2026"
    : "Your Practice Summary — CUET English (101) 2026";
  const newTestLabel = activeSubject === "GAT"
    ? "CUET GAT · Section III (501)"
    : activeSubject === "Economics"
    ? "CUET Economics · Section II (118)"
    : "CUET English · Section IA (101)";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {showPaywall && <PaywallModal user={user} onSuccess={handlePaySuccess} onClose={() => setShowPaywall(false)} subject={activeSubject} />}

      <div className="nta-header">
        <span className="nta-logo">Vantiq <span>CUET</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {activeSubject && (
            <span style={{ fontSize: 11, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, padding: "3px 8px", color: "#fff", letterSpacing: ".03em" }}>
              {activeSubject === "GAT" ? "General Aptitude Test (501)" : "English (101)"}
            </span>
          )}
          <span style={{ fontSize: 13, opacity: 0.8 }}>{user?.displayName?.split(" ")[0]}</span>
          <button onClick={onLogout} style={{ background: "transparent", color: "#fff", fontSize: 12, opacity: 0.7, padding: "4px 8px", border: "1px solid rgba(255,255,255,.2)", borderRadius: 4, fontFamily: "var(--font-body)", cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 900, margin: "0 auto", width: "100%", padding: isMobile ? "20px 16px" : "28px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
            Your Practice Summary
          </h2>
          <span style={{ fontSize: 10, color: "var(--success)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block", animation: "livePulse 2s ease-in-out infinite" }} />
            Quick Practice · Always Free
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Tests Taken",  val: activeSubject === "GAT" ? gatTestsUsed : activeSubject === "Economics" ? econTestsUsed : testsUsed, sub: unlocked ? "Unlimited" : `${testsLeft} free left`, accent: "var(--indigo)" },
            { label: "Avg. Score",   val: avgScore != null ? `${avgScore}%` : "—", sub: "across all tests", accent: "#D97706" },
            { label: "Best Score",   val: bestScore != null ? `${bestScore}%` : "—", sub: "personal best", accent: "var(--success)" },
            { label: "Access",       val: unlocked ? "Pro" : "Free", sub: unlocked ? "Unlimited till 30 Jun" : `${testsLeft} of 4 free (this subject)`, accent: unlocked ? "var(--success)" : "var(--indigo)" },
          ].map(s => (
            <div key={s.label} className="stat-strip" style={{ borderLeft: `3px solid ${s.accent}`, padding: "10px 14px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.label === "Access" && unlocked ? "var(--success)" : "var(--navy)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 1 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {testHistory.length > 0 && (
          <button
            onClick={() => onViewAnalytics && onViewAnalytics()}
            style={{ width:"100%", height:44, marginBottom:14, display:"flex", alignItems:"center",
              justifyContent:"space-between", paddingLeft:16, paddingRight:16,
              background:"linear-gradient(180deg,#F5F7FF 0%,#EEF2FF 100%)",
              border:"1px solid #C7D2FE", borderRadius:10, cursor:"pointer",
              fontFamily:"var(--font-body)",
              boxShadow:"0 3px 0 #a5b4fc,0 5px 12px rgba(67,56,202,0.14),inset 0 1px 0 rgba(255,255,255,0.9)",
              transition:"all .12s" }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 4px 0 #a5b4fc,0 7px 16px rgba(67,56,202,0.18),inset 0 1px 0 rgba(255,255,255,0.9)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 3px 0 #a5b4fc,0 5px 12px rgba(67,56,202,0.14),inset 0 1px 0 rgba(255,255,255,0.9)"; }}
            onMouseDown={e => { e.currentTarget.style.transform="translateY(2px)"; e.currentTarget.style.boxShadow="0 1px 0 #a5b4fc,inset 0 1px 0 rgba(255,255,255,0.7)"; }}
            onMouseUp={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 4px 0 #a5b4fc,0 7px 16px rgba(67,56,202,0.18)"; }}
          >
            <span style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>📊</span>
              <span style={{ fontWeight:700, fontSize:14, color:"#0F172A" }}>My Analytics</span>
              <span style={{ fontSize:11, color:"#4338CA", background:"#EEF2FF", padding:"2px 8px", borderRadius:4, fontWeight:600, border:"1px solid #C7D2FE" }}>Progression · Topics · Trends</span>
            </span>
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:11, color:"#94A3B8" }}>
                {testHistory[0]?.accuracy || 0}% last test
              </span>
              <span style={{ fontSize:14, color:"#4338CA" }}>→</span>
            </span>
          </button>
        )}

        <div className="card" style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>

          {/* ── IED Disclaimer Banner — shown only when Economics subject is active ── */}
          {activeSubject === "Economics" && <IEDDisclaimerBanner />}

          {/* ── Card header ─────────────────────────────────────────── */}
          <div style={{ padding: "11px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", display: "inline-block", boxShadow: "0 0 0 3px rgba(5,150,105,.15)", animation: "livePulse 2s ease-in-out infinite" }} />
              <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--navy)", margin: 0 }}>New Test Paper</h3>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--success)", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "2px 7px", borderRadius: 20, letterSpacing: ".05em" }}>LIVE</span>
            </div>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>⚡ Quick Practice · Always Free</span>
          </div>

          <div style={{ padding: isMobile ? "14px 16px" : "14px 18px" }}>

            {/* ── SUBJECT chips ────────────────────────────────────────── */}
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 7 }}>
              Subject
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
              {liveSubjects.map(s => {
                const key   = s.name.includes("GAT") ? "GAT" : s.name.includes("Economics") ? "Economics" : "English";
                const label = s.name.includes("GAT") ? "General Aptitude Test (501)" : s.name.includes("Economics") ? "Economics (118)" : "English (101)";
                const isActive = activeSubject === key;
                return (
                  <button key={key} onClick={() => handleSubjectChange(key)} style={{
                    padding: "5px 14px", borderRadius: 20, cursor: "pointer",
                    border: `1.5px solid ${isActive ? "#2563EB" : "#BFDBFE"}`,
                    background: isActive ? "#2563EB" : "#EFF6FF",
                    color: isActive ? "#fff" : "#2563EB",
                    fontWeight: 600, fontSize: 12, fontFamily: "var(--font-body)",
                    transition: "all .15s", display: "flex", alignItems: "center", gap: 6,
                    boxShadow: isActive
                      ? "0 3px 0 #1d4ed8,0 5px 10px rgba(37,99,235,0.25),inset 0 1px 0 rgba(255,255,255,0.15)"
                      : "0 2px 0 #93c5fd,0 3px 6px rgba(37,99,235,0.1),inset 0 1px 0 rgba(255,255,255,0.9)",
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6EE7B7", display: "inline-block", flexShrink: 0 }} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* ── FORMAT tiles — horizontal compact ────────────────────── */}
            {activeSubject ? (
              <>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 7 }}>
                  Format
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  {Object.entries(MODES).map(([k, cfg]) => {
                    const isSelected = mode === k;
                    return (
                      <div key={k} onClick={() => setMode(k)} style={{
                        flex: "1 1 160px", border: `1.5px solid ${isSelected ? "var(--indigo)" : "var(--border)"}`,
                        borderRadius: 9, padding: "11px 14px", cursor: "pointer",
                        background: isSelected ? "#EEF2FF" : "#fff",
                        boxShadow: isSelected ? "0 0 0 3px rgba(67,56,202,0.08)" : "none",
                        transition: "all .15s", display: "flex", alignItems: "flex-start", gap: 12,
                      }}>
                        <span style={{ fontSize: 18, marginTop: 1, flexShrink: 0 }}>{cfg.icon}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 2 }}>{cfg.label}</div>
                          <div style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.4 }}>{cfg.desc}</div>
                          {cfg.free && (
                            <span style={{ display: "inline-block", marginTop: 5, background: "#DCFCE7", color: "var(--success)", fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 20, letterSpacing: ".04em", border: "1px solid #A7F3D0" }}>
                              ALWAYS FREE
                            </span>
                          )}
                          {!cfg.free && !unlocked && (
                            <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 5 }}>
                              {testsLeft > 0 ? `${testsLeft} free · ₹199 unlimited` : "Free limit reached · ₹199 to unlock"}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ border: "1.5px dashed var(--border)", borderRadius: 9, padding: "14px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginBottom: 14 }}>
                Select a subject above to see available formats
              </div>
            )}

            {/* ── CTA row — button + hint inline ──────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                className="btn-primary"
                onClick={handleBegin}
                disabled={!activeSubject || !mode || (checking && !isCurrentModeFree)}
                style={{ flex: 1, height: 40, fontSize: 13, opacity: (!activeSubject || !mode) ? 0.45 : 1, cursor: (!activeSubject || !mode) ? "not-allowed" : "pointer" }}
              >
                {checking ? "Checking..." : "Begin Test →"}
              </button>
              <span style={{ fontSize: 10, color: !activeSubject || !mode ? "var(--text-muted)" : isCurrentModeFree ? "var(--success)" : "var(--text-muted)", fontWeight: isCurrentModeFree ? 600 : 400, whiteSpace: "nowrap", flexShrink: 0 }}>
                {!activeSubject ? "Pick a subject" : !mode ? "Pick a format" : isCurrentModeFree ? "✓ Always free" : !unlocked && testsLeft > 0 ? `${testsLeft} Mock Exam${testsLeft !== 1 ? "s" : ""} free` : !unlocked ? "Free limit reached" : "Unlimited access"}
              </span>
            </div>

          </div>
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", marginBottom: 12 }}>Recent Tests</h3>
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
                  {["Date", "Mode", "Score", "Correct", "Accuracy", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-secondary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {testHistory.map((t, i) => {
                  const p = t.accuracy || 0;
                  const modeLabel = { Mock: "Eng Mock", QuickPractice: "Eng QP", GAT_Mock: "GAT Mock", GAT_QP: "GAT QP", Economics_Mock: "Eco Mock", Economics_QP: "Eco QP" }[t.mode] || t.mode || "Mock";
                  return (
                    <tr key={i} style={{ borderBottom: i < testHistory.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "12px 14px", color: "var(--text-secondary)" }}>{fmtDate(t.completedAt)}</td>
                      <td style={{ padding: "12px 14px" }}>
                        {(() => {
                          const mc = t.mode?.includes("GAT")       ? { bg:"#F0FDF4", border:"#BBF7D0", text:"#166534" }
                                   : t.mode?.includes("Economics")  ? { bg:"#FEFCE8", border:"#FDE68A", text:"#854D0E" }
                                   :                                   { bg:"#EEF2FF", border:"#C7D2FE", text:"#3730A3" };
                          return (
                            <span style={{
                              display:"inline-block", fontSize:10, fontWeight:600, padding:"2px 8px",
                              borderRadius:4, background:mc.bg, border:`1px solid ${mc.border}`,
                              color:mc.text, whiteSpace:"nowrap", letterSpacing:".03em"
                            }}>{modeLabel}</span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{t.totalScore ?? "—"}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)" }}>{t.correct}/{t.attempted}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: scoreColor(p), fontFamily: "var(--font-mono)" }}>{p}%</td>
                      <td style={{ padding: "12px 14px" }}>
                        {(() => {
                          const sc = p >= 70 ? { bg:"#F0FDF4", border:"#BBF7D0", text:"#166534", label:"Strong"    }
                                   : p >= 45 ? { bg:"#FEFCE8", border:"#FDE68A", text:"#854D0E", label:"Average"   }
                                   :           { bg:"#FFF1F2", border:"#FECDD3", text:"#9F1239", label:"Needs Work" };
                          return (
                            <span style={{
                              display:"inline-block", fontSize:10, fontWeight:600, padding:"2px 8px",
                              borderRadius:4, background:sc.bg, border:`1px solid ${sc.border}`,
                              color:sc.text, letterSpacing:".03em"
                            }}>{sc.label}</span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          onClick={() => onReviewTest && onReviewTest(t.id)}
                          style={{ fontSize: 12, fontWeight: 700, color: "#4338CA",
                            background: "linear-gradient(180deg,#EEF2FF 0%,#E0E7FF 100%)",
                            border: "1px solid #C7D2FE",
                            borderRadius: 6, padding: "4px 12px", cursor: "pointer", whiteSpace: "nowrap",
                            boxShadow: "0 2px 0 #a5b4fc, 0 3px 6px rgba(67,56,202,0.18), inset 0 1px 0 rgba(255,255,255,0.8)",
                            transition: "all .12s" }}
                          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 3px 0 #a5b4fc,0 5px 8px rgba(67,56,202,0.22),inset 0 1px 0 rgba(255,255,255,0.9)"; }}
                          onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 0 #a5b4fc,0 3px 6px rgba(67,56,202,0.18),inset 0 1px 0 rgba(255,255,255,0.8)"; }}
                          onMouseDown={e=>{ e.currentTarget.style.transform="translateY(1px)"; e.currentTarget.style.boxShadow="0 1px 0 #a5b4fc"; }}
                        >
                          Review
                        </button>
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
            <span className="pill pill-indigo">
              {config?.mode === "GAT_QP" ? "GAT Quick Practice" : config?.mode === "GAT_Mock" ? "GAT Mock Exam" : config?.mode === "QuickPractice" ? "Quick Practice" : "Mock Exam"}
            </span>
            <span className="pill pill-navy">
              {config?.subject === "GAT" ? "GAT 501" : config?.subject === "Economics" ? "Economics 118" : "English 101"}
            </span>
            {(config?.mode === "QuickPractice" || config?.mode === "GAT_QP")
              ? <span className="pill pill-green">15Q · Always Free</span>
              : <span className="pill pill-navy">50Q · 60 min</span>
            }
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
  const isTimed    = config?.mode !== "QuickPractice" && config?.mode !== "GAT_QP" && config?.mode !== "Economics_QP"; // free modes: no timer
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState({});
  const [marked,    setMarked]    = useState(new Set());
  const [timeLeft,  setTimeLeft]  = useState(isTimed ? EXAM_SECS : null);
  const [exitModal, setExitModal] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const isMobile = useMobile();
  const timerRef       = useRef(null);
  const questionStartRef = useRef(Date.now());
  const timePerQRef      = useRef({});
  const currentRef       = useRef(0);

  useEffect(() => { logEvent("page_view", { page: "exam" }); }, []);

  useEffect(() => {
    if (!isTimed) return; // QuickPractice — no countdown timer
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
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    timePerQRef.current[currentRef.current] = (timePerQRef.current[currentRef.current] || 0) + elapsed;
    onSubmit(answers, { ...timePerQRef.current });
  }

  function navTo(i) {
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    timePerQRef.current[currentRef.current] = (timePerQRef.current[currentRef.current] || 0) + elapsed;
    questionStartRef.current = Date.now();
    currentRef.current = i;
    setCurrent(i);
  }

  const q    = questions[current];
  const warn = isTimed && timeLeft !== null && timeLeft < 300;

  return (
    <div style={{ height: isMobile ? "auto" : "100dvh", minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
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

      {showSubmitConfirm && (() => {
        const answered  = Object.keys(answers).length;
        const unanswered = questions.length - answered;
        const markedCount = marked.size;
        return (
          <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: 400 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--navy)", marginBottom: 16 }}>Submit Test?</h3>
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Answered",   val: answered,   bg: "#ECFDF5", cl: "#059669" },
                  { label: "Unanswered", val: unanswered, bg: "#FEF2F2", cl: "#DC2626" },
                  { label: "Marked",     val: markedCount,bg: "#FFFBEB", cl: "#D97706" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, minWidth: 80, textAlign: "center", background: s.bg, borderRadius: 8, padding: "10px 8px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: s.cl }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: s.cl, opacity: 0.75, textTransform: "uppercase", letterSpacing: ".04em", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {unanswered > 0 && (
                <p style={{ fontSize: 12.5, color: "var(--text-secondary)", background: "var(--bg-alt)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, lineHeight: 1.6 }}>
                  ⚠ {unanswered} unanswered question{unanswered !== 1 ? "s" : ""} will score 0 marks.
                </p>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-outline" style={{ flex: 1, height: 40, fontSize: 13 }} onClick={() => setShowSubmitConfirm(false)}>Review More</button>
                <button className="btn-primary" style={{ flex: 1, height: 40, fontSize: 13 }} onClick={() => { setShowSubmitConfirm(false); submitTest(false); }}>Submit →</button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="nta-header">
        <span className="nta-logo">Vantiq <span>CUET</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 20, minWidth: 0 }}>
          {isTimed && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: isMobile ? 14 : 16, fontWeight: 700, color: warn ? "#FCA5A5" : "#fff", background: warn ? "rgba(220,38,38,.25)" : "rgba(255,255,255,.1)", padding: "4px 8px", borderRadius: 6, transition: "all .3s", flexShrink: 0 }}>
              &#9201; {fmtTimer(timeLeft)}
            </div>
          )}
          <div style={{ fontSize: 12, opacity: 0.8, textAlign: "right", minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 90 : 180 }}>{user?.displayName}</div>
            <button onClick={() => setExitModal(true)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.5)", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-body)", padding: 0 }}>
              Exit Test
            </button>
          </div>
        </div>
      </div>

      <div className="section-bar">
        <span>{config?.subject === "GAT" ? "Section III — General Aptitude Test (GAT)" : config?.subject === "Economics" ? "Section II — Domain (Economics 118)" : "Section I — Languages (English)"}</span>
        <span style={{ marginLeft: "auto" }}>Q {current + 1} of {questions.length}</span>
        <span className="pill pill-navy" style={{ marginLeft: 8 }}>{Object.keys(answers).length} answered</span>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: isMobile ? "column" : "row" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 16px" : "20px 24px" }}>
          {q.passage && (
            <div style={{ borderLeft: "4px solid var(--indigo)", background: "#F5F7FF", borderRadius: "0 8px 8px 0", padding: isMobile ? "12px 14px" : "14px 18px", marginBottom: 16, fontSize: 13, lineHeight: 1.7, color: "var(--text-primary)", overflowWrap: "break-word", wordBreak: "break-word" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--indigo)", marginBottom: 8 }}>Reading Passage</div>
              {q.passage}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Q.{current + 1}</span>
          </div>
          <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 16 }}>{q.question}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 9 }}>
            {q.options.map((opt, i) => (
              <div key={i} className={"option-box" + (answers[current] === i ? " selected" : "")} onClick={() => setAnswers(p => {
                if (p[current] === i) { const n = { ...p }; delete n[current]; return n; } // deselect
                return { ...p, [current]: i }; // select
              })}>
                <span className="option-key">{String.fromCharCode(65 + i)}</span>
                <span style={{ fontSize: isMobile ? 13 : 13.5, color: "var(--text-primary)", flex: 1 }}>{opt}</span>
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
                  <button key={i} onClick={() => navTo(i)} style={{ width: 30, height: 30, border: `2px solid ${cur ? "var(--indigo)" : bc}`, borderRadius: 4, background: bg, color: cl, fontSize: 11, fontWeight: cur ? 700 : 500, fontFamily: "var(--font-mono)", cursor: "pointer", boxShadow: cur ? "0 0 0 2px var(--indigo)" : "none", transition: "all .12s" }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 16 }}>
              <div>&#x1F7E9; Answered</div><div>&#x1F7E8; Marked</div><div>&#x2B1C; Not visited</div>
            </div>
            <button className="btn-primary" onClick={() => setShowSubmitConfirm(true)} style={{ width: "100%", fontSize: 12, height: 38, marginTop: "auto" }}>
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
                  <button key={i} onClick={() => { navTo(i); setShowPalette(false); }} style={{ width: 36, height: 36, border: `2px solid ${cur ? "var(--indigo)" : bc}`, borderRadius: 4, background: bg, color: cl, fontSize: 12, fontWeight: cur ? 700 : 500, fontFamily: "var(--font-mono)", cursor: "pointer" }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <button className="btn-primary full" onClick={() => { setShowPalette(false); setShowSubmitConfirm(true); }}>Submit Test</button>
          </div>
        </div>
      )}

      <div className="exam-footer" style={{ borderTop: "1px solid var(--border)", background: "#fff", padding: isMobile ? "8px 12px" : "12px 32px", display: "flex", alignItems: "center", gap: isMobile ? 6 : 12, flexShrink: 0, position: isMobile ? "sticky" : "relative", bottom: 0, zIndex: 10, paddingBottom: isMobile ? "calc(8px + env(safe-area-inset-bottom))" : "12px" }}>
        <button className="btn-amber" onClick={() => setMarked(p => { const n = new Set(p); n.has(current) ? n.delete(current) : n.add(current); return n; })}>
          {marked.has(current) ? "✓ Marked" : isMobile ? "Mark" : "Mark for Review"}
        </button>
        {isMobile && (
          <button onClick={() => setShowPalette(true)} style={{ height: 32, padding: "0 10px", border: "1.5px solid var(--border)", borderRadius: 6, background: "#fff", fontSize: 11, fontWeight: 600, color: "var(--navy)", cursor: "pointer", fontFamily: "var(--font-body)", whiteSpace: "nowrap" }}>
            {Object.keys(answers).length}/{questions.length} Q
          </button>
        )}
        <div className="exam-footer-right" style={{ marginLeft: "auto", display: "flex", gap: isMobile ? 6 : 10 }}>
          <button
            onClick={() => current > 0 && navTo(current - 1)}
            style={{ height: 32, padding: "0 12px", border: "1.5px solid var(--border)", borderRadius: 6, background: "#fff", fontSize: isMobile ? 12 : 13, fontWeight: 500, color: "var(--text-secondary)", cursor: current > 0 ? "pointer" : "not-allowed", opacity: current > 0 ? 1 : 0.4, fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}
          >
            ← {!isMobile && "Back"}
          </button>
          {isMobile && current === questions.length - 1 ? (
            <button className="btn-navy-sm" onClick={() => setShowSubmitConfirm(true)} style={{ background: "var(--success)", minWidth: 80 }}>
              Submit ✓
            </button>
          ) : (
            <button className="btn-navy-sm" onClick={() => { if (current < questions.length - 1) navTo(current + 1); else showToast("Last question. Submit when ready.", "info"); }}>
              {isMobile ? "Next →" : "Save & Next →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ANALYTICS ZONE COLOR CONSTANTS ──────────────────────────────────────────
const AZ = {
  bg:"#F5F7FA", card:"#FFFFFF", card2:"#F1F5F9",
  bord:"#E2E8F0", bord2:"#EEF2F7",
  text:"#0F172A", textS:"#475569", textM:"#94A3B8",
  grn:"#059669", red:"#DC2626", amb:"#D97706", ind:"#4338CA", blu:"#3B82F6",
};

// ── REUSABLE ANALYTICS COMPONENTS ────────────────────────────────────────────

/* inject CSS keyframes once */
if (typeof document !== "undefined" && !document.getElementById("az-chart-css")) {
  const s = document.createElement("style"); s.id = "az-chart-css";
  s.textContent = `
    @keyframes az-spin-in { from { stroke-dashoffset: 1000; opacity:0; } to { opacity:1; } }
    @keyframes az-bar-rise { from { transform: scaleY(0); opacity:0; } to { transform: scaleY(1); opacity:1; } }
    @keyframes az-fade-in  { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
    .az-donut-seg { animation: az-spin-in 0.7s cubic-bezier(0.34,1.56,0.64,1) both; }
    .az-bar       { transform-origin: bottom; animation: az-bar-rise 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
    .az-lbl       { animation: az-fade-in 0.4s ease both; }
  `;
  document.head.appendChild(s);
}

function DonutChart({ segments, centerLabel, centerSub, size = 140, labels = [] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  /* enlarged for 3D depth illusion: outer ring + shadow ring + fill ring */
  const R = 46, r_inner = 32, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  const segs = segments.filter(s => s.value > 0);

  /* compute midpoint angles for label callout lines */
  let cumAngle = -Math.PI / 2;
  const segData = segs.map(seg => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const mid = cumAngle + angle / 2;
    cumAngle += angle;
    return { ...seg, angle, mid };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
      {/* drop shadow ring */}
      <circle cx={cx} cy={cy+2} r={R} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth={13} />
      {/* track ring */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#E9EEF6" strokeWidth={12} />
      {/* colored arcs with 3D highlight */}
      {segData.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const off  = (-offset).toFixed(2);
        offset += dash;
        return (
          <g key={i} className="az-donut-seg" style={{ animationDelay: `${i * 0.12}s` }}>
            {/* base arc */}
            <circle cx={cx} cy={cy} r={R} fill="none" stroke={seg.color} strokeWidth={12}
              strokeDasharray={`${dash.toFixed(2)} ${(circ - dash + 0.01).toFixed(2)}`}
              strokeDashoffset={off} strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`} />
            {/* highlight arc (inner edge shimmer) */}
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={4}
              strokeDasharray={`${(dash * 0.4).toFixed(2)} ${(circ - dash * 0.4 + 0.01).toFixed(2)}`}
              strokeDashoffset={off} strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`} />
          </g>
        );
      })}
      {/* white center circle for donut hole — gives 3D depth */}
      <circle cx={cx} cy={cy} r={r_inner} fill="white" />
      <circle cx={cx} cy={cy} r={r_inner} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={1} />
      {/* center text */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={13}
        fontFamily="JetBrains Mono,monospace" fontWeight={800} fill="#0F172A">{centerLabel}</text>
      {centerSub && <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9}
        fontFamily="system-ui,sans-serif" fill="#94A3B8">{centerSub}</text>}
      {/* segment labels with callout lines (only if labels array provided) */}
      {labels.map((lbl, i) => {
        if (!segData[i] || !lbl) return null;
        const { mid, value } = segData[i];
        if ((value / total) < 0.05) return null; // skip tiny slices
        const LR = R + 20;
        const lx = cx + LR * Math.cos(mid);
        const ly = cy + LR * Math.sin(mid);
        const anchor = lx > cx + 5 ? "start" : lx < cx - 5 ? "end" : "middle";
        const lx2 = cx + (R + 8) * Math.cos(mid);
        const ly2 = cy + (R + 8) * Math.sin(mid);
        return (
          <g key={i} className="az-lbl" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
            <line x1={lx2.toFixed(1)} y1={ly2.toFixed(1)}
                  x2={lx.toFixed(1)}  y2={ly.toFixed(1)}
                  stroke={segData[i].color} strokeWidth={1.2} strokeDasharray="2 2" opacity={0.7} />
            <text x={lx.toFixed(1)} y={(ly - 1).toFixed(1)} textAnchor={anchor}
              fontSize={9} fontFamily="JetBrains Mono,monospace" fontWeight={700} fill={segData[i].color}>
              {lbl}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Spark({ data, color = "#818CF8", w = 110, h = 34 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) =>
    `${((i / (data.length-1)) * (w-8) + 4).toFixed(1)},${(h-4-((v-min)/range)*(h-8)).toFixed(1)}`
  ).join(" ");
  const li = data.length - 1;
  const lx = ((li / (data.length-1)) * (w-8) + 4).toFixed(1);
  const ly = (h-4-((data[li]-min)/range)*(h-8)).toFixed(1);
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3} fill={color} stroke="#F5F7FA" strokeWidth={1.5} />
    </svg>
  );
}

function TimeBarChart({ timePerQ, questions, answers }) {
  const keys = Object.keys(timePerQ || {});
  if (keys.length < 3) return null;
  const n = questions.length;
  const vals = Array.from({length: n}, (_, i) => timePerQ[i] || 0);
  const maxT = Math.max(...vals, 1);
  /* Layout: bar area + label row below (Q number) + value label above */
  const H_bar = 120, H_qnum = 16, H_val = 14, TOTAL_H = H_bar + H_qnum + H_val;
  /* viewBox wide enough for all bars + gaps */
  const gap = 3, bw_base = 14;
  const VW = Math.max(n * (bw_base + gap) + 8, 400);
  const bw = Math.max(8, Math.floor((VW - 8 - gap * (n - 1)) / n));
  const totalBarW = n * bw + (n - 1) * gap + 8;

  return (
    <div style={{ overflowX: "auto", overflowY: "visible" }}>
      <svg width={Math.max(totalBarW, 400)} height={TOTAL_H}
        viewBox={`0 0 ${Math.max(totalBarW, 400)} ${TOTAL_H}`}
        style={{ display: "block", minWidth: "100%" }}>
        {/* subtle grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const y = H_val + H_bar - Math.round(frac * (H_bar - 8));
          return (
            <line key={frac} x1={4} y1={y} x2={totalBarW - 4} y2={y}
              stroke="rgba(0,0,0,0.06)" strokeWidth={1}
              strokeDasharray={frac === 0 ? "none" : "3 4"} />
          );
        })}
        {vals.map((t, i) => {
          const ua = answers[i];
          const isCorrect = ua !== undefined && ua === questions[i]?.correct;
          const isSkipped = ua === undefined;
          const col = isSkipped ? AZ.amb : isCorrect ? AZ.grn : AZ.red;
          const shadowCol = isSkipped ? "#D97706" : isCorrect ? "#059669" : "#DC2626";
          const bh = Math.max(4, Math.round((t / maxT) * (H_bar - 12)));
          const x = 4 + i * (bw + gap);
          const y_bar = H_val + H_bar - bh;
          /* show value label only if bar is tall enough, or it's notable */
          const showVal = t > 0 && (bh > 14 || t >= maxT * 0.3);
          return (
            <g key={i} className="az-bar" style={{ animationDelay: `${i * 0.018}s` }}>
              {/* 3D shadow bar (offset down-right) */}
              <rect x={x + 2} y={y_bar + 3} width={bw} height={bh} rx={3}
                fill={shadowCol} opacity={0.18} />
              {/* main bar with gradient */}
              <defs>
                <linearGradient id={`bg-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={col} stopOpacity={1} />
                  <stop offset="100%" stopColor={shadowCol} stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id={`sh-${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>
              <rect x={x} y={y_bar} width={bw} height={bh} rx={3}
                fill={`url(#bg-${i})`} />
              {/* left highlight streak */}
              <rect x={x + 2} y={y_bar + 2} width={Math.max(2, bw * 0.22)} height={bh - 4} rx={2}
                fill={`url(#sh-${i})`} />
              {/* top cap highlight */}
              <rect x={x + 1} y={y_bar} width={bw - 2} height={3} rx={2}
                fill="rgba(255,255,255,0.45)" />
              {/* seconds value above bar */}
              {showVal && (
                <text x={x + bw / 2} y={y_bar - 3} textAnchor="middle"
                  fontSize={bw > 12 ? 9 : 7} fontFamily="JetBrains Mono,monospace"
                  fontWeight={700} fill={col}
                  className="az-lbl" style={{ animationDelay: `${i * 0.018 + 0.3}s` }}>
                  {t}s
                </text>
              )}
              {/* question number below bar */}
              {(n <= 30 || i % 5 === 0 || i === n - 1) && (
                <text x={x + bw / 2} y={H_val + H_bar + H_qnum - 2} textAnchor="middle"
                  fontSize={bw > 10 ? 8 : 7} fontFamily="system-ui,sans-serif"
                  fill="#94A3B8">
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function fmtSecs(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// ── RESULTS SCREEN ────────────────────────────────────────────────────────────
function ResultsScreen({ questions, answers, config, user, testHistory, timePerQ = {}, isPastReview = false, reviewTestDate = null, onNewTest, onReview, onViewAnalytics }) {
  const [analysis, setAnalysis] = useState(null);
  const isMobile = useMobile();

  useEffect(() => { logEvent("page_view", { page: "results" }); }, []);

  // ── Score calculations ────────────────────────────────────────────────
  let correct = 0, wrong = 0, unanswered = 0, totalScore = 0;
  questions.forEach((q, i) => {
    if (answers[i] === undefined) unanswered++;
    else if (answers[i] === q.correct) { correct++; totalScore += MARKS_CORRECT; }
    else { wrong++; totalScore += MARKS_WRONG; }
  });
  const attempted  = correct + wrong;
  const accuracy   = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const pct        = questions.length > 0 ? Math.round((totalScore / (questions.length * MARKS_CORRECT)) * 100) : 0;
  const maxScore   = questions.length * MARKS_CORRECT;
  const marksEarned    = correct * 5;
  const negativeMarks  = wrong * 1;
  const optimisedScore = correct * 5;

  // Score Drag — seconds spent on wrong answers
  const scoreDragSecs = Object.entries(timePerQ || {}).reduce((tot, [i, secs]) => {
    const idx = parseInt(i), ua = answers[idx];
    if (ua === undefined || ua === questions[idx]?.correct) return tot;
    return tot + secs;
  }, 0);
  const timeOnCorrect = Object.entries(timePerQ || {}).reduce((tot, [i, secs]) => {
    const idx = parseInt(i), ua = answers[idx];
    return ua !== undefined && ua === questions[idx]?.correct ? tot + secs : tot;
  }, 0);
  const hasTimeData = Object.keys(timePerQ || {}).length >= 5;

  // ── Topic stats ───────────────────────────────────────────────────────
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

  // ── Historical average ────────────────────────────────────────────────
  const modeFilter = config?.mode === "GAT_Mock" || config?.mode === "GAT_QP" ? ["GAT_Mock","GAT_QP"]
    : config?.mode === "Economics_Mock" || config?.mode === "Economics_QP" ? ["Economics_Mock","Economics_QP"]
    : ["Mock","QuickPractice"];
  const pastTests  = (testHistory || []).filter(t => modeFilter.includes(t.mode));
  const histAvg    = pastTests.length > 1 ? Math.round(pastTests.reduce((s,t) => s+(t.accuracy||0),0) / pastTests.length) : null;
  const delta      = histAvg !== null ? pct - histAvg : null;
  const weakest    = topicRows[0] && topicRows[0].attempted > 0 ? topicRows[0] : null;

  // ── AI advisory ───────────────────────────────────────────────────────
  useEffect(() => {
    const weakStr = weakest ? `Weakest topic: ${weakest.topic} at ${weakest.accuracy}% accuracy.` : "";
    const prompt = `You are a CUET preparation expert. A student just finished a CUET mock test.
- NTA points scored: ${totalScore} out of ${maxScore} possible (${pct}%)
- Questions correct: ${correct} out of ${questions.length} attempted
- Wrong answers: ${wrong} | Skipped: ${unanswered} | Accuracy: ${accuracy}%
${weakStr}
CRITICAL: Do NOT conflate pct% with accuracy. State NTA score and accuracy separately.
Respond ONLY with valid JSON: {"summary":"One honest sentence about NTA score and accuracy.","actions":["Action 1: ...","Action 2: ..."]}`;
    if (!CF_BASE) { setAnalysis({ summary: "Review your answers to find improvement areas.", actions: ["Focus on your weakest topic first."] }); return; }
    (async () => {
      try {
        const token = await getAuthToken();
        const r = await fetch(`${CF_BASE}/generateAdvisory`, {
          method:"POST", headers: authHeaders(token),
          body: JSON.stringify({ score: pct, correct, wrong, unanswered, totalScore, maxScore, accuracy, weakest: weakest?.topic, weakestAcc: weakest?.accuracy })
        });
        if (!r.ok) throw new Error("CF error");
        const d = await r.json();
        setAnalysis(d.advisory || { summary: d.summary, actions: d.actions });
      } catch(_) { setAnalysis({ summary: "Review your answers to identify improvement areas.", actions: ["Focus on your weakest topic first."] }); }
    })();
  }, []);

  const ACTION_ICONS = ["📚","🎯","⏱️","💡","✅"];
  const pad = isMobile ? "14px" : "20px";

  return (
    <div style={{ minHeight:"100vh", background: AZ.bg, display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div className="nta-header">
        <span className="nta-logo">Vantiq <span>CUET</span></span>
        <button onClick={onNewTest} style={{ background:"transparent", color:"rgba(255,255,255,.55)", border:"1px solid rgba(255,255,255,.18)", borderRadius:6, padding:"4px 14px", fontSize:13, cursor:"pointer", fontFamily:"var(--font-body)" }}>
          ← Dashboard
        </button>
      </div>

      <div style={{ flex:1, maxWidth:820, margin:"0 auto", width:"100%", padding: isMobile ? "16px 14px" : "28px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
            background: isPastReview ? "#EEF2FF" : "#ECFDF5",
            color:       isPastReview ? AZ.ind    : AZ.grn,
            border:      `1px solid ${isPastReview ? "#C7D2FE" : "#A7F3D0"}` }}>
            {isPastReview ? "📋 Past Test Review" : "✓ Just Completed"}
          </span>
          {isPastReview && reviewTestDate && (
            <span style={{ fontSize:11, color:AZ.textM }}>
              {(() => { try { const d = reviewTestDate?.toDate ? reviewTestDate.toDate() : new Date(reviewTestDate); return d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}); } catch(_){ return ""; } })()}
            </span>
          )}
        </div>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:22, color:AZ.text, marginBottom:4 }}>
          {config?.subject || "English"} — {(config?.mode === "QuickPractice" || config?.mode === "GAT_QP" || config?.mode === "Economics_QP") ? "Quick Practice" : "Mock Exam"} Results
        </h1>
        <p style={{ fontSize:12, color:AZ.textM, marginBottom:20 }}>
          {questions.length} Questions · {(config?.mode === "QuickPractice" || config?.mode === "GAT_QP" || config?.mode === "Economics_QP") ? "Ungraded practice · Always free" : "+5 correct · −1 wrong · 0 skipped"}
        </p>

        {/* ── BLOCK 1: Score Overview ─────────────────────────────────── */}
        <div style={{ background:AZ.card, borderRadius:12, padding: isMobile ? "16px" : "20px 24px", marginBottom:16, border:`1px solid ${AZ.bord}` }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:AZ.textM, marginBottom:14 }}>Result Overview</div>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"flex-start" }}>
            {/* Main score */}
            <div style={{ flex:"0 0 auto", textAlign:"center", minWidth:100 }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:48, fontWeight:800, lineHeight:1,
                color: pct >= 70 ? AZ.grn : pct >= 45 ? AZ.amb : AZ.red }}>{pct}%</div>
              <div style={{ fontSize:12, color:AZ.textS, marginTop:4 }}>NTA Score</div>
              <div style={{ fontSize:11, color:AZ.textM }}>{totalScore} / {maxScore} marks</div>
            </div>
            {/* Stats */}
            <div style={{ flex:1, display:"flex", flexWrap:"wrap", gap:10 }}>
              {[
                {l:"Accuracy",  v:`${accuracy}%`,  c:AZ.ind },
                {l:"Correct",   v:correct,           c:AZ.grn },
                {l:"Wrong",     v:wrong,             c:AZ.red },
                {l:"Skipped",   v:unanswered,        c:AZ.amb },
                ...(delta !== null ? [{l: delta >= 0 ? "▲ vs Avg" : "▼ vs Avg", v:`${Math.abs(delta)}%`, c: delta >= 0 ? AZ.grn : AZ.red}] : []),
              ].map(s => (
                <div key={s.l} style={{ background:AZ.card2, borderRadius:8, padding:"10px 14px", minWidth:72, flex:"1 1 auto" }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:22, fontWeight:700, color:s.c, lineHeight:1 }}>{s.v}</div>
                  <div style={{ fontSize:10, color:AZ.textM, marginTop:4, textTransform:"uppercase", letterSpacing:".04em" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BLOCK 2: Three Insight Chips ────────────────────────────── */}
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          {/* Negative Marks */}
          <div style={{ flex:"1 1 140px", background:AZ.card, borderRadius:10, padding:"14px 16px", border:`1px solid ${AZ.bord}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ width:28, height:28, borderRadius:"50%", background:"rgba(248,113,113,0.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>⊖</span>
              <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:AZ.textM }}>Negative Marks</span>
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:28, fontWeight:800, color:AZ.red, lineHeight:1 }}>−{negativeMarks}</div>
            <div style={{ fontSize:11, color:AZ.textS, marginTop:5 }}>{wrong} wrong answer{wrong !== 1 ? "s" : ""}</div>
          </div>

          {/* Optimisation Insight */}
          {negativeMarks > 0 && (
            <div style={{ flex:"1 1 140px", background:AZ.card, borderRadius:10, padding:"14px 16px", border:`1px solid rgba(52,211,153,0.25)` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ width:28, height:28, borderRadius:"50%", background:"rgba(52,211,153,0.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>↑</span>
                <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:AZ.textM }}>Without Negatives</span>
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:28, fontWeight:800, color:AZ.grn, lineHeight:1 }}>{optimisedScore}</div>
              <div style={{ fontSize:11, color:AZ.textS, marginTop:5 }}>potential marks with zero guessing</div>
            </div>
          )}

          {/* Score Drag */}
          {hasTimeData && scoreDragSecs > 0 && (
            <div style={{ flex:"1 1 140px", background:AZ.card, borderRadius:10, padding:"14px 16px", border:`1px solid rgba(129,140,248,0.25)` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ width:28, height:28, borderRadius:"50%", background:"rgba(129,140,248,0.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>⏱</span>
                <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:AZ.textM }}>Score Drag</span>
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:24, fontWeight:800, color:AZ.ind, lineHeight:1 }}>{fmtSecs(scoreDragSecs)}</div>
              <div style={{ fontSize:11, color:AZ.textS, marginTop:5 }}>wasted on wrong answers</div>
            </div>
          )}
        </div>

        {/* ── BLOCK 3: Three Donut Charts ─────────────────────────────── */}
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          {/* Questions donut */}
          <div style={{ flex:"1 1 180px", background:AZ.card, borderRadius:12, padding:"16px 14px 12px", border:`1px solid ${AZ.bord}`, display:"flex", flexDirection:"column", alignItems:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:AZ.textM, marginBottom:10 }}>{questions.length} Questions</div>
            <DonutChart size={148}
              segments={[{value:correct,color:AZ.grn},{value:wrong,color:AZ.red},{value:unanswered,color:"#E2E8F0"}]}
              centerLabel={`${attempted}/${questions.length}`} centerSub="answered"
              labels={[`${correct} ✓`, `${wrong} ✗`, unanswered > 0 ? `${unanswered} skip` : null]} />
            <div style={{ marginTop:6, fontSize:10, color:AZ.textS, textAlign:"center", lineHeight:1.9 }}>
              <span style={{color:AZ.grn,fontWeight:700}}>{correct}</span> Correct &nbsp;·&nbsp;
              <span style={{color:AZ.red,fontWeight:700}}>{wrong}</span> Wrong &nbsp;·&nbsp;
              <span style={{color:AZ.textM,fontWeight:600}}>{unanswered}</span> Skip
            </div>
          </div>

          {/* Time donut */}
          {hasTimeData ? (
            <div style={{ flex:"1 1 180px", background:AZ.card, borderRadius:12, padding:"16px 14px 12px", border:`1px solid ${AZ.bord}`, display:"flex", flexDirection:"column", alignItems:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:AZ.textM, marginBottom:10 }}>Time Split</div>
              {(() => {
                const totalTime = Object.values(timePerQ).reduce((a,b)=>a+b,0);
                const otherTime = Math.max(0, totalTime - timeOnCorrect - scoreDragSecs);
                return (
                  <>
                    <DonutChart size={148}
                      segments={[{value:timeOnCorrect,color:AZ.grn},{value:scoreDragSecs,color:AZ.red},{value:otherTime,color:"#E2E8F0"}]}
                      centerLabel={fmtSecs(totalTime)} centerSub="total used"
                      labels={[fmtSecs(timeOnCorrect), fmtSecs(scoreDragSecs), otherTime > 5 ? fmtSecs(otherTime) : null]} />
                    <div style={{ marginTop:6, fontSize:10, color:AZ.textS, textAlign:"center", lineHeight:1.9 }}>
                      <span style={{color:AZ.grn,fontWeight:700}}>{fmtSecs(timeOnCorrect)}</span> Correct &nbsp;·&nbsp;
                      <span style={{color:AZ.red,fontWeight:700}}>{fmtSecs(scoreDragSecs)}</span> Wrong
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}

          {/* Marks breakdown */}
          <div style={{ flex:"1 1 160px", background:AZ.card, borderRadius:10, padding:"14px 16px", border:`1px solid ${AZ.bord}` }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:AZ.textM, marginBottom:12 }}>Marks Breakdown</div>
            {[
              {l:"Marks Earned",   v:`+${marksEarned}`, c:AZ.grn },
              {l:"Negative Marks", v:`−${negativeMarks}`, c:AZ.red },
            ].map(r => (
              <div key={r.l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ fontSize:12, color:AZ.textS }}>{r.l}</span>
                <span style={{ fontFamily:"var(--font-mono)", fontWeight:700, fontSize:16, color:r.c }}>{r.v}</span>
              </div>
            ))}
            <div style={{ height:1, background:AZ.bord, margin:"10px 0" }} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, fontWeight:700, color:AZ.text }}>Total Marks</span>
              <span style={{ fontFamily:"var(--font-mono)", fontWeight:800, fontSize:22, color: pct >= 70 ? AZ.grn : pct >= 45 ? AZ.amb : AZ.red }}>{totalScore}</span>
            </div>
          </div>
        </div>

        {/* ── BLOCK 4: Per-Question Time Chart ─────────────────────────── */}
        {hasTimeData && (
          <div style={{ background:AZ.card, borderRadius:12, padding:"16px 18px", marginBottom:16, border:`1px solid ${AZ.bord}`, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, flexWrap:"wrap" }}>
              <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", color:AZ.textM }}>Time per Question</span>
              <span style={{ display:"flex", gap:10, fontSize:10, color:AZ.textS }}>
                <span><span style={{color:AZ.grn,fontWeight:700}}>■</span> Correct</span>
                <span><span style={{color:AZ.red,fontWeight:700}}>■</span> Wrong</span>
                <span><span style={{color:AZ.amb,fontWeight:700}}>■</span> Skipped</span>
              </span>
              <span style={{ marginLeft:"auto", fontSize:10, color:AZ.textM }}>
                Q number shown below each bar · seconds shown above
              </span>
            </div>
            <TimeBarChart timePerQ={timePerQ} questions={questions} answers={answers} />
            <div style={{ display:"flex", gap:16, marginTop:10, fontSize:11, color:AZ.textS, flexWrap:"wrap" }}>
              <span>Total time: <strong style={{color:AZ.text,fontFamily:"var(--font-mono)"}}>{fmtSecs(Object.values(timePerQ).reduce((a,b)=>a+b,0))}</strong></span>
              {scoreDragSecs > 0 && <span>Wasted on wrong answers: <strong style={{color:AZ.red,fontFamily:"var(--font-mono)"}}>{fmtSecs(scoreDragSecs)}</strong></span>}
            </div>
          </div>
        )}

        {/* ── BLOCK 5: Topic Accuracy ───────────────────────────────────── */}
        {topicRows.filter(t => t.attempted > 0).length > 0 && (
          <div style={{ background:AZ.card, borderRadius:10, padding:"14px 16px", marginBottom:16, border:`1px solid ${AZ.bord}` }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:AZ.textM, marginBottom:14 }}>
              Topic Accuracy — Weakest First
            </div>
            {topicRows.filter(t => t.attempted > 0).map(t => {
              const acc = t.accuracy;
              const col = acc >= 70 ? AZ.grn : acc >= 45 ? AZ.amb : AZ.red;
              return (
                <div key={t.topic} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:12, color:AZ.textS }}>{t.topic}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:700, color:col }}>{acc}% ({t.correct}/{t.attempted})</span>
                  </div>
                  <div style={{ height:5, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${acc}%`, background:col, borderRadius:3, transition:"width .5s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── BLOCK 6: Advisory ─────────────────────────────────────────── */}
        <div style={{ background:AZ.card, borderRadius:10, padding:"14px 16px", marginBottom:20, border:`1px solid ${AZ.bord}` }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:AZ.textM, marginBottom:10 }}>What to Do Next</div>
          {!analysis ? (
            <div style={{ fontSize:12, color:AZ.textS }}>Generating analysis…</div>
          ) : (
            <>
              {analysis.summary && <p style={{ fontSize:13, color:AZ.textS, fontWeight:500, lineHeight:1.6, marginBottom:10, paddingBottom:10, borderBottom:`1px solid ${AZ.bord}` }}>{analysis.summary}</p>}
              {(analysis.actions || []).map((a, i) => (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:8 }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>{ACTION_ICONS[i] || "•"}</span>
                  <span style={{ fontSize:13, color:AZ.textS, lineHeight:1.6 }}>{a}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── BLOCK 7: Action Buttons — context-aware ─────────────────── */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", flexDirection: isMobile ? "column" : "row" }}>

          {/* Review Answers: PRIMARY for past review, secondary for fresh */}
          <button onClick={onReview} style={{ flex:1, minWidth:0, height:40, borderRadius:8,
            fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)",
            background: isPastReview ? AZ.ind : "transparent",
            color:       isPastReview ? "#fff"  : AZ.textS,
            border:      isPastReview ? "none"  : `1px solid ${AZ.bord}` }}>
            Review Answers
          </button>

          {/* My Analytics: always outline */}
          {onViewAnalytics && (
            <button onClick={onViewAnalytics} style={{ flex:1, minWidth:0, height:40,
              background:"transparent", color:AZ.ind, border:`1.5px solid ${AZ.ind}`,
              borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"var(--font-body)" }}>
              📊 My Analytics
            </button>
          )}

          {/* Right CTA: "Begin New Test" fresh · "Back to Dashboard" past */}
          <button onClick={onNewTest} style={{ flex:1, minWidth:0, height:40, borderRadius:8,
            fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)",
            background: isPastReview ? "transparent" : AZ.grn,
            color:       isPastReview ? AZ.textS      : "#0D0D0D",
            border:      isPastReview ? `1px solid ${AZ.bord}` : "none" }}>
            {isPastReview ? "← Back to Dashboard" : "Begin New Test →"}
          </button>

        </div>
      </div>
    </div>
  );
}

// ── REVIEW SCREEN ─────────────────────────────────────────────────────────────
function ReviewScreen({ questions, answers, onBack }) {
  const [filter, setFilter]           = useState("all");
  const [showPalette, setShowPalette] = useState(false);
  const cardRefs = useRef([]);
  const isMobile = useMobile();
  useEffect(() => { logEvent("page_view", { page: "review" }); }, []);

  const counts = questions.reduce((acc, _, i) => {
    const ua = answers[i];
    if (ua === undefined) acc.skipped++;
    else if (ua === questions[i].correct) acc.correct++;
    else acc.wrong++;
    return acc;
  }, { correct: 0, wrong: 0, skipped: 0 });

  const visibleIndices = questions.reduce((acc, q, i) => {
    const ua = answers[i], ok = ua === q.correct, skip = ua === undefined;
    if (filter === "all" ||
        (filter === "wrong"   && !skip && !ok) ||
        (filter === "skipped" && skip) ||
        (filter === "correct" && !skip && ok)) acc.push(i);
    return acc;
  }, []);

  function scrollTo(i) {
    if (!visibleIndices.includes(i)) {
      setFilter("all");
      setTimeout(() => cardRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } else {
      cardRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (isMobile) setShowPalette(false);
  }

  function tileStyle(i) {
    const ua = answers[i], skip = ua === undefined;
    if (skip)                    return { bg: "#F1F5F9", bc: "#CBD5E1", cl: "#64748B" };
    if (ua === questions[i].correct) return { bg: "#ECFDF5", bc: "#059669", cl: "#059669" };
    return { bg: "#FEF2F2", bc: "#DC2626", cl: "#DC2626" };
  }

  const PalettePanel = () => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* summary */}
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--border)" }}>
        {[["Correct", counts.correct, "#ECFDF5", "#059669"],
          ["Wrong",   counts.wrong,   "#FEF2F2", "#DC2626"],
          ["Skipped", counts.skipped, "#FFFBEB", "#D97706"]].map(([label, n, bg, cl]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{label}</span>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, color: cl,
              background: bg, padding: "0 6px", borderRadius: 4 }}>{n}</span>
          </div>
        ))}
      </div>
      {/* filter chips */}
      <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 4 }}>
        {[["all","All"],["wrong","Wrong"],["skipped","Skip"],["correct","Correct"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, cursor: "pointer",
              background: filter === v ? "var(--navy)" : "var(--bg-alt)",
              color:      filter === v ? "#fff"        : "var(--text-secondary)",
              border: "1px solid " + (filter === v ? "var(--navy)" : "var(--border)") }}>{l}</button>
        ))}
      </div>
      {/* tiles */}
      <div style={{ padding: "10px 10px", display: "flex", flexWrap: "wrap", gap: 5,
        overflowY: "auto", maxHeight: isMobile ? "50vh" : "calc(100vh - 260px)" }}>
        {questions.map((_, i) => {
          const { bg, bc, cl } = tileStyle(i);
          const dim = !visibleIndices.includes(i);
          return (
            <button key={i} onClick={() => scrollTo(i)} title={"Q." + (i+1)}
              style={{ width: 30, height: 30, borderRadius: 4, border: "1.5px solid " + bc,
                background: dim ? "#F8FAFC" : bg, color: dim ? "#CBD5E1" : cl,
                fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)",
                cursor: "pointer", opacity: dim ? 0.4 : 1,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* header */}
      <div className="nta-header">
        <span className="nta-logo">Vantiq <span>CUET</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isMobile && (
            <button onClick={() => setShowPalette(true)}
              style={{ background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.2)",
                borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)" }}>
              ✓ {counts.correct} &nbsp;✗ {counts.wrong}
            </button>
          )}
          <button onClick={onBack}
            style={{ background: "transparent", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.2)",
              borderRadius: 6, padding: "4px 14px", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)" }}>
            ← Back to Report
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* left palette — desktop */}
        {!isMobile && (
          <div style={{ width: 164, flexShrink: 0, borderRight: "1px solid var(--border)", background: "#fff",
            position: "sticky", top: 0, height: "calc(100vh - 52px)", overflowY: "auto", alignSelf: "flex-start" }}>
            <div style={{ padding: "10px 12px 6px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em",
              textTransform: "uppercase", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
              Questions
            </div>
            <PalettePanel />
          </div>
        )}

        {/* question cards */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 14px" : "24px 28px", maxWidth: 820 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--navy)", marginBottom: 6 }}>Answer Review</h1>
          {filter !== "all" && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>
              Showing {visibleIndices.length} {filter} question{visibleIndices.length !== 1 ? "s" : ""}
              {" · "}<button onClick={() => setFilter("all")} style={{ fontSize: 12, color: "var(--indigo)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Show all</button>
            </p>
          )}
          {filter !== "all" && visibleIndices.length === 0 && (
            <p style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No {filter} questions in this test.</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {questions.map((q, i) => {
              if (!visibleIndices.includes(i)) return null;
              const ua = answers[i], ok = ua === q.correct, skip = ua === undefined;
              const bc = skip ? "var(--border)" : ok ? "var(--success)" : "var(--danger)";
              return (
                <div key={i} ref={el => { cardRefs.current[i] = el; }}
                  style={{ borderLeft: "4px solid " + bc, background: "#fff", borderRadius: "0 10px 10px 0",
                    padding: "18px 20px 14px", boxShadow: "var(--card-shadow)", border: "1px solid var(--border)",
                    scrollMarginTop: 20 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    <span className="pill pill-navy" style={{ fontSize: 10 }}>Q.{i + 1}</span>
                    <span className="pill pill-indigo" style={{ fontSize: 10 }}>{q.topic}</span>
                    {skip      && <span className="pill pill-amber" style={{ fontSize: 10 }}>Skipped</span>}
                    {!skip && ok  && <span className="pill pill-green" style={{ fontSize: 10 }}>+5</span>}
                    {!skip && !ok && <span className="pill pill-red"   style={{ fontSize: 10 }}>&minus;1</span>}
                  </div>
                  {q.passage && (
                    <div style={{ background: "#F5F7FF", borderLeft: "3px solid var(--indigo)", padding: "10px 14px",
                      borderRadius: "0 6px 6px 0", fontSize: 12.5, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--indigo)", marginBottom: 6 }}>Reading Passage</div>
                      {q.passage}
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
                  <div style={{ display: "flex", gap: 16, fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                    letterSpacing: ".05em", color: "var(--text-muted)", marginBottom: 8, flexWrap: "wrap" }}>
                    {!skip && <span>Your Answer: <span style={{ color: ok ? "var(--success)" : "var(--danger)" }}>{String.fromCharCode(65 + ua)} — {q.options[ua]}</span></span>}
                    <span>Correct Answer: <span style={{ color: "var(--success)" }}>{String.fromCharCode(65 + q.correct)} — {q.options[q.correct]}</span></span>
                  </div>
                  {q.explanation && (
                    <div style={{ background: "var(--bg-alt)", border: "1px solid var(--border)", borderRadius: 6,
                      padding: "10px 14px", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.65 }}>
                      <span style={{ fontWeight: 600, color: "var(--navy)", marginRight: 4 }}>Explanation:</span>{q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button className="btn-primary" style={{ marginTop: 28, width: "100%" }} onClick={onBack}>
            ← Back to Results
          </button>
        </div>
      </div>

      {/* mobile palette drawer */}
      {isMobile && showPalette && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", zIndex: 998, display: "flex", alignItems: "flex-end" }}
          onClick={() => setShowPalette(false)}>
          <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", width: "100%", maxHeight: "70vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>Questions</span>
              <button onClick={() => setShowPalette(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <PalettePanel />
          </div>
        </div>
      )}
    </div>
  );
}
// ── PERFORMANCE DASHBOARD ────────────────────────────────────────────────────
function PerformanceDashboard({ testHistory, user, onBack, onBackToResults }) {
  const isMobile = useMobile();
  useEffect(() => { logEvent("page_view", { page: "performance_dashboard" }); }, []);

  if (!testHistory || testHistory.length === 0) {
    return (
      <div style={{ minHeight:"100vh", background:AZ.bg, display:"flex", flexDirection:"column" }}>
        <div className="nta-header">
          <span className="nta-logo">Vantiq <span>CUET</span></span>
          <div style={{ display:"flex", gap:8 }}>
            {onBackToResults && (
              <button onClick={onBackToResults}
                style={{ background:"transparent", color:"rgba(255,255,255,.7)", border:"1px solid rgba(255,255,255,.25)", borderRadius:6, padding:"4px 12px", fontSize:13, cursor:"pointer", fontFamily:"var(--font-body)" }}>
                ← Results
              </button>
            )}
            <button onClick={onBack}
              style={{ background:"transparent", color:"rgba(255,255,255,.5)", border:"1px solid rgba(255,255,255,.18)", borderRadius:6, padding:"4px 14px", fontSize:13, cursor:"pointer", fontFamily:"var(--font-body)" }}>
              Dashboard
            </button>
          </div>
        </div>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:16 }}>📊</div>
            <p style={{ color:AZ.textS, fontSize:14, marginBottom:20 }}>Complete your first test to unlock performance analytics.</p>
            <button onClick={onBack} style={{ background:AZ.ind, color:"#fff", border:"none", borderRadius:8, padding:"10px 24px", fontSize:14, fontWeight:700, cursor:"pointer" }}>Start a Test →</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  function linReg(data) {
    const n = data.length;
    if (n < 2) return { slope: 0 };
    const xm = (n-1)/2, ym = data.reduce((s,v)=>s+v,0)/n;
    let num=0, den=0;
    data.forEach((y,x) => { num += (x-xm)*(y-ym); den += (x-xm)**2; });
    return { slope: den ? num/den : 0 };
  }
  function fmtDate(ts) {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
  }

  // ── Derive data ───────────────────────────────────────────────────────
  const attempts   = [...testHistory].reverse(); // oldest first
  const totalTests = attempts.length;
  const allAcc     = attempts.map(t => t.accuracy || 0);
  const avgAcc     = Math.round(allAcc.reduce((s,v)=>s+v,0) / totalTests);
  const bestAcc    = Math.max(...allAcc);
  const latestAcc  = allAcc[allAcc.length - 1];
  const prevAcc    = allAcc.length >= 2 ? allAcc[allAcc.length - 2] : null;
  const trendDelta = prevAcc !== null ? latestAcc - prevAcc : null;

  const { slope } = linReg(allAcc);
  const trendLabel = allAcc.length < 3 ? null : slope > 1 ? { text:"↑ Trending upward", c:AZ.grn } : slope < -1 ? { text:"↓ Trending downward", c:AZ.red } : { text:"→ Plateauing", c:AZ.amb };

  // Per-subject data
  const bySubject = {};
  attempts.forEach(t => {
    const s = t.subject || "English";
    if (!bySubject[s]) bySubject[s] = [];
    bySubject[s].push(t);
  });

  // Topic heatmap — from topicResults stored per test
  const heatTests = attempts.filter(t => t.topicResults && t.topicResults.length > 0).slice(-10);
  const allTopics = heatTests.length > 0
    ? [...new Set(heatTests.flatMap(t => t.topicResults.map(r => r.topic)))]
    : [];

  // Focus areas — average accuracy per topic across all tests with data
  const topicAvgMap = {};
  heatTests.forEach(t => {
    (t.topicResults || []).forEach(r => {
      if (!topicAvgMap[r.topic]) topicAvgMap[r.topic] = [];
      topicAvgMap[r.topic].push(r.accuracy);
    });
  });
  const focusAreas = Object.entries(topicAvgMap)
    .map(([topic, accs]) => ({ topic, avg: Math.round(accs.reduce((s,v)=>s+v,0)/accs.length), n: accs.length, last: accs[accs.length-1] }))
    .filter(f => f.n >= 1)
    .sort((a,b) => a.avg - b.avg)
    .slice(0, 3);

  // Improvement banner
  const showBanner = attempts.length >= 3;
  const recent3avg  = showBanner ? Math.round(allAcc.slice(-3).reduce((s,v)=>s+v,0)/3) : 0;
  const early3avg   = showBanner ? Math.round(allAcc.slice(0,3).reduce((s,v)=>s+v,0)/3) : 0;
  const bannerDelta = showBanner ? recent3avg - early3avg : 0;
  const improving   = bannerDelta > 1;
  const declining   = bannerDelta < -1;

  // Wrong answers trend
  const wrongTrend = attempts.map(t => t.wrong || 0);
  const { slope: wrongSlope } = linReg(wrongTrend);

  const subjectColors = { English: AZ.ind, GAT: AZ.grn, Economics: AZ.amb };
  const subjectLabels = { English:"English (101)", GAT:"GAT (501)", Economics:"Economics (118)" };

  const sLabel = (txt) => (
    <div style={{ fontSize:10, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:AZ.textM, marginBottom:14 }}>{txt}</div>
  );

  const Stat = ({ label, val, sub, col = AZ.ind }) => (
    <div style={{ background:AZ.card2, borderRadius:8, padding:"12px 14px", flex:"1 1 auto", minWidth:90 }}>
      <div style={{ fontFamily:"var(--font-mono)", fontSize:22, fontWeight:800, color:col, lineHeight:1 }}>{val}</div>
      <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:AZ.textM, marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:AZ.textM, marginTop:2 }}>{sub}</div>}
    </div>
  );

  const cellBg  = acc => acc === null ? "rgba(255,255,255,0.03)" : acc >= 70 ? "rgba(52,211,153,0.18)" : acc >= 45 ? "rgba(251,191,36,0.18)" : "rgba(248,113,113,0.18)";
  const cellCol = acc => acc === null ? AZ.textM : acc >= 70 ? AZ.grn : acc >= 45 ? AZ.amb : AZ.red;

  return (
    <div style={{ minHeight:"100vh", background:AZ.bg, display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div className="nta-header">
        <span className="nta-logo">Vantiq <span>CUET</span></span>
        <button onClick={onBack} style={{ background:"transparent", color:"rgba(255,255,255,.55)", border:"1px solid rgba(255,255,255,.18)", borderRadius:6, padding:"4px 14px", fontSize:13, cursor:"pointer", fontFamily:"var(--font-body)" }}>← Dashboard</button>
      </div>

      <div style={{ flex:1, maxWidth:880, margin:"0 auto", width:"100%", padding: isMobile ? "16px 14px" : "28px 24px" }}>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:22, color:AZ.text, marginBottom:4 }}>Performance Analytics</h1>
        <p style={{ fontSize:12, color:AZ.textM, marginBottom:20 }}>Based on your {totalTests} test{totalTests !== 1?"s":""}</p>

        {/* ── Improvement Banner ─────────────────────────────────────── */}
        {showBanner && (improving || declining) && (
          <div style={{ background: improving ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
            border:`1px solid ${improving ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)"}`,
            borderRadius:10, padding:"14px 16px", marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
            <span style={{ fontSize:26 }}>{improving ? "🏆" : "📌"}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:improving ? AZ.grn : AZ.red }}>
                {improving
                  ? `You've improved ${Math.abs(bannerDelta)}% compared to your first tests`
                  : `Recent accuracy is ${Math.abs(bannerDelta)}% below your early average`}
              </div>
              <div style={{ fontSize:12, color:AZ.textS, marginTop:3 }}>
                {improving ? "Consistent practice is paying off. Keep going." : "Review your wrong answers carefully to identify the pattern."}
              </div>
            </div>
          </div>
        )}

        {/* ── Stats Strip ───────────────────────────────────────────── */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
          <Stat label="Tests Taken"   val={totalTests}  sub="all subjects"       col={AZ.ind} />
          <Stat label="Avg Accuracy"  val={`${avgAcc}%`} sub="across all tests"  col={AZ.blu} />
          <Stat label="Best Score"    val={`${bestAcc}%`} sub="personal best"    col={AZ.grn} />
          <Stat label="Latest Test"   val={`${latestAcc}%`}
            sub={trendDelta !== null ? (trendDelta >= 0 ? `▲ +${trendDelta}% vs prev` : `▼ ${trendDelta}% vs prev`) : "first test"}
            col={trendDelta === null ? AZ.textM : trendDelta >= 0 ? AZ.grn : AZ.red} />
        </div>

        {/* ── Progression Trend ─────────────────────────────────────── */}
        <div style={{ background:AZ.card, borderRadius:12, padding:"16px 18px", marginBottom:16, border:`1px solid ${AZ.bord}` }}>
          {sLabel("Your Progress Over Time")}

          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            {/* Score Trend */}
            <div style={{ flex:"1 1 260px", minWidth:0 }}>
              <div style={{ fontSize:11, color:AZ.textS, marginBottom:8, fontWeight:600 }}>
                Accuracy per Test
                {trendLabel && <span style={{ marginLeft:8, fontSize:11, color:trendLabel.c, fontWeight:700 }}>{trendLabel.text}</span>}
              </div>
              {(() => {
                const W = 400, H = 130;
                const data = allAcc;
                if (data.length < 2) return <div style={{fontSize:11,color:AZ.textM}}>Need 2+ tests for trend chart</div>;
                const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
                const px = (i) => ((i/(data.length-1))*(W-20)+10).toFixed(1);
                const py = (v) => (H-12-((v-min)/range)*(H-30)).toFixed(1);
                const pts = data.map((v,i) => `${px(i)},${py(v)}`).join(" ");
                const { slope: s2 } = linReg(data);
                const ymean = data.reduce((a,b)=>a+b,0)/data.length;
                const y0r = H-12-((ymean - s2*(data.length-1)/2 - min)/range)*(H-30);
                const y1r = H-12-((ymean + s2*(data.length-1)/2 - min)/range)*(H-30);
                const li = data.length-1;
                return (
                  <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
                    style={{display:"block",width:"100%",height:"auto",minHeight:90}}>
                    {/* Grid lines */}
                    {[0,25,50,75,100].map(v => {
                      const y = H-12-((v-min)/range)*(H-30);
                      return y >= 0 && y <= H ? (
                        <g key={v}>
                          <line x1={10} y1={y} x2={W-10} y2={y} stroke="rgba(0,0,0,0.07)" strokeWidth={1} />
                          <text x={6} y={y+3} textAnchor="end" fontSize={8} fill={AZ.textM} fontFamily="JetBrains Mono,monospace">{v}</text>
                        </g>
                      ) : null;
                    })}
                    {/* Trend regression line */}
                    <line x1={10} y1={y0r} x2={W-10} y2={y1r} stroke={AZ.amb} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.7} />
                    {/* Filled area under line */}
                    <polyline points={data.map((v,i)=>`${px(i)},${py(v)}`).join(" ") + ` ${px(li)},${H-12} 10,${H-12}`}
                      fill={`rgba(67,56,202,0.06)`} stroke="none" />
                    {/* Score line */}
                    <polyline points={pts} fill="none" stroke={AZ.ind} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    {/* Dots + labels */}
                    {data.map((v,i) => {
                      const dx = px(i), dy = py(v);
                      const showLbl = data.length <= 10 || i === li || i === 0;
                      const anchor = i === 0 ? "start" : i === li ? "end" : "middle";
                      return (
                        <g key={i}>
                          <circle cx={dx} cy={dy} r={i===li?5:3} fill={i===li?AZ.ind:"rgba(67,56,202,0.55)"} stroke="#F5F7FA" strokeWidth={1.5} />
                          {showLbl && <text x={dx} y={parseFloat(dy)-8} textAnchor={anchor} fontSize={9}
                            fill={i===li?AZ.ind:AZ.textM} fontFamily="JetBrains Mono,monospace" fontWeight={i===li?700:500}>{v}%</text>}
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:9, color:AZ.textM }}>
                <span>Oldest</span><span style={{color:AZ.amb}}>— Trend</span><span>Latest</span>
              </div>
            </div>

            {/* Wrong answers trend */}
            <div style={{ flex:"1 1 200px", minWidth:0 }}>
              <div style={{ fontSize:11, color:AZ.textS, marginBottom:8, fontWeight:600 }}>
                Wrong Answers per Test
                {attempts.length >= 3 && <span style={{ marginLeft:8, fontSize:11, fontWeight:700, color: wrongSlope < -0.5 ? AZ.grn : wrongSlope > 0.5 ? AZ.red : AZ.amb }}>
                  {wrongSlope < -0.5 ? "↓ Improving" : wrongSlope > 0.5 ? "↑ Getting worse" : "→ Steady"}
                </span>}
              </div>
              {(() => {
                const VW = 360, VH = 130;
                const data = wrongTrend;
                if (data.length < 1) return null;
                const maxV = Math.max(...data, 1);
                const gap = 3, bw = Math.max(6, Math.floor((VW - 12 - gap*(data.length-1)) / data.length));
                const totalW = data.length * bw + (data.length-1)*gap + 8;
                return (
                  <svg width="100%" viewBox={`0 0 ${totalW} ${VH}`} preserveAspectRatio="xMidYMid meet"
                    style={{display:"block",width:"100%",height:"auto",minHeight:90}}>
                    {/* Y-axis grid */}
                    {[0, Math.ceil(maxV/2), maxV].map(v => {
                      const y = VH-12-((v/maxV)*(VH-28));
                      return (
                        <g key={v}>
                          <line x1={4} y1={y} x2={totalW-4} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
                          <text x={2} y={y+3} textAnchor="start" fontSize={7} fill={AZ.textM} fontFamily="JetBrains Mono,monospace">{v}</text>
                        </g>
                      );
                    })}
                    {data.map((v, i) => {
                      const bh = Math.max(4, Math.round((v/maxV)*(VH-28)));
                      const x = 4 + i * (bw + gap), y = VH - 12 - bh;
                      const isLast = i === data.length - 1;
                      const col = v === 0 ? AZ.grn : isLast ? AZ.red : "rgba(220,38,38,0.5)";
                      return (
                        <g key={i}>
                          <rect x={x} y={y} width={bw} height={bh} rx={3} fill={col} />
                          <text x={x+bw/2} y={y-4} textAnchor="middle" fontSize={9}
                            fill={v===0 ? AZ.grn : isLast ? AZ.red : AZ.textM}
                            fontFamily="JetBrains Mono,monospace" fontWeight={isLast?700:500}>{v}</text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
              <div style={{ fontSize:9, color:AZ.textM, marginTop:4 }}>Fewer wrong = less guessing = real improvement</div>
            </div>
          </div>
        </div>

        {/* ── Subject-wise Cards — always show all 3 ─────────────────── */}
        <div style={{ background:AZ.card, borderRadius:12, padding:"16px 18px", marginBottom:16, border:`1px solid ${AZ.bord}` }}>
          {sLabel("Subject-Wise Progression")}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {["English","GAT","Economics"].map(sub => {
              const tests   = bySubject[sub] || [];
              const col     = subjectColors[sub] || AZ.ind;
              const hasData = tests.length > 0;
              if (!hasData) return (
                <div key={sub} style={{ flex:"1 1 160px", background:AZ.card2, borderRadius:10, padding:"14px 16px",
                  border:`1px solid ${AZ.bord}`, opacity:0.7 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:AZ.text }}>{subjectLabels[sub]}</div>
                  <div style={{ fontSize:10, color:AZ.textM, marginTop:4, marginBottom:16 }}>No tests yet</div>
                  <div style={{ height:30, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ height:2, width:"80%", background:AZ.bord, borderRadius:1 }} />
                  </div>
                  <div style={{ marginTop:8, fontFamily:"var(--font-mono)", fontSize:13, color:AZ.textM }}>—</div>
                  <div style={{ fontSize:9, color:AZ.textM }}>avg accuracy</div>
                </div>
              );
              const subAcc  = tests.map(t => t.accuracy || 0);
              const subAvg  = Math.round(subAcc.reduce((s,v)=>s+v,0)/subAcc.length);
              const subBest = Math.max(...subAcc);
              const subLast = subAcc[subAcc.length-1];
              const { slope: subSlope } = linReg(subAcc);
              const subTrend = subAcc.length < 2 ? null : subSlope > 1 ? { t:"↑", c:AZ.grn } : subSlope < -1 ? { t:"↓", c:AZ.red } : { t:"→", c:AZ.amb };
              return (
                <div key={sub} style={{ flex:"1 1 160px", background:AZ.card2, borderRadius:10, padding:"14px 16px", border:`1px solid ${AZ.bord}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:AZ.text }}>{subjectLabels[sub]}</div>
                      <div style={{ fontSize:10, color:AZ.textM, marginTop:2 }}>{tests.length} test{tests.length!==1?"s":""}</div>
                    </div>
                    {subTrend && <span style={{ fontSize:15, color:subTrend.c, fontWeight:700 }}>{subTrend.t}</span>}
                  </div>
                  {subAcc.length >= 2
                    ? (() => {
                        const w2 = isMobile ? 120 : 140, h2 = 36;
                        const mx = Math.max(...subAcc), mn = Math.min(...subAcc), rng = mx-mn || 1;
                        const pts2 = subAcc.map((v,i) =>
                          `${((i/(subAcc.length-1))*(w2-10)+5).toFixed(1)},${(h2-5-((v-mn)/rng)*(h2-12)).toFixed(1)}`
                        ).join(" ");
                        const li2 = subAcc.length-1;
                        const lx2 = ((li2/(subAcc.length-1))*(w2-10)+5).toFixed(1);
                        const ly2 = (h2-5-((subAcc[li2]-mn)/rng)*(h2-12)).toFixed(1);
                        return (
                          <svg width={w2} height={h2}>
                            <polyline points={pts2} fill="none" stroke={col} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                            {subAcc.map((v,i) => {
                              const dx2 = ((i/(subAcc.length-1))*(w2-10)+5).toFixed(1);
                              const dy2 = (h2-5-((v-mn)/rng)*(h2-12)).toFixed(1);
                              return <circle key={i} cx={dx2} cy={dy2} r={i===li2?3.5:2} fill={i===li2?col:"rgba(67,56,202,0.4)"} stroke="#F1F5F9" strokeWidth={1}/>;
                            })}
                            <text x={lx2} y={parseFloat(ly2)-7} textAnchor="end" fontSize={8}
                              fill={col} fontFamily="JetBrains Mono,monospace" fontWeight={700}>{subAcc[li2]}%</text>
                          </svg>
                        );
                      })()
                    : <div style={{ height:36, display:"flex", alignItems:"center" }}>
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:20, fontWeight:800, color:col }}>{subAcc[0]}%</div>
                        <div style={{ fontSize:9, color:AZ.textM, marginLeft:6 }}>1 test only</div>
                      </div>
                  }
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
                    <div>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:17, fontWeight:800, color:col }}>{subAvg}%</div>
                      <div style={{ fontSize:9, color:AZ.textM }}>avg accuracy</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:17, fontWeight:800, color:AZ.grn }}>{subBest}%</div>
                      <div style={{ fontSize:9, color:AZ.textM }}>best score</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Topic Heatmap ─────────────────────────────────────────── */}
        {heatTests.length >= 2 && allTopics.length > 0 && (
          <div style={{ background:AZ.card, borderRadius:12, padding:"16px 18px", marginBottom:16, border:`1px solid ${AZ.bord}` }}>
            {sLabel("Topic Performance Heatmap")}
            <p style={{ fontSize:11, color:AZ.textS, marginBottom:12 }}>
              How each topic performed across your tests. Darker green = stronger. Red = needs work.
            </p>
            <div style={{ overflowX:"auto" }}>
              <table style={{ borderCollapse:"separate", borderSpacing:"3px 3px", fontSize:10, minWidth:300 }}>
                <thead>
                  <tr>
                    <th style={{ padding:"4px 8px", textAlign:"left", fontSize:9, fontWeight:700, textTransform:"uppercase", color:AZ.textM, minWidth:130 }}>Topic</th>
                    {heatTests.map((_,i) => (
                      <th key={i} style={{ padding:"4px 6px", textAlign:"center", fontSize:9, fontWeight:700, color:AZ.textM, minWidth:44 }}>T{i+1}</th>
                    ))}
                    <th style={{ padding:"4px 6px", textAlign:"center", fontSize:9, fontWeight:700, color:AZ.text, minWidth:44 }}>Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {allTopics.map(topic => {
                    const accs = heatTests.map(t => {
                      const r = (t.topicResults||[]).find(x => x.topic === topic);
                      return r ? r.accuracy : null;
                    });
                    const valid = accs.filter(a => a !== null);
                    const avg   = valid.length > 0 ? Math.round(valid.reduce((s,a)=>s+a,0)/valid.length) : null;
                    const last  = [...accs].reverse().find(a => a !== null);
                    const trend = avg !== null && last !== null ? (last > avg ? "▲" : last < avg ? "▼" : "→") : "";
                    const tCol  = trend === "▲" ? AZ.grn : trend === "▼" ? AZ.red : AZ.amb;
                    return (
                      <tr key={topic}>
                        <td style={{ padding:"5px 8px", fontSize:11, color:AZ.textS, whiteSpace:"nowrap", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis" }}>{topic}</td>
                        {accs.map((acc, i) => (
                          <td key={i} style={{ padding:"5px 6px", textAlign:"center", background:cellBg(acc), borderRadius:5 }}>
                            <span style={{ fontFamily:"var(--font-mono)", fontSize:10, fontWeight:700, color:cellCol(acc) }}>
                              {acc !== null ? `${acc}%` : "—"}
                            </span>
                          </td>
                        ))}
                        <td style={{ padding:"5px 6px", textAlign:"center", background:cellBg(avg), borderRadius:5 }}>
                          <span style={{ fontFamily:"var(--font-mono)", fontSize:10, fontWeight:700, color:cellCol(avg) }}>{avg !== null ? `${avg}%` : "—"}</span>
                          {trend && <span style={{ fontSize:9, color:tCol, marginLeft:2 }}>{trend}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop:10, fontSize:10, color:AZ.textM }}>
              <span style={{color:AZ.grn}}>■</span> ≥70% Strong &nbsp;
              <span style={{color:AZ.amb}}>■</span> 45–69% Average &nbsp;
              <span style={{color:AZ.red}}>■</span> &lt;45% Needs Work &nbsp;
              <span style={{color:AZ.textM}}>■</span> Not attempted
            </div>
          </div>
        )}

        {/* ── Focus Areas ───────────────────────────────────────────── */}
        {focusAreas.length > 0 && (
          <div style={{ background:AZ.card, borderRadius:12, padding:"16px 18px", marginBottom:16, border:`1px solid ${AZ.bord}` }}>
            {sLabel("Where to Focus")}
            <p style={{ fontSize:11, color:AZ.textS, marginBottom:12 }}>Your weakest topics across all tests — put extra time here.</p>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {focusAreas.map((f, i) => {
                const col = f.avg >= 70 ? AZ.grn : f.avg >= 45 ? AZ.amb : AZ.red;
                const trendDir = f.last > f.avg ? "▲" : f.last < f.avg ? "▼" : "→";
                const trendC   = trendDir === "▲" ? AZ.grn : trendDir === "▼" ? AZ.red : AZ.amb;
                return (
                  <div key={f.topic} style={{ flex:"1 1 120px", minWidth:0, background:AZ.card2, borderRadius:10, padding:"12px 14px", border:`1px solid ${AZ.bord}` }}>
                    <div style={{ fontWeight:700, fontSize:12, color:AZ.text, marginBottom:6, lineHeight:1.3 }}>{f.topic}</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:26, fontWeight:800, color:col, lineHeight:1 }}>{f.avg}%</div>
                    <div style={{ fontSize:10, color:AZ.textM, marginTop:3 }}>avg over {f.n} test{f.n!==1?"s":""}</div>
                    <div style={{ height:4, background:"rgba(255,255,255,0.07)", borderRadius:2, margin:"8px 0 4px" }}>
                      <div style={{ height:"100%", width:`${f.avg}%`, background:col, borderRadius:2 }} />
                    </div>
                    <span style={{ fontSize:10, color:trendC, fontWeight:700 }}>{trendDir} Last: {f.last}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── All Attempts Log ──────────────────────────────────────── */}
        <div style={{ background:AZ.card, borderRadius:12, padding:"14px 18px", marginBottom:24, border:`1px solid ${AZ.bord}` }}>
          {sLabel("All Attempts")}
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:500 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${AZ.bord}` }}>
                  {["#","Date","Subject","Mode","Score","Correct","Wrong","Accuracy","Status"].map(h => (
                    <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", color:AZ.textM }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...attempts].reverse().map((t, i) => {
                  const p = t.accuracy || 0;
                  const modeLabel = { Mock:"Mock", QuickPractice:"QP", GAT_Mock:"Mock", GAT_QP:"QP", Economics_Mock:"Mock", Economics_QP:"QP" }[t.mode] || t.mode;
                  const sc = p >= 70 ? AZ.grn : p >= 45 ? AZ.amb : AZ.red;
                  return (
                    <tr key={i} style={{ borderBottom:`1px solid ${AZ.bord2}` }}>
                      <td style={{ padding:"9px 10px", color:AZ.textM, fontFamily:"var(--font-mono)" }}>{attempts.length - i}</td>
                      <td style={{ padding:"9px 10px", color:AZ.textS, whiteSpace:"nowrap" }}>{fmtDate(t.completedAt)}</td>
                      <td style={{ padding:"9px 10px" }}><span style={{ background:"#EEF2FF", color:AZ.ind, fontSize:9, padding:"2px 8px", borderRadius:4, fontWeight:600, border:"1px solid #C7D2FE" }}>{t.subject||"Eng"}</span></td>
                      <td style={{ padding:"9px 10px" }}><span style={{ background:"#F1F5F9", color:AZ.textS, fontSize:9, padding:"2px 8px", borderRadius:4, border:"1px solid #E2E8F0" }}>{modeLabel}</span></td>
                      <td style={{ padding:"9px 10px", fontFamily:"var(--font-mono)", fontWeight:700, color:AZ.text }}>{t.totalScore ?? "—"}</td>
                      <td style={{ padding:"9px 10px", fontFamily:"var(--font-mono)", fontWeight:700, color:AZ.grn }}>{t.correct ?? "—"}</td>
                      <td style={{ padding:"9px 10px", fontFamily:"var(--font-mono)", fontWeight:700, color:AZ.red }}>{t.wrong ?? "—"}</td>
                      <td style={{ padding:"9px 10px", fontFamily:"var(--font-mono)", fontWeight:700, color:sc }}>{p}%</td>
                      <td style={{ padding:"9px 10px" }}>
                        <span style={{ fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:4,
                          background: p>=70 ? "rgba(52,211,153,0.18)" : p>=45 ? "rgba(251,191,36,0.18)" : "rgba(248,113,113,0.18)",
                          color: sc }}>
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
    // 403 = blocked user — surface proper error rather than generic "Generation failed"
    if (res.status === 403) {
      if (d.code === "permanently_blocked") throw Object.assign(new Error(d.error), { blocked: true, permanent: true });
      if (d.code === "temporarily_blocked") throw Object.assign(new Error(d.error), { blocked: true, minutesLeft: d.minutesLeft });
      throw new Error(d.error || "Access denied.");
    }
    if (!d.questions) throw new Error(d.error || "Generation failed");
    return d.questions;
  }
  throw new Error("Cloud Function URL not configured. Set VITE_CLOUD_FUNCTION_BASE in environment variables.");
}


// ── Feedback Button & Modal ───────────────────────────────────────────────────
function FeedbackWidget({ user }) {
  const [open,    setOpen]    = useState(false);
  const [text,    setText]    = useState("");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "feedback"), {
        uid:       user?.uid || "anonymous",
        email:     user?.email || "",
        text:      text.trim(),
        createdAt: serverTimestamp(),
        page:      window.location.pathname,
      });
      setSent(true);
      setText("");
      setTimeout(() => { setSent(false); setOpen(false); }, 2000);
    } catch(e) {
      console.warn("Feedback submit failed:", e.message);
    }
    setSending(false);
  }

  return (
    <>
      {/* Floating feedback button */}
      <button
        onClick={() => setOpen(true)}
        className="feedback-float"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          background: "#0F2747", color: "#fff",
          border: "none", borderRadius: 28, padding: "10px 18px",
          fontSize: 13, fontWeight: 600, fontFamily: "var(--font-body)",
          cursor: "pointer", boxShadow: "0 4px 16px rgba(15,39,71,.35)",
          display: "flex", alignItems: "center", gap: 7,
          transition: "transform .15s, box-shadow .15s",
        }}
        onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,39,71,.45)"; }}
        onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(15,39,71,.35)"; }}
      >
        <span style={{ fontSize: 16 }}>💬</span> Feedback
      </button>

      {/* Feedback modal */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "0 24px 80px" }}
          onClick={() => setOpen(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: 340, boxShadow: "0 8px 32px rgba(0,0,0,.2)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 700, color: "#0F2747", margin: 0 }}>
                Feedback / Query
              </h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94A3B8", padding: 0 }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
              Report an issue, suggest a feature, or ask a question. We read every message.
            </p>
            {sent ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#059669", fontWeight: 600, fontSize: 14 }}>
                ✅ Thank you! Your feedback has been submitted.
              </div>
            ) : (
              <>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Describe your issue, query, or suggestion..."
                  rows={5}
                  style={{
                    width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0",
                    borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13,
                    resize: "vertical", outline: "none", boxSizing: "border-box",
                    color: "#1E293B", lineHeight: 1.6,
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSubmit}
                  disabled={sending || !text.trim()}
                  style={{
                    marginTop: 12, width: "100%", padding: "11px 0",
                    background: !text.trim() ? "#E2E8F0" : "#0F2747",
                    color: !text.trim() ? "#94A3B8" : "#fff",
                    border: "none", borderRadius: 8, fontFamily: "var(--font-body)",
                    fontSize: 14, fontWeight: 600, cursor: !text.trim() ? "not-allowed" : "pointer",
                    transition: "all .15s",
                  }}
                >
                  {sending ? "Submitting..." : "Submit Feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Star Rating Modal ─────────────────────────────────────────────────────────
function StarRatingModal({ user, onDismiss }) {
  const [rating,      setRating]      = useState(0);
  const [hovering,    setHovering]    = useState(0);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  async function handleRate(stars) {
    setRating(stars);
    setSubmitting(true);
    try {
      await addDoc(collection(db, "ratings"), {
        uid:       user?.uid,
        email:     user?.email || "",
        stars,
        createdAt: serverTimestamp(),
      });
    } catch(e) { console.warn("Rating submit failed:", e.message); }
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(onDismiss, 1800);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "32px 36px", width: 320, textAlign: "center", boxShadow: "0 12px 40px rgba(0,0,0,.18)", position: "relative" }}>
        {/* Skip button — faded, top-right */}
        <button
          onClick={onDismiss}
          style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: 12, color: "#CBD5E1", cursor: "pointer", fontFamily: "var(--font-body)" }}
        >
          Skip
        </button>

        {submitted ? (
          <>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🙏</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#0F2747" }}>Thank you!</p>
            <p style={{ fontSize: 13, color: "#64748B" }}>Your rating helps us improve.</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 6 }}>⭐</div>
            <h3 style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 700, color: "#0F2747", marginBottom: 6 }}>
              How are we doing?
            </h3>
            <p style={{ fontSize: 12, color: "#64748B", marginBottom: 20 }}>
              Rate your experience on Vantiq CUET
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => handleRate(s)}
                  onMouseOver={() => setHovering(s)}
                  onMouseOut={() => setHovering(0)}
                  disabled={submitting}
                  style={{
                    fontSize: 32, background: "none", border: "none",
                    cursor: "pointer", padding: "2px 4px",
                    transform: (hovering >= s || rating >= s) ? "scale(1.2)" : "scale(1)",
                    transition: "transform .1s",
                    filter: (hovering >= s || rating >= s) ? "none" : "grayscale(1) opacity(0.4)",
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#CBD5E1" }}>Tap a star to rate</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── QUESTION SHUFFLER ─────────────────────────────────────────────────────────
// Keeps RC passage groups intact; shuffles group order + non-RC questions randomly.
// CUET CBT serves questions in random order — topic labels must never hint at structure.
function shuffleQuestions(qs) {
  const arr = [...qs];
  // Fisher-Yates
  const fyShuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Bucket RC questions into groups keyed by passage (first 60 chars as key)
  const passageGroups = new Map(); // passageKey → [questions]
  const nonRC = [];

  arr.forEach(q => {
    if (q.passage) {
      const key = q.passage.slice(0, 60);
      if (!passageGroups.has(key)) passageGroups.set(key, []);
      passageGroups.get(key).push(q);
    } else {
      nonRC.push(q);
    }
  });

  // Shuffle within each passage group (question order within a passage can vary)
  const groups = [...passageGroups.values()].map(g => fyShuffle(g));
  // Shuffle the group order
  fyShuffle(groups);
  // Shuffle non-RC questions
  fyShuffle(nonRC);

  // Interleave: alternate a passage group and a slice of non-RC to avoid all RC bunching
  const result = [];
  const nonRCChunks = [];
  if (nonRC.length > 0 && groups.length > 0) {
    const chunkSize = Math.ceil(nonRC.length / (groups.length + 1));
    for (let i = 0; i < nonRC.length; i += chunkSize) nonRCChunks.push(nonRC.slice(i, i + chunkSize));
  } else {
    nonRCChunks.push(...nonRC.map(q => [q]));
  }

  // Place first non-RC chunk, then alternate passage groups and non-RC chunks
  let gi = 0, ci = 0;
  if (nonRCChunks[ci]) { result.push(...nonRCChunks[ci]); ci++; }
  while (gi < groups.length) {
    result.push(...groups[gi++]);
    if (nonRCChunks[ci]) { result.push(...nonRCChunks[ci]); ci++; }
  }
  // Drain any remaining (shouldn't happen but safety net)
  while (ci < nonRCChunks.length) { result.push(...nonRCChunks[ci]); ci++; }

  return result;
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
  const [timePerQ,    setTimePerQ]   = useState({});
  const [isPastReview,  setIsPastReview]  = useState(false);
  const [reviewTestDate, setReviewTestDate] = useState(null);
  const [perfDashFrom,   setPerfDashFrom]   = useState("dashboard");
  const [toast,       setToast]      = useState(null);
  const [authLoading, setAuthLoad]   = useState(true);
  const [showRating,  setShowRating] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false); // lifted from DashboardScreen — needed when generateQuestions returns 402
  const examStartedAt = useRef(null); // tracks when exam loaded — used for grace window

  const showToast = (message, type = "info") => setToast({ message, type, key: Date.now() });

  async function loadUserData(u) {
    if (!db) return; // Firebase not configured — skip
    try {
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) setUserData(snap.data());
      const q = query(collection(db, "tests"), where("uid", "==", u.uid), orderBy("completedAt", "desc"), limit(20));
      const hs = await getDocs(q);
      setHistory(hs.docs.map(d => ({ id: d.id, ...d.data(), questions: undefined, answers: undefined })));
    } catch(e) { /* Firestore unavailable — continue without history */ }
  }

  useEffect(() => {
    // If Firebase not configured — go straight to auth screen (localStorage-only mode)
    if (!auth) { setAuthLoad(false); setScreen("auth"); return; }
    return onAuthStateChanged(auth, async u => {
      if (u) {
        setUser(u);
        await loadUserData(u);
        setScreen("dashboard");
        // Rating check stored — show after first test completion (not on login)
        // setShowRating is called by handleSubmitTest after first result screen visit
        try {
          const rSnap = await getDocs(query(collection(db, "ratings"), where("uid", "==", u.uid), limit(1)));
          if (rSnap.empty) window.__userNeedsRating = true; // flag only — modal triggered after test
        } catch(e) { /* ratings unavailable — skip */ }
        // Presence heartbeat — write lastSeen every 90s so admin can show live users
        const writePresence = async () => {
          try {
            await setDoc(doc(db, "presence", u.uid), {
              uid: u.uid, email: u.email, displayName: u.displayName,
              lastSeen: serverTimestamp(), screen: "dashboard",
            }, { merge: true });
          } catch(e) { /* silent */ }
        };
        writePresence();
        const heartbeat = setInterval(writePresence, 90000);
        // Store on window as fallback (outside React component — useRef not available here)
        // StrictMode risk mitigated by cleanup in signOut branch below
        if (window.__presenceInterval) clearInterval(window.__presenceInterval);
        window.__presenceInterval = heartbeat;
      }
      else {
        setUser(null); setUserData(null); setHistory([]); setScreen("auth"); setShowRating(false);
        if (window.__presenceInterval) { clearInterval(window.__presenceInterval); window.__presenceInterval = null; }
      }
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
  function decrementLocalTestCount() {
    try {
      const current = getLocalTestCount();
      if (current > 0) localStorage.setItem("cuet_tests_used", String(current - 1));
    } catch(_) {}
  }
  function getLocalUnlocked() {
    try { return localStorage.getItem("cuet_unlocked") === "true"; } catch(_) { return false; }
  }

  async function handleReviewPastTest(testId) {
    if (!db || !testId) { showToast("Test data unavailable.", "error"); return; }
    try {
      const snap = await getDoc(doc(db, "tests", testId));
      if (!snap.exists()) { showToast("Test record not found.", "error"); return; }
      const data = snap.data();
      if (!data.questions || !data.answers) {
        showToast("Detailed review is only available for tests taken after this update. Older tests stored summary data only.", "info");
        return;
      }
      setQuestions(data.questions);
      setAnswers(data.answers);
      setTimePerQ(data.timePerQuestion || {});
      setConfig({ mode: data.mode, subject: data.subject || "English" });
      setIsPastReview(true);
      setReviewTestDate(data.completedAt || null);
      setPerfDashFrom("results");
      setScreen("results");
    } catch(e) { showToast("Could not load test. Please try again.", "error"); }
  }

  async function handleBeginTest(config) {
    setConfig(config); setScreen("generating");
    logEvent("test_started", { user_id: user?.uid, mode: config.mode, subject: config.subject });
    try {
      const qs = await generateQuestions(config, user?.uid);
      const required = (config.mode === "Mock" || config.mode === "GAT_Mock" || config.mode === "Economics_Mock") ? 50 : 15;
      if (!qs || qs.length !== required) throw new Error(`Incomplete test paper (${qs?.length ?? 0}/${required} questions). Please try again.`);
      const shuffled = shuffleQuestions(qs);
      setQuestions(shuffled); setAnswers({}); setScreen("exam");
      examStartedAt.current = Date.now();
      // Optimistic local update per separate pool
      if (config.mode === "GAT_Mock") {
        setUserData(p => ({ ...p, gatTestsUsed: (p?.gatTestsUsed || 0) + 1 }));
        try { localStorage.setItem("cuet_gat_tests_used", String((parseInt(localStorage.getItem("cuet_gat_tests_used") || "0")) + 1)); } catch(_) {}
      } else if (config.mode === "Economics_Mock") {
        setUserData(p => ({ ...p, econTestsUsed: (p?.econTestsUsed || 0) + 1 }));
        try { localStorage.setItem("cuet_econ_tests_used", String((parseInt(localStorage.getItem("cuet_econ_tests_used") || "0")) + 1)); } catch(_) {}
      } else if (config.mode === "Mock") {
        incrementLocalTestCount();
        setUserData(p => ({ ...p, testsUsed: (p?.testsUsed || 0) + 1 }));
      }
      // Sync Firestore in background
      if (user) loadUserData(user).catch(() => {});
    } catch(e) {
      if (e.paywall) {
        setScreen("dashboard");
        setShowPaywall(true);
      } else if (e.blocked) {
        // User was blocked mid-session — sign them out and show block screen
        showToast(e.permanent
          ? "Your account has been permanently blocked."
          : `Access suspended for ${e.minutesLeft || "some"} minutes due to unusual activity.`,
          "error");
        setScreen("dashboard");
      } else {
        showToast("Could not generate test. Please try again.", "error");
        setScreen("dashboard");
      }
    }
  }

  async function handleSubmitTest(submittedAnswers, tpq = {}) {
    // ── Grace window: if student exits within 60s with 0 answers, return the test credit ──
    // Prevents accidentally opening an exam from consuming a free test
    const answeredCount = Object.keys(submittedAnswers).length;
    const elapsedSecs   = examStartedAt.current ? Math.floor((Date.now() - examStartedAt.current) / 1000) : 999;
    const isMockMode    = testConfig?.mode === "Mock" || testConfig?.mode === "GAT_Mock" || testConfig?.mode === "Economics_Mock";
    if (isMockMode && answeredCount === 0 && elapsedSecs < 60) {
      // Return credit: CF decrements the correct counter server-side (secure)
      try {
        const token = await getAuthToken();
        if (CF_BASE && token) {
          await fetch(`${CF_BASE}/returnTestCredit`, {
            method: "POST", headers: authHeaders(token),
            body: JSON.stringify({ mode: testConfig?.mode }), // pass mode so CF returns correct counter
          });
        }
        // Reverse the optimistic local update
        if (testConfig?.mode === "GAT_Mock") {
          setUserData(p => ({ ...p, gatTestsUsed: Math.max(0, (p?.gatTestsUsed || 1) - 1) }));
          try { localStorage.setItem("cuet_gat_tests_used", String(Math.max(0, parseInt(localStorage.getItem("cuet_gat_tests_used") || "1") - 1))); } catch(_) {}
        } else if (testConfig?.mode === "Economics_Mock") {
          setUserData(p => ({ ...p, econTestsUsed: Math.max(0, (p?.econTestsUsed || 1) - 1) }));
          try { localStorage.setItem("cuet_econ_tests_used", String(Math.max(0, parseInt(localStorage.getItem("cuet_econ_tests_used") || "1") - 1))); } catch(_) {}
        } else {
          setUserData(p => ({ ...p, testsUsed: Math.max(0, (p?.testsUsed || 1) - 1) }));
          decrementLocalTestCount();
        }
      } catch(_) { /* silent — worst case: counter stays incremented */ }
      showToast("No answers recorded — test returned to your account.", "info");
      examStartedAt.current = null;
      setScreen("dashboard");
      return; // skip results screen entirely
    }
    examStartedAt.current = null;

    setAnswers(submittedAnswers);
    let correct = 0, wrong = 0, total = 0;
    questions.forEach((q, i) => {
      if (submittedAnswers[i] !== undefined) {
        if (submittedAnswers[i] === q.correct) { correct++; total += MARKS_CORRECT; }
        else { wrong++; total += MARKS_WRONG; }
      }
    });
    const accuracy = (correct + wrong) > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;
    // Compute per-topic breakdown
    const _tmap = {};
    questions.forEach((q, i) => {
      if (!_tmap[q.topic]) _tmap[q.topic] = { att: 0, cor: 0, wrong: 0 };
      const ua = submittedAnswers[i];
      if (ua === undefined) return;
      _tmap[q.topic].att++;
      if (ua === q.correct) _tmap[q.topic].cor++;
      else _tmap[q.topic].wrong++;
    });
    const topicResults = Object.entries(_tmap).map(([topic, s]) => ({
      topic, attempted: s.att, correct: s.cor, wrong: s.wrong,
      accuracy: s.att > 0 ? Math.round((s.cor / s.att) * 100) : 0,
    }));
    const skipped = questions.length - (correct + wrong);
    const marksEarned = correct * 5;
    const negativeMarks = wrong * 1;
    const optimisedScore = correct * 5;
    setTimePerQ(tpq);
    setIsPastReview(false);
    setReviewTestDate(null);
    try {
      await addDoc(collection(db, "tests"), {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        mode: testConfig?.mode,
        subject: testConfig?.subject || "English",
        totalScore: total, correct, wrong, attempted: correct + wrong,
        skipped, accuracy, score: accuracy,
        marksEarned, negativeMarks, optimisedScore,
        timePerQuestion: tpq,
        topicResults,
        completedAt: serverTimestamp(),
        questions, answers: submittedAnswers,
      });
      await loadUserData(user);
    } catch(_) { /* non-blocking — results still show */ }
    // Fire test_completed here — score and accuracy now available (not available in ExamScreen)
    logEvent("test_completed", {
      user_id: user?.uid, mode: testConfig?.mode,
      score: total, accuracy, correct, wrong,
      answered: correct + wrong,
    });
    // Show rating after first test — better timing than on login
    if (window.__userNeedsRating) { setShowRating(true); window.__userNeedsRating = false; }
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
      {screen === "dashboard"  && <DashboardScreen user={user} userData={userData} testHistory={testHistory} onBeginTest={handleBeginTest} onReviewTest={handleReviewPastTest} onViewAnalytics={() => { setPerfDashFrom("dashboard"); setScreen("performance"); }} onLogout={() => auth ? signOut(auth) : setScreen("auth")} showToast={showToast} subjects={SUBJECTS} showPaywallOverride={showPaywall} setShowPaywallOverride={setShowPaywall} />}
      {screen === "generating" && <GeneratingScreen config={testConfig} />}
      {screen === "exam"       && <ExamScreen      questions={questions} config={testConfig} user={user} onSubmit={handleSubmitTest} showToast={showToast} />}
      {screen === "results"    && <ResultsScreen   questions={questions} answers={answers} config={testConfig} user={user} testHistory={testHistory} timePerQ={timePerQ} isPastReview={isPastReview} reviewTestDate={reviewTestDate} onNewTest={() => setScreen("dashboard")} onReview={() => setScreen("review")} onViewAnalytics={() => { setPerfDashFrom("results"); setScreen("performance"); }} />}
      {/* Feedback button — always visible when logged in */}
      {user && screen !== "auth" && screen !== "exam" && <FeedbackWidget user={user} />}
      {/* Star rating — shown once per login session */}
      {user && showRating && (screen === "results" || screen === "dashboard") && (
        <StarRatingModal user={user} onDismiss={() => setShowRating(false)} />
      )}
      {screen === "review"      && <ReviewScreen          questions={questions} answers={answers} onBack={() => setScreen("results")} />}
      {screen === "performance" && <PerformanceDashboard  testHistory={testHistory} user={user} onBack={() => setScreen("dashboard")} onBackToResults={perfDashFrom === "results" ? () => setScreen("results") : undefined} />}
    </React.Fragment>
  );
}
