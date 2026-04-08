/**
 * CUET English Mock Test Platform — App.jsx v2.0
 * React + Firebase + Razorpay + GA4 + Claude AI
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
`;
if (!document.getElementById("cuet-styles")) {
  const s = document.createElement("style"); s.id = "cuet-styles"; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Firebase ──────────────────────────────────────────────────────────────────
const fbApp = initializeApp({
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(fbApp);
const db   = getFirestore(fbApp);

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
      const orderRes = await fetch(`${CF_BASE}/createOrder`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user?.uid }),
      });
      const { order_id } = await orderRes.json();
      const rzp = new window.Razorpay({
        key: RZP_KEY_ID, order_id,
        amount: 19900, currency: "INR",
        name: "Vantiq CUET", description: "Unlock Full Access",
        theme: { color: "#0F2747" },
        prefill: { name: user?.displayName || "", email: user?.email || "" },
        handler: async (resp) => {
          try {
            const vRes = await fetch(`${CF_BASE}/verifyPayment`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...resp, uid: user?.uid }),
            });
            const vData = await vRes.json();
            if (vData.success) {
              logEvent("payment_success", { user_id: user?.uid, value: 199, currency: "INR" });
              onSuccess();
            } else throw new Error("Verification failed");
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
    } catch(e) { setError("Could not create order. Try again."); setLoading(false); }
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
            You have used all 5 free tests. Unlock unlimited access for CUET English 2026.
          </p>
        </div>
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)" }}>Full Platform Access</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)", fontFamily: "var(--font-mono)" }}>&#8377;199</span>
          </div>
          {["Unlimited AI-generated papers", "Practice, Mock and Speed Drill modes", "Topic-wise performance analytics", "One-time payment, lifetime access"].map(f => (
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

// ── AUTH SCREEN — Premium Landing Page ───────────────────────────────────────
function AuthScreen({ onLogin, showToast }) {
  const [loading, setLoading] = useState(null);
  const [error,   setError]   = useState(null);
  const [mode,    setMode]    = useState("login");

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
    } catch(e) { setError("Sign-in failed. Please try again."); }
    finally { setLoading(null); }
  }

  const subjects = [
    { code: "101", name: "English", status: "live",   color: "#10B981" },
    { code: "301", name: "Physics", status: "soon",   color: "#6366F1" },
    { code: "302", name: "Chemistry", status: "soon", color: "#F59E0B" },
    { code: "303", name: "Mathematics", status: "soon", color: "#EF4444" },
    { code: "304", name: "Biology", status: "soon",   color: "#14B8A6" },
    { code: "108", name: "History", status: "soon",   color: "#8B5CF6" },
  ];

  const stats = [
    { val: "50",    label: "Questions per test" },
    { val: "NTA",   label: "Exact pattern" },
    { val: "+5/−1", label: "Marking scheme" },
    { val: "AI",    label: "Generated papers" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0A1628", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

      {/* Background mesh gradient */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "40%", left: "30%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)" }} />
        {/* Subtle grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* Top nav */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6366F1, #10B981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14, fontFamily: "var(--font-mono)" }}>V</span>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#fff", letterSpacing: "0.01em" }}>
            Vantiq
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}>CUET 2026</span>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px #10B981" }} />
          <span style={{ fontSize: 12, color: "#10B981", fontWeight: 600 }}>English Live</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px" }}>
        <div style={{ width: "100%", maxWidth: 1040, display: "flex", gap: 64, alignItems: "center", flexWrap: "wrap" }}>

          {/* Left — Hero copy */}
          <div style={{ flex: "1 1 420px" }}>
            {/* Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 100, padding: "6px 14px", marginBottom: 28 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366F1", display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "#A5B4FC", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                NTA-Standard CUET Preparation
              </span>
            </div>

            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 5vw, 56px)", color: "#fff", lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.01em" }}>
              Crack CUET 2026<br />
              <span style={{ background: "linear-gradient(135deg, #6366F1, #10B981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                on your terms.
              </span>
            </h1>

            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 32, maxWidth: 440 }}>
              AI-generated mock tests that match the exact NTA format. Know your weak topics before the exam does.
            </p>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 28, marginBottom: 40, flexWrap: "wrap" }}>
              {stats.map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Subject chips */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, fontWeight: 600 }}>Subjects</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {subjects.map(s => (
                  <div key={s.code} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 100,
                    background: s.status === "live" ? `${s.color}18` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${s.status === "live" ? `${s.color}50` : "rgba(255,255,255,0.08)"}`,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.status === "live" ? s.color : "rgba(255,255,255,0.2)", boxShadow: s.status === "live" ? `0 0 6px ${s.color}` : "none", display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: s.status === "live" ? "#fff" : "rgba(255,255,255,0.35)" }}>{s.name}</span>
                    {s.status === "soon" && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 500 }}>soon</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Auth card */}
          <div style={{ flex: "0 0 340px" }}>
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: "36px 32px",
              backdropFilter: "blur(20px)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#fff", marginBottom: 6 }}>
                  {mode === "login" ? "Welcome back" : "Start for free"}
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                  {mode === "login"
                    ? "Sign in to resume your preparation"
                    : "5 free mock tests — no card required"}
                </p>
              </div>

              {/* Free tier callout */}
              {mode === "register" && (
                <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 16 }}>🎁</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#10B981", marginBottom: 2 }}>5 Tests Free</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>No credit card. Full NTA experience from your first test.</div>
                  </div>
                </div>
              )}

              {/* Google button */}
              <button
                onClick={handleGoogle}
                disabled={loading === "google"}
                style={{
                  width: "100%", height: 48, border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12, background: loading === "google" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "var(--font-body)",
                  cursor: loading === "google" ? "not-allowed" : "pointer",
                  transition: "all .2s", marginBottom: 12,
                }}
                onMouseOver={e => { if (loading !== "google") { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; } }}
                onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
              >
                {loading === "google"
                  ? <span style={{ fontSize: 13, opacity: 0.6 }}>Signing in...</span>
                  : <React.Fragment><GoogleIcon /> Continue with Google</React.Fragment>
                }
              </button>

              {/* Facebook button */}
              <button
                onClick={() => showToast("Facebook login coming soon", "info")}
                title="Coming soon"
                style={{
                  width: "100%", height: 48, border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, background: "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)",
                  cursor: "pointer", marginBottom: 24,
                }}
              >
                <FacebookIcon /> Continue with Facebook
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>secure login</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
              </div>

              {error && (
                <div style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#FCA5A5", marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {/* Mode toggle */}
              <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                {mode === "login"
                  ? <React.Fragment>New here?{" "}
                      <span style={{ color: "#6366F1", cursor: "pointer", fontWeight: 600 }} onClick={() => setMode("register")}>
                        Start for free
                      </span>
                    </React.Fragment>
                  : <React.Fragment>Already registered?{" "}
                      <span style={{ color: "#6366F1", cursor: "pointer", fontWeight: 600 }} onClick={() => setMode("login")}>
                        Sign in
                      </span>
                    </React.Fragment>
                }
              </p>

              {/* Trust signals */}
              <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {["NTA Verified Pattern", "Instant Results", "Free to start"].map(t => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: "#10B981", fontSize: 11 }}>&#10003;</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing hint below card */}
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                5 tests free &middot; Full access at &#8377;199 one-time
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ position: "relative", zIndex: 1, padding: "16px 32px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          &copy; 2026 Vantiq Education &middot; Not affiliated with NTA
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          By signing in, you agree to our Terms &amp; Privacy Policy
        </span>
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
function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

// ── DASHBOARD SCREEN ──────────────────────────────────────────────────────────
function DashboardScreen({ user, userData, testHistory, onBeginTest, onLogout, showToast }) {
  const [mode,        setMode]        = useState("Mock");
  const [showPaywall, setShowPaywall] = useState(false);
  const [checking,    setChecking]    = useState(false);

  const testsUsed = userData?.testsUsed || 0;
  const unlocked  = userData?.unlocked  || false;
  const testsLeft = Math.max(0, FREE_LIMIT - testsUsed);
  const scores    = testHistory.map(t => t.accuracy || 0);
  const avgScore  = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const bestScore = scores.length ? Math.max(...scores) : null;

  useEffect(() => { logEvent("page_view", { page: "dashboard", user_id: user?.uid }); }, []);

  const MODES = {
    Practice:   { label: "Practice",    desc: "Topic-wise, concept building" },
    Mock:       { label: "Mock Exam",   desc: "Full NTA simulation, 60 min" },
    SpeedDrill: { label: "Speed Drill", desc: "30 min, high-pressure drill" },
  };

  async function handleBegin() {
    setChecking(true);
    try {
      if (CF_BASE) {
        const r = await fetch(`${CF_BASE}/checkTestLimit`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user?.uid }),
        });
        const d = await r.json();
        if (!d.allowed) {
          logEvent("paywall_triggered", { user_id: user?.uid, tests_used: testsUsed });
          setShowPaywall(true); return;
        }
      } else if (!unlocked && testsUsed >= FREE_LIMIT) {
        logEvent("paywall_triggered", { user_id: user?.uid, tests_used: testsUsed });
        setShowPaywall(true); return;
      }
      onBeginTest({ mode });
    } catch(_) {
      if (!unlocked && testsUsed >= FREE_LIMIT) { setShowPaywall(true); return; }
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

      <div style={{ flex: 1, maxWidth: 900, margin: "0 auto", width: "100%", padding: "28px 24px" }}>
        <h2 style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
          Your Practice Summary
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 36 }}>
          {[
            { label: "Tests Taken",  val: testsUsed,  sub: unlocked ? "Unlimited" : `${testsLeft} free left` },
            { label: "Avg. Score",   val: avgScore != null ? `${avgScore}%` : "—", sub: "across all tests" },
            { label: "Best Score",   val: bestScore != null ? `${bestScore}%` : "—", sub: "personal best" },
            { label: "Access",       val: unlocked ? "Pro" : "Free", sub: unlocked ? "Full access" : `${testsLeft} of 5 remaining` },
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
            50 questions &middot; 60 min &middot; +5 correct / &minus;1 wrong
          </p>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>Mode</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {Object.entries(MODES).map(([k, cfg]) => (
                <div key={k} onClick={() => setMode(k)} style={{ border: `2px solid ${mode === k ? "var(--navy)" : "var(--border)"}`, borderRadius: 10, padding: "12px 18px", cursor: "pointer", minWidth: 140, background: mode === k ? "#EEF2FF" : "#fff", boxShadow: mode === k ? "0 2px 8px rgba(67,56,202,.12)" : "none", transition: "all .15s" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--navy)", marginBottom: 4 }}>{cfg.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{cfg.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-primary full" onClick={handleBegin} disabled={checking}>
            {checking ? "Checking..." : "Begin Test →"}
          </button>
          {!unlocked && (
            <p style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
              {testsLeft > 0 ? `${testsLeft} free test${testsLeft !== 1 ? "s" : ""} remaining` : "Free limit reached — unlock above"}
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
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--navy)", marginBottom: 8 }}>Building Your Paper</h2>
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
  const [timeLeft,  setTimeLeft]  = useState(config?.mode === "SpeedDrill" ? 1800 : EXAM_SECS);
  const [exitModal, setExitModal] = useState(false);
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

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
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
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.65, marginBottom: 24 }}>{q.question}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, i) => (
              <div key={i} className={"option-box" + (answers[current] === i ? " selected" : "")} onClick={() => setAnswers(p => ({ ...p, [current]: i }))}>
                <span className="option-key">{String.fromCharCode(65 + i)}</span>
                <span style={{ fontSize: 14, color: "var(--text-primary)", flex: 1 }}>{opt}</span>
              </div>
            ))}
          </div>
        </div>

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
      </div>

      <div style={{ borderTop: "1px solid var(--border)", background: "#fff", padding: "12px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn-amber" onClick={() => setMarked(p => { const n = new Set(p); n.has(current) ? n.delete(current) : n.add(current); return n; })}>
          {marked.has(current) ? "✓ Marked" : "Mark for Review"}
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button
            onClick={() => current > 0 && setCurrent(c => c - 1)}
            style={{ height: 36, padding: "0 16px", border: "1.5px solid var(--border)", borderRadius: 6, background: "#fff", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", cursor: current > 0 ? "pointer" : "not-allowed", opacity: current > 0 ? 1 : 0.4, fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 6 }}
          >
            ← Back
          </button>
          <button className="btn-navy-sm" onClick={() => { if (current < questions.length - 1) setCurrent(c => c + 1); else showToast("Last question. Submit when ready.", "info"); }}>
            Save &amp; Next →
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
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514", max_tokens: 1000,
            messages: [{ role: "user", content: `You are a CUET English expert. Give a concise 3-4 sentence performance analysis for a student who scored ${pct}% (${correct}/${questions.length} correct, ${wrong} wrong, ${unanswered} unanswered) in ${config?.mode} mode. Weakest topic: ${topicRows[0]?.topic} at ${topicRows[0]?.accuracy}% accuracy. Give specific actionable advice. Be encouraging but honest.` }],
          }),
        });
        const d = await res.json();
        setAnalysis(d?.content?.[0]?.text || null);
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
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)", marginBottom: 12 }}>Performance Analysis</h3>
          {aLoading ? (
            <div>
              <div className="pbar-track"><div className="pbar-fill" /></div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Generating personalised analysis...</p>
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
  const mode    = config?.mode || "Mock";
  const diffMap = {
    Practice:   "medium — concept building, accessible vocabulary",
    Mock:       "challenging — full NTA exam standard",
    SpeedDrill: "moderate to hard — speed-optimised, clear answers",
  };
  const prompt = `You are a CUET English (Code 101) question paper generator for NTA UG 2026.
Generate exactly 50 MCQ questions with this topic distribution:
- Reading Comprehension: 22 questions (use 3 separate passages, each 250-300 words; one factual, one narrative, one literary)
- Synonyms and Antonyms: 9 questions
- Sentence Rearrangement: 7 questions
- Choosing Correct Word: 7 questions
- Match the Following: 3 questions
- Grammar and Vocabulary: 2 questions
Mode: ${mode} | Difficulty: ${diffMap[mode]}
Rules: every question has exactly 4 options; correct field is 0-indexed int (0=A,1=B,2=C,3=D); passage field is the full passage text for RC questions, null for all others; every question needs a clear explanation.
Return ONLY a valid JSON array with no markdown fences and no preamble:
[{"question":"...","options":["...","...","...","..."],"correct":0,"topic":"Reading Comprehension","passage":"...or null...","explanation":"..."}]`;

  // Production: use Cloud Function proxy (secret stays server-side)
  if (CF_BASE) {
    const res = await fetch(`${CF_BASE}/generateQuestions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, config }),
    });
    const d = await res.json();
    if (d.paywall) throw Object.assign(new Error("Paywall"), { paywall: true });
    if (!d.questions) throw new Error(d.error || "Generation failed");
    return d.questions;
  }

  // Local dev fallback only — set VITE_CLOUD_FUNCTION_BASE before production deploy
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  const d = await res.json();
  const text = d?.content?.[0]?.text || "[]";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
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
    try {
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) setUserData(snap.data());
      const q = query(collection(db, "tests"), where("uid", "==", u.uid), orderBy("completedAt", "desc"), limit(10));
      const hs = await getDocs(q);
      setHistory(hs.docs.map(d => d.data()));
    } catch(e) { showToast("Could not load your data. Please refresh.", "error"); }
  }

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (u) { setUser(u); await loadUserData(u); setScreen("dashboard"); }
      else { setUser(null); setUserData(null); setHistory([]); setScreen("auth"); }
      setAuthLoad(false);
    });
  }, []);

  async function handleBeginTest(config) {
    setConfig(config); setScreen("generating");
    logEvent("test_started", { user_id: user?.uid, mode: config.mode });
    try {
      const qs = await generateQuestions(config, user?.uid);
      if (!qs || qs.length < 10) throw new Error("Invalid question set");
      setQuestions(qs); setAnswers({}); setScreen("exam");
      // Optimistic UI update (server is authoritative on limit)
      await updateDoc(doc(db, "users", user.uid), { testsUsed: (userData?.testsUsed || 0) + 1 });
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
      {screen === "dashboard"  && <DashboardScreen user={user} userData={userData} testHistory={testHistory} onBeginTest={handleBeginTest} onLogout={() => signOut(auth)} showToast={showToast} />}
      {screen === "generating" && <GeneratingScreen config={testConfig} />}
      {screen === "exam"       && <ExamScreen      questions={questions} config={testConfig} user={user} onSubmit={handleSubmitTest} showToast={showToast} />}
      {screen === "results"    && <ResultsScreen   questions={questions} answers={answers} config={testConfig} user={user} onNewTest={() => setScreen("dashboard")} onReview={() => setScreen("review")} />}
      {screen === "review"     && <ReviewScreen    questions={questions} answers={answers} onBack={() => setScreen("results")} />}
    </React.Fragment>
  );
}
