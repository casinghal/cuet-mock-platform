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
            You have used all 4 free Mock Exams. Unlock unlimited access for CUET {subject === "GAT" ? "GAT + English" : "English"} 2026.
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
  { name: "General Aptitude Test (GAT)", live: false }, // flip to true after quality review
  { name: "Economics",                   live: false },
];

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
        photoURL: user.photoURL, testsUsed: 0, createdAt: serverTimestamp(),
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

  const features = [
    { icon: "✨", title: "Lifetime Free Mock Papers", desc: "15-question practice papers — free forever, no card needed, no limits. Test yourself daily." },
    { icon: "⚡", title: "Instant Weak Area Report",  desc: "Know your weak topics the moment you submit — sorted weakest first. You decide how to fix them." },
    { icon: "✅", title: "Exact NTA Pattern",        desc: "+5 correct, −1 wrong. Same interface, same marking, same pressure as the real exam." },
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
            Practice CUET 2026 Mock Tests
            <span style={S.h1accent}>— Free to Start</span>
          </h1>

          <p style={S.subtext}>
            NTA-standard mock test papers for CUET English (101) — not coaching, not notes.
            Just real exam simulation so you know exactly where you stand.
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
          <h2 style={S.authHeading}>Try a Free Mock Test Now</h2>
          <p style={S.authSub}>
            No coaching. No content. Just the real exam — simulated.
          </p>

          {/* Free trial badge */}
          <div style={S.trialBadge}>
            <span style={S.trialIcon}>&#127381;</span>
            <div style={S.trialText}>
              <span style={S.trialStrong}>4 full Mock Exams free.</span>{" "}
              Quick Practice free forever. Unlimited Mock Exams at ₹199 till 30 June.
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
            Know your score. Know your gaps. Walk into exam day prepared.
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
            By continuing you agree to our{" "}
            <a href="/terms"   style={{ color: "rgba(255,255,255,0.6)", textDecoration: "underline" }}>Terms</a>{" & "}
            <a href="/privacy" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "underline" }}>Privacy Policy</a>.
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
function DashboardScreen({ user, userData, testHistory, onBeginTest, onLogout, showToast, subjects, showPaywallOverride, setShowPaywallOverride }) {
  const [mode,          setMode]          = useState("Mock");
  const [activeSubject, setActiveSubject] = useState("English"); // "English" | "GAT"
  // showPaywall can be triggered from inside (handleBegin gate) or outside (handleBeginTest 402 catch)
  const [showPaywallLocal, setShowPaywallLocal] = useState(false);
  const showPaywall    = showPaywallLocal || (showPaywallOverride ?? false);
  const setShowPaywall = (v) => { setShowPaywallLocal(v); if (setShowPaywallOverride) setShowPaywallOverride(v); };
  const [checking,    setChecking]    = useState(false);
  const isMobile = useMobile();

  const testsUsed    = userData?.testsUsed    || 0;
  const gatTestsUsed = userData?.gatTestsUsed || 0;
  const unlocked     = userData?.unlocked     || false;
  // Show tests left for the active subject
  const testsLeft = activeSubject === "GAT"
    ? Math.max(0, FREE_LIMIT - gatTestsUsed)
    : Math.max(0, FREE_LIMIT - testsUsed);
  const scores    = testHistory.map(t => t.accuracy || 0);
  const avgScore  = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const bestScore = scores.length ? Math.max(...scores) : null;

  // Which subjects are currently live — drives subject tab visibility
  const liveSubjects = (subjects || []).filter(s => s.live);
  const showSubjectTabs = liveSubjects.length > 1;

  useEffect(() => { logEvent("page_view", { page: "dashboard", user_id: user?.uid }); }, []);

  const ALL_MODES = {
    QuickPractice: { label: "Quick Practice",     desc: "15 questions · All topics · Lifetime Free",   free: true,  subject: "English" },
    Mock:          { label: "Mock Exam",           desc: "50 questions · 60 min · NTA standard marking", free: false, subject: "English" },
    GAT_QP:        { label: "GAT Quick Practice",  desc: "15 questions · All aptitude topics · Always Free", free: true,  subject: "GAT" },
    GAT_Mock:      { label: "GAT Mock Exam",       desc: "50 questions · 60 min · General Aptitude",    free: false, subject: "GAT" },
  };

  // Filter mode tiles by active subject
  const MODES = Object.fromEntries(
    Object.entries(ALL_MODES).filter(([, cfg]) => cfg.subject === activeSubject)
  );

  // When subject changes, reset to the appropriate default mode
  function handleSubjectChange(subj) {
    setActiveSubject(subj);
    setMode(subj === "GAT" ? "GAT_Mock" : "Mock");
  }

  const isCurrentModeFree = ALL_MODES[mode]?.free ?? false;

  async function handleBegin() {
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
          logEvent("paywall_triggered", { user_id: user?.uid, tests_used: mode === "GAT_Mock" ? gatTestsUsed : testsUsed });
          setShowPaywall(true); return;
        }
      } else {
        // localStorage fallback — check appropriate counter
        const effectiveCount   = mode === "GAT_Mock"
          ? (gatTestsUsed || parseInt(localStorage.getItem("cuet_gat_tests_used") || "0"))
          : (testsUsed || parseInt(localStorage.getItem("cuet_tests_used") || "0"));
        const effectiveUnlocked = unlocked || localStorage.getItem("cuet_unlocked") === "true";
        if (!effectiveUnlocked && effectiveCount >= FREE_LIMIT) {
          logEvent("paywall_triggered", { user_id: user?.uid, tests_used: effectiveCount });
          setShowPaywall(true); return;
        }
      }
      onBeginTest({ mode, subject: activeSubject });
    } catch(_) {
      const effectiveCount = mode === "GAT_Mock"
        ? (gatTestsUsed || parseInt(localStorage.getItem("cuet_gat_tests_used") || "0"))
        : (testsUsed || parseInt(localStorage.getItem("cuet_tests_used") || "0"));
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
  const subjectBadge = activeSubject === "GAT" ? "GAT (501)" : "English (101)";
  const sectionLabel = activeSubject === "GAT"
    ? "Your Practice Summary — CUET GAT (501) 2026"
    : "Your Practice Summary — CUET English (101) 2026";
  const newTestLabel = activeSubject === "GAT"
    ? "CUET GAT · Section III (501)"
    : "CUET English · Section IA (101)";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {showPaywall && <PaywallModal user={user} onSuccess={handlePaySuccess} onClose={() => setShowPaywall(false)} subject={activeSubject} />}

      <div className="nta-header">
        <span className="nta-logo">Vantiq <span>CUET</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, padding: "3px 8px", color: "#fff", letterSpacing: ".03em" }}>
            {subjectBadge}
          </span>
          <span style={{ fontSize: 13, opacity: 0.8 }}>{user?.displayName?.split(" ")[0]}</span>
          <button onClick={onLogout} style={{ background: "transparent", color: "#fff", fontSize: 12, opacity: 0.7, padding: "4px 8px", border: "1px solid rgba(255,255,255,.2)", borderRadius: 4, fontFamily: "var(--font-body)", cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 900, margin: "0 auto", width: "100%", padding: isMobile ? "20px 16px" : "28px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
            {sectionLabel}
          </h2>
          <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>● Quick Practice: Lifetime Free</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 36 }}>
          {[
            { label: "Tests Taken",  val: activeSubject === "GAT" ? gatTestsUsed : testsUsed, sub: unlocked ? "Unlimited" : `${testsLeft} free left` },
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
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--navy)", margin: 0 }}>New Test Paper</h3>
            <span style={{ fontSize: 11, background: "#EEF2FF", color: "var(--indigo)", fontWeight: 600, padding: "3px 10px", borderRadius: 20, border: "1px solid #C7D2FE" }}>
              {newTestLabel}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: showSubjectTabs ? 16 : 24 }}>
            {showSubjectTabs ? "Choose a subject and format, then begin." : "Choose a format and begin."}
          </p>

          {/* Subject tab bar — only visible when 2+ subjects are live */}
          {showSubjectTabs && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {liveSubjects.map(s => {
                const key = s.name.includes("GAT") ? "GAT" : "English";
                const label = s.name.includes("GAT") ? "GAT (501)" : "English (101)";
                return (
                  <button key={key} onClick={() => handleSubjectChange(key)} style={{
                    padding: "8px 18px", borderRadius: 8, cursor: "pointer",
                    border: `2px solid ${activeSubject === key ? "var(--navy)" : "var(--border)"}`,
                    background: activeSubject === key ? "var(--navy)" : "#fff",
                    color: activeSubject === key ? "#fff" : "var(--navy)",
                    fontWeight: 600, fontSize: 13, fontFamily: "var(--font-body)",
                    transition: "all .15s",
                  }}>
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {Object.entries(MODES).map(([k, cfg]) => (
                <div key={k} onClick={() => setMode(k)} style={{
                  border: `2px solid ${mode === k ? "var(--navy)" : "var(--border)"}`,
                  borderRadius: 10, padding: "12px 18px", cursor: "pointer",
                  flex: "1 1 140px",
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

          <button className="btn-primary full" onClick={handleBegin} disabled={checking && !isCurrentModeFree}>
            {checking ? "Checking..." : "Begin Test →"}
          </button>
          {isCurrentModeFree ? (
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
                  const modeLabel = { Mock: "Eng Mock", QuickPractice: "Eng QP", GAT_Mock: "GAT Mock", GAT_QP: "GAT QP" }[t.mode] || t.mode || "Mock";
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
              {config?.subject === "GAT" ? "GAT 501" : "English 101"}
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
  const isTimed    = config?.mode !== "QuickPractice"; // QuickPractice has no time limit
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState({});
  const [marked,    setMarked]    = useState(new Set());
  const [timeLeft,  setTimeLeft]  = useState(isTimed ? EXAM_SECS : null);
  const [exitModal, setExitModal] = useState(false);
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
          {isTimed && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, color: warn ? "#FCD34D" : "#fff", background: warn ? "rgba(220,38,38,.15)" : "transparent", padding: warn ? "4px 10px" : "0", borderRadius: 6, transition: "all .3s" }}>
              &#9201; {fmtTimer(timeLeft)}
            </div>
          )}
          <div style={{ fontSize: 12, opacity: 0.8, textAlign: "right" }}>
            <div style={{ fontWeight: 600 }}>{user?.displayName}</div>
            <button onClick={() => setExitModal(true)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.5)", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-body)", padding: 0 }}>
              Exit Test
            </button>
          </div>
        </div>
      </div>

      <div className="section-bar">
        <span>{config?.subject === "GAT" ? "Section III — General Aptitude Test (GAT)" : "Section I — Languages (English)"}</span>
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
        const isGAT = testConfig?.subject === "GAT" || testConfig?.mode?.startsWith("GAT");
        const subjectName = isGAT ? "GAT (General Aptitude Test)" : "CUET English (101)";
        const weakTopicStr = topicRows[0] ? `Weakest topic: ${topicRows[0].topic} at ${topicRows[0].accuracy}% accuracy.` : "";
        const prompt = `You are a CUET ${subjectName} expert. Give a concise 3-4 sentence performance analysis for a student who scored ${pct}% (${correct}/${questions.length} correct, ${wrong} wrong, ${unanswered} unanswered) in ${config?.mode} mode. ${weakTopicStr} Give specific actionable advice. Be encouraging but honest. Do not mention AI or any generation tool.`;
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
      setHistory(hs.docs.map(d => d.data()));
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

  async function handleBeginTest(config) {
    setConfig(config); setScreen("generating");
    logEvent("test_started", { user_id: user?.uid, mode: config.mode, subject: config.subject });
    try {
      const qs = await generateQuestions(config, user?.uid);
      const required = (config.mode === "Mock" || config.mode === "GAT_Mock") ? 50 : 15;
      if (!qs || qs.length !== required) throw new Error(`Incomplete test paper (${qs?.length ?? 0}/${required} questions). Please try again.`);
      setQuestions(qs); setAnswers({}); setScreen("exam");
      examStartedAt.current = Date.now();
      // Optimistic local update per separate pool
      if (config.mode === "GAT_Mock") {
        setUserData(p => ({ ...p, gatTestsUsed: (p?.gatTestsUsed || 0) + 1 }));
        try { localStorage.setItem("cuet_gat_tests_used", String((parseInt(localStorage.getItem("cuet_gat_tests_used") || "0")) + 1)); } catch(_) {}
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
    const isMockMode    = testConfig?.mode === "Mock" || testConfig?.mode === "GAT_Mock";
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
        mode: testConfig?.mode, totalScore: total,
        correct, wrong, attempted: correct + wrong, accuracy, score: accuracy,
        completedAt: serverTimestamp(),
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
      {screen === "dashboard"  && <DashboardScreen user={user} userData={userData} testHistory={testHistory} onBeginTest={handleBeginTest} onLogout={() => auth ? signOut(auth) : setScreen("auth")} showToast={showToast} subjects={SUBJECTS} showPaywallOverride={showPaywall} setShowPaywallOverride={setShowPaywall} />}
      {screen === "generating" && <GeneratingScreen config={testConfig} />}
      {screen === "exam"       && <ExamScreen      questions={questions} config={testConfig} user={user} onSubmit={handleSubmitTest} showToast={showToast} />}
      {screen === "results"    && <ResultsScreen   questions={questions} answers={answers} config={testConfig} user={user} onNewTest={() => setScreen("dashboard")} onReview={() => setScreen("review")} />}
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
