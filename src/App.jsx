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
function DashboardScreen({ user, userData, testHistory, onBeginTest, onReviewTest, onLogout, showToast, subjects, showPaywallOverride, setShowPaywallOverride }) {
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
                    border: `1.5px solid ${isActive ? "var(--navy)" : "var(--border)"}`,
                    background: isActive ? "var(--navy)" : "#fff",
                    color: isActive ? "#fff" : "var(--navy)",
                    fontWeight: 600, fontSize: 12, fontFamily: "var(--font-body)",
                    transition: "all .15s", display: "flex", alignItems: "center", gap: 6,
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
                      <td style={{ padding: "12px 14px" }}><span className="pill pill-navy">{modeLabel}</span></td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{t.totalScore ?? "—"}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)" }}>{t.correct}/{t.attempted}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: scoreColor(p), fontFamily: "var(--font-mono)" }}>{p}%</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span className={"pill " + (p >= 70 ? "pill-green" : p >= 45 ? "pill-amber" : "pill-red")}>
                          {p >= 70 ? "Strong" : p >= 45 ? "Average" : "Needs Work"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          onClick={() => onReviewTest && onReviewTest(t.id)}
                          style={{ fontSize: 12, fontWeight: 600, color: "var(--indigo)", background: "none", border: "1px solid var(--indigo)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>
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
  const timerRef = useRef(null);

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
    // test_completed moved to handleSubmitTest in App() — score/accuracy available there
    onSubmit(answers);
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
              <div key={i} className={"option-box" + (answers[current] === i ? " selected" : "")} onClick={() => setAnswers(p => ({ ...p, [current]: i }))}>
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
                  <button key={i} onClick={() => setCurrent(i)} style={{ width: 30, height: 30, border: `2px solid ${cur ? "var(--indigo)" : bc}`, borderRadius: 4, background: bg, color: cl, fontSize: 11, fontWeight: cur ? 700 : 500, fontFamily: "var(--font-mono)", cursor: "pointer", boxShadow: cur ? "0 0 0 2px var(--indigo)" : "none", transition: "all .12s" }}>
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
                  <button key={i} onClick={() => { setCurrent(i); setShowPalette(false); }} style={{ width: 36, height: 36, border: `2px solid ${cur ? "var(--indigo)" : bc}`, borderRadius: 4, background: bg, color: cl, fontSize: 12, fontWeight: cur ? 700 : 500, fontFamily: "var(--font-mono)", cursor: "pointer" }}>
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
            onClick={() => current > 0 && setCurrent(c => c - 1)}
            style={{ height: 32, padding: "0 12px", border: "1.5px solid var(--border)", borderRadius: 6, background: "#fff", fontSize: isMobile ? 12 : 13, fontWeight: 500, color: "var(--text-secondary)", cursor: current > 0 ? "pointer" : "not-allowed", opacity: current > 0 ? 1 : 0.4, fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}
          >
            ← {!isMobile && "Back"}
          </button>
          {isMobile && current === questions.length - 1 ? (
            <button className="btn-navy-sm" onClick={() => setShowSubmitConfirm(true)} style={{ background: "var(--success)", minWidth: 80 }}>
              Submit ✓
            </button>
          ) : (
            <button className="btn-navy-sm" onClick={() => { if (current < questions.length - 1) setCurrent(c => c + 1); else showToast("Last question. Submit when ready.", "info"); }}>
              {isMobile ? "Next →" : "Save & Next →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RESULTS SCREEN ────────────────────────────────────────────────────────────
function ResultsScreen({ questions, answers, config, user, testHistory, onNewTest, onReview }) {
  const [analysis,         setAnalysis]         = useState(null);   // { summary, actions[] }
  const [aLoading,         setALoading]         = useState(true);
  const [tpQuestions,      setTpQuestions]      = useState(null);   // topic practice questions
  const [tpAnswers,        setTpAnswers]        = useState({});
  const [tpCurrent,        setTpCurrent]        = useState(0);
  const [tpSubmitted,      setTpSubmitted]      = useState(false);
  const [tpLoading,        setTpLoading]        = useState(false);
  const isMobile = useMobile();

  useEffect(() => { logEvent("page_view", { page: "results" }); }, []);

  // ── Score computation ──────────────────────────────────────────────────────
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

  // ── Topic breakdown — weakest first ───────────────────────────────────────
  const topicStats = {};
  questions.forEach((q, i) => {
    if (!topicStats[q.topic]) topicStats[q.topic] = { att: 0, cor: 0 };
    if (answers[i] !== undefined) {
      topicStats[q.topic].att++;
      if (answers[i] === q.correct) topicStats[q.topic].cor++;
    }
  });
  const topicRows = Object.entries(topicStats)
    .filter(([, s]) => s.att > 0)   // ← only show topics the student actually attempted
    .map(([t, s]) => ({ topic: t, attempted: s.att, correct: s.cor, accuracy: s.att > 0 ? Math.round((s.cor / s.att) * 100) : 0 }))
    .sort((a, b) => a.accuracy - b.accuracy);
  const weakest = topicRows[0] || null;

  // ── Historical average from testHistory ────────────────────────────────────
  const isGAT  = config?.subject === "GAT"       || config?.mode?.startsWith("GAT");
  const isEcon = config?.subject === "Economics" || config?.mode?.startsWith("Economics");
  const modeFilter = isGAT ? ["GAT_Mock","GAT_QP"] : isEcon ? ["Economics_Mock","Economics_QP"] : ["Mock","QuickPractice"];
  const pastTests  = (testHistory || []).filter(t => modeFilter.includes(t.mode));
  const histAvg    = pastTests.length > 1
    ? Math.round(pastTests.reduce((s, t) => s + (t.accuracy || 0), 0) / pastTests.length)
    : null;

  // ── Advisory — structured JSON prompt ─────────────────────────────────────
  useEffect(() => {
    async function fetchAnalysis() {
      setALoading(true);
      try {
        if (!CF_BASE) { setAnalysis({ summary: "Review your answers below to identify improvement areas.", actions: ["Focus on your weakest topic first."] }); return; }
        const token = await getAuthToken();
        const subjectName = isGAT ? "GAT (General Aptitude Test)" : isEcon ? "Economics (118)" : "CUET English (101)";
        const subjectContext = isEcon
          ? "Focus on Microeconomics (Course I), Macroeconomics (Course II), and Indian Economic Development (Course III — new in 2026). IED covers Development Policies 1947-90, Economic Reforms 1991 (LPG), Current Challenges, and India-China-Pakistan comparison."
          : isGAT
          ? "Focus on Quantitative Aptitude, Logical Reasoning, and General Knowledge."
          : "Focus on Reading Comprehension, Vocabulary, and Grammar.";
        const weakStr = weakest ? `Weakest topic: ${weakest.topic} at ${weakest.accuracy}% accuracy (${weakest.correct}/${weakest.attempted} correct).` : "";
        const prompt = `You are a CUET ${subjectName} expert analysing a student's test result.

SCORING DATA (NTA system: +5 correct, -1 wrong, 0 skipped):
- NTA points scored: ${totalScore} out of ${maxScore} possible (${pct}%)
- Questions correct: ${correct} out of ${questions.length} attempted (raw accuracy: ${Math.round(correct / questions.length * 100)}%)
- Questions wrong: ${wrong} | Questions skipped: ${unanswered} | Mode: ${config?.mode}
${subjectContext}
${weakStr}

CRITICAL: The ${pct}% score comes from NTA points (${totalScore}/${maxScore}), NOT from questions correct (${correct}/${questions.length}). Do NOT write "${pct}% (${correct}/${questions.length} correct)" — that is factually wrong. State them separately.

Return ONLY a JSON object — no markdown, no preamble:
{
  "summary": "One honest sentence. State the NTA score (${totalScore}/${maxScore} points = ${pct}%) and separately note that ${correct} out of ${questions.length} questions were correct. Do not conflate the two.",
  "actions": [
    "Action 1: start with a verb (Revise/Review/Practice). Specific to weakest topic.",
    "Action 2: start with a verb. About reviewing wrong answers or second-weakest area.",
    "Action 3: start with a verb. Strength to maintain OR biggest gap to close before next test."
  ]
}
Begin with { — nothing before it.`;
        const res = await fetch(`${CF_BASE}/generateAdvisory`, {
          method: "POST", headers: authHeaders(token),
          body: JSON.stringify({ prompt }),
        });
        const d = await res.json();
        // Parse JSON from response — strip any markdown fences first
        let parsed;
        try {
          const raw = (d?.text || "{}").replace(/```json|```/gi,"").trim();
          const first = raw.indexOf("{"), last = raw.lastIndexOf("}");
          parsed = JSON.parse(first !== -1 ? raw.slice(first, last+1) : raw);
        } catch (_) {
          parsed = { summary: d?.text || "Keep practising — consistency leads to improvement.", actions: [] };
        }
        setAnalysis(parsed);
      } catch(_) { setAnalysis({ summary: "Review your answers to identify improvement areas.", actions: ["Focus on your weakest topic first."] }); }
      finally { setALoading(false); }
    }
    fetchAnalysis();
  }, []);

  // ── Topic Practice ─────────────────────────────────────────────────────────
  async function startTopicPractice(topic) {
    setTpLoading(true); setTpQuestions(null); setTpAnswers({}); setTpCurrent(0); setTpSubmitted(false);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${CF_BASE}/generateQuestions`, {
        method: "POST", headers: authHeaders(token),
        body: JSON.stringify({ uid: user?.uid, config: { mode: "TopicPractice", focusTopic: topic, focusSubject: isGAT ? "GAT" : isEcon ? "Economics" : "English" } }),
      });
      const d = await res.json();
      if (d.questions && d.questions.length >= 8) {
        setTpQuestions(d.questions.slice(0, 10));
      } else {
        alert("Could not load topic questions. Please try again.");
      }
    } catch(e) { alert("Topic practice failed. Please try again."); }
    finally { setTpLoading(false); }
  }

  const ACTION_ICONS = ["📌","🔁","✅"];
  const barColor = (acc) => acc < 40 ? "#DC2626" : acc < 65 ? "#D97706" : acc < 80 ? "#4338CA" : "#059669";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#F8FAFC" }}>
      <div className="nta-header">
        <span className="nta-logo">Vantiq <span>CUET</span></span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span className="pill pill-indigo" style={{ fontSize:11 }}>{isGAT ? "GAT" : isEcon ? "Economics" : "English"}</span>
          <span className="pill pill-navy" style={{ fontSize:11 }}>{config?.mode === "GAT_QP" || config?.mode === "QuickPractice" ? "Quick Practice" : "Mock Exam"}</span>
        </div>
      </div>

      <div style={{ flex:1, maxWidth:820, margin:"0 auto", width:"100%", padding: isMobile ? "14px 12px" : "24px 20px", boxSizing:"border-box" }}>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:22, color:"var(--navy)", marginBottom:14 }}>
          Test Performance Report
        </h1>

        {/* ── Score + stats ───────────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:isMobile?12:20, padding: isMobile?"14px 14px":"16px 20px", flexWrap:"wrap" }}>
            <div style={{ flexShrink:0 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--navy)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:3 }}>Total Score</div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:40, fontWeight:700, color:scoreColor(pct), lineHeight:1 }}>{pct}%</div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:15, color:"var(--navy)", marginTop:3 }}>{totalScore} / {maxScore}</div>
            </div>
            <div style={{ flex:1, display:"flex", justifyContent:"space-between", alignItems:"center", gap:6, flexWrap:"wrap", minWidth:0 }}>
              {[{l:"Attempted",v:attempted,bg:"#E8EDF5",cl:"#0F2747"},{l:"Correct",v:correct,bg:"#ECFDF5",cl:"#059669"},{l:"Accuracy",v:`${accuracy}%`,bg:"#EEF2FF",cl:"#4338CA"},{l:"Wrong",v:wrong,bg:"#FEF2F2",cl:"#DC2626"},{l:"Skipped",v:unanswered,bg:"#FFFBEB",cl:"#D97706"}]
                .map(s => (
                <div key={s.l} style={{ textAlign:"center", flex:1, minWidth:isMobile?48:56 }}>
                  <div className="result-stat-pill" style={{ display:"block", padding:"6px 4px", borderRadius:6, fontFamily:"var(--font-mono)", fontSize:isMobile?15:18, fontWeight:700, background:s.bg, color:s.cl }}>{s.v}</div>
                  <div style={{ fontSize:9, color:"var(--text-muted)", marginTop:4, textTransform:"uppercase", letterSpacing:".04em" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* This attempt vs historical average */}
          {histAvg !== null && (
            <div style={{ display:"flex", gap:0, borderTop:"1px solid var(--border)" }}>
              <div style={{ flex:1, padding:"10px 16px", background:"#EEF2FF", borderRight:"1px solid var(--border)" }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"#4338CA", marginBottom:3 }}>This Attempt</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:18, fontWeight:700, color:"#4338CA" }}>{pct}%</div>
                <div style={{ fontSize:10, color:"#4338CA", opacity:0.7, marginTop:1 }}>{correct} correct · {wrong} wrong</div>
              </div>
              <div style={{ flex:1, padding:"10px 16px", background:"#F0FDF4" }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"#059669", marginBottom:3 }}>Your Average ({pastTests.length} attempts)</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:18, fontWeight:700, color:"#059669" }}>{histAvg}%</div>
                <div style={{ fontSize:10, color:"#059669", opacity:0.7, marginTop:1 }}>{pct >= histAvg ? "▲ above your average" : "▼ below your average"}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Priority Focus + Topic Practice CTA ────────────────────────── */}
        {weakest && (
          <div style={{ background:"linear-gradient(135deg,#0F2747 0%,#1a3a6b 100%)", borderRadius:10, padding:"14px 16px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12, flexWrap:"wrap" }}>
              <div>
                <div style={{ display:"inline-block", background:"rgba(252,211,77,0.18)", border:"1px solid rgba(252,211,77,0.35)", borderRadius:20, padding:"2px 9px", fontSize:9, fontWeight:700, letterSpacing:".07em", color:"#FCD34D", textTransform:"uppercase", marginBottom:5 }}>⚠ Priority Focus Area</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#fff", marginBottom:3 }}>{weakest.topic}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.58)" }}>{weakest.correct} of {weakest.attempted} correct · Lowest accuracy this test</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:28, fontWeight:700, color:"#FCD34D", lineHeight:1 }}>{weakest.accuracy}%</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginTop:2 }}>Accuracy</div>
              </div>
            </div>

            {/* Topic Practice CTA */}
            <div
              style={{ background:"rgba(255,255,255,0.06)", border:"1.5px solid rgba(252,211,77,0.4)", borderRadius:8, padding:"11px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, cursor: tpLoading ? "wait" : "pointer" }}
              onClick={() => !tpLoading && !tpSubmitted && startTopicPractice(weakest.topic)}
            >
              <div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"rgba(252,211,77,0.8)", marginBottom:3 }}>⚡ Targeted Practice</div>
                <div style={{ fontSize:12.5, color:"#fff", fontWeight:500 }}>Practice only {weakest.topic} — 10 questions</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:2 }}>No time limit · Free · Never counts toward your test limit</div>
              </div>
              <button
                style={{ background:"#FCD34D", color:"#0F2747", border:"none", borderRadius:6, padding:"7px 14px", fontSize:12, fontWeight:700, fontFamily:"var(--font-body)", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, opacity: tpLoading?0.7:1 }}
                disabled={tpLoading}
              >
                {tpLoading ? "Loading..." : tpQuestions ? "Retry ↺" : "Start Now →"}
              </button>
            </div>
          </div>
        )}

        {/* ── Topic Practice Mini-Exam ────────────────────────────────────── */}
        {tpQuestions && !tpSubmitted && (
          <div className="card" style={{ marginBottom:12, overflow:"hidden" }}>
            <div style={{ background:"linear-gradient(135deg,#0F2747,#1a3a6b)", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"#FCD34D", marginBottom:2 }}>Targeted Practice · {tpQuestions[tpCurrent]?.topic}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>10 Questions · No Time Limit</div>
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"rgba(255,255,255,0.6)" }}>Q {tpCurrent+1} of {tpQuestions.length}</div>
            </div>
            <div style={{ padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:".05em", textTransform:"uppercase", color:"var(--indigo)", marginBottom:6 }}>{tpQuestions[tpCurrent]?.topic}</div>
              <div style={{ fontSize:isMobile?13:14, fontWeight:500, color:"var(--navy)", lineHeight:1.65, marginBottom:16 }}>{tpQuestions[tpCurrent]?.question}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                {tpQuestions[tpCurrent]?.options.map((opt, i) => (
                  <div key={i}
                    className={"option-box" + (tpAnswers[tpCurrent] === i ? " selected" : "")}
                    onClick={() => setTpAnswers(p => ({...p, [tpCurrent]: i}))}
                  >
                    <span className="option-key">{String.fromCharCode(65+i)}</span>
                    <span style={{ fontSize:isMobile?13:14, color:"var(--text-primary)", flex:1, minWidth:0 }}>{opt}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <button
                  onClick={() => tpCurrent > 0 && setTpCurrent(c => c-1)}
                  style={{ height:34, padding:"0 14px", border:"1.5px solid var(--border)", borderRadius:6, background:"#fff", fontSize:12, fontWeight:500, color:"var(--text-secondary)", cursor:tpCurrent>0?"pointer":"not-allowed", opacity:tpCurrent>0?1:0.4, fontFamily:"var(--font-body)" }}
                >← Back</button>
                <div style={{ flex:1, display:"flex", gap:4 }}>
                  {tpQuestions.map((_, i) => (
                    <div key={i} onClick={() => setTpCurrent(i)} style={{ flex:1, height:4, borderRadius:2, background: i===tpCurrent ? "var(--indigo)" : tpAnswers[i]!==undefined ? "#059669" : "var(--border)", cursor:"pointer" }} />
                  ))}
                </div>
                {tpCurrent < tpQuestions.length - 1 ? (
                  <button className="btn-navy-sm" onClick={() => setTpCurrent(c => c+1)}>Next →</button>
                ) : (
                  <button className="btn-primary" style={{ height:34, fontSize:13 }}
                    onClick={() => { setTpSubmitted(true); logEvent("topic_practice_completed", { topic: weakest?.topic, answered: Object.keys(tpAnswers).length }); }}>
                    Submit →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Topic Practice Results ─────────────────────────────────────── */}
        {tpQuestions && tpSubmitted && (() => {
          let tpCorrect = 0;
          tpQuestions.forEach((q, i) => { if (tpAnswers[i] === q.correct) tpCorrect++; });
          const tpPct = Math.round((tpCorrect / tpQuestions.length) * 100);
          return (
            <div className="card" style={{ marginBottom:12, overflow:"hidden" }}>
              <div style={{ background:"linear-gradient(135deg,#0F2747,#1a3a6b)", padding:"10px 16px" }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"#FCD34D", marginBottom:2 }}>Targeted Practice Complete · {tpQuestions[0]?.topic}</div>
              </div>
              <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                <div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:28, fontWeight:700, color:scoreColor(tpPct) }}>{tpCorrect}/{tpQuestions.length}</div>
                  <div style={{ fontSize:12, color:"var(--text-sec)", marginTop:2 }}>
                    {tpPct > weakest?.accuracy ? `↑ Improved from ${weakest?.accuracy}% (main test)` : tpPct === weakest?.accuracy ? `Same as main test (${weakest?.accuracy}%)` : `${tpPct}% this session`}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button className="btn-outline" style={{ height:34, fontSize:12 }} onClick={() => { setTpSubmitted(false); setTpAnswers({}); setTpCurrent(0); }}>Try Again</button>
                  <button className="btn-primary" style={{ height:34, fontSize:12 }} onClick={() => { setTpQuestions(null); setTpSubmitted(false); }}>Close</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Topic accuracy bars ─────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom:12, padding:"14px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:10 }}>Topic Accuracy — Weakest First</div>
          {topicRows.map((r, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4, gap:8 }}>
                <div style={{ fontSize:11, color: i===0 ? "#DC2626" : "var(--navy)", fontWeight: i===0 ? 700 : 500, lineHeight:1.4 }}>{r.topic}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:11, fontWeight:700, color:barColor(r.accuracy), flexShrink:0 }}>{r.accuracy}%</div>
              </div>
              <div style={{ height:5, background:"#E2E8F0", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${r.accuracy}%`, background:barColor(r.accuracy), borderRadius:3, transition:"width .6s ease" }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── What to Do Next — advisory ─────────────────────────────────── */}
        <div className="card" style={{ padding:"14px 16px", marginBottom:20 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:10 }}>What to Do Next</div>
          {aLoading ? (
            <div><div className="pbar-track"><div className="pbar-fill" /></div><p style={{ fontSize:12, color:"var(--text-muted)", marginTop:8 }}>Preparing your performance analysis...</p></div>
          ) : analysis ? (
            <>
              {analysis.summary && (
                <p style={{ fontSize:13, color:"var(--navy)", fontWeight:500, lineHeight:1.6, marginBottom:10, paddingBottom:10, borderBottom:"1px solid var(--border)" }}>{analysis.summary}</p>
              )}
              {(analysis.actions || []).map((a, i) => (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:9 }}>
                  <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{ACTION_ICONS[i] || "•"}</span>
                  <span style={{ fontSize:13, color:"var(--text-secondary)", lineHeight:1.6 }}>{a}</span>
                </div>
              ))}
            </>
          ) : null}
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div style={{ display:"flex", gap:12 }}>
          <button className="btn-outline" style={{ flex:1 }} onClick={onReview}>Review Answers</button>
          <button className="btn-primary" style={{ flex:1 }} onClick={onNewTest}>New Test Paper</button>
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
      const q = query(collection(db, "tests"), where("uid", "==", u.uid), orderBy("completedAt", "desc"), limit(10));
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
      setConfig({ mode: data.mode, subject: data.subject || "English" });
      setScreen("review");
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

  async function handleSubmitTest(submittedAnswers) {
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
    try {
      await addDoc(collection(db, "tests"), {
        uid: user.uid,
        email: user.email || null,          // stored for admin visibility — no join needed
        displayName: user.displayName || null,
        mode: testConfig?.mode,
        subject: testConfig?.subject || "English",
        totalScore: total,
        correct, wrong, attempted: correct + wrong, accuracy, score: accuracy,
        completedAt: serverTimestamp(),
        questions,          // stored for past-exam review
        answers: submittedAnswers, // stored for past-exam review
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
      {screen === "dashboard"  && <DashboardScreen user={user} userData={userData} testHistory={testHistory} onBeginTest={handleBeginTest} onReviewTest={handleReviewPastTest} onLogout={() => auth ? signOut(auth) : setScreen("auth")} showToast={showToast} subjects={SUBJECTS} showPaywallOverride={showPaywall} setShowPaywallOverride={setShowPaywall} />}
      {screen === "generating" && <GeneratingScreen config={testConfig} />}
      {screen === "exam"       && <ExamScreen      questions={questions} config={testConfig} user={user} onSubmit={handleSubmitTest} showToast={showToast} />}
      {screen === "results"    && <ResultsScreen   questions={questions} answers={answers} config={testConfig} user={user} testHistory={testHistory} onNewTest={() => setScreen("dashboard")} onReview={() => setScreen("review")} />}
      {/* Feedback button — always visible when logged in */}
      {user && screen !== "auth" && screen !== "exam" && <FeedbackWidget user={user} />}
      {/* Star rating — shown once per login session */}
      {user && showRating && (screen === "results" || screen === "dashboard") && (
        <StarRatingModal user={user} onDismiss={() => setShowRating(false)} />
      )}
      {screen === "review"     && <ReviewScreen    questions={questions} answers={answers} onBack={() => setScreen("results")} />}
    </React.Fragment>
  );
}
