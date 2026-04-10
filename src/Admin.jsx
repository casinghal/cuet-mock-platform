/**
 * Vantiq CUET — Admin Dashboard
 * Route: /admin
 * Password-protected. Reads Firestore directly.
 * Controls: cache fill, view logs, student stats, revenue.
 */

import React, { useState, useEffect, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";

// ── Firebase (reuse existing app if already initialized) ──────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};
const fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db    = getFirestore(fbApp);
const auth  = getAuth(fbApp);

const CF_BASE     = import.meta.env.VITE_CLOUD_FUNCTION_BASE || "";
const DEFAULT_PASS = import.meta.env.VITE_ADMIN_PASSWORD || "vantiq-admin-2026";
// localStorage override — set from inside the dashboard, takes precedence over env var
const ADMIN_PASS  = localStorage.getItem("vantiq_admin_pw") || DEFAULT_PASS;
const ADMIN_KEY   = "vantiq-admin-2026";
const CACHE_SIZE  = 60;

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "#F8FAFC",
    fontFamily: "'Sora', sans-serif",
  },
  header: {
    background: "#0F2747",
    padding: "0 32px",
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: ".02em",
  },
  headerBadge: {
    background: "rgba(255,255,255,.12)",
    color: "rgba(255,255,255,.7)",
    fontSize: 11,
    padding: "3px 10px",
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,.2)",
  },
  body: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "28px 24px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 28,
  },
  card: {
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    padding: "20px 24px",
  },
  statVal: {
    fontSize: 32,
    fontWeight: 700,
    color: "#0F2747",
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: 1,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: ".06em",
  },
  statSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: "#94A3B8",
    marginBottom: 14,
    marginTop: 28,
  },
  btn: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    fontFamily: "'Sora', sans-serif",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    transition: "all .15s",
  },
  btnPrimary: {
    background: "#0F2747",
    color: "#fff",
  },
  btnSuccess: {
    background: "#059669",
    color: "#fff",
  },
  btnDanger: {
    background: "#DC2626",
    color: "#fff",
  },
  btnMuted: {
    background: "#E2E8F0",
    color: "#475569",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    background: "#E2E8F0",
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: (pct, color) => ({
    height: "100%",
    width: `${Math.min(100, pct)}%`,
    background: color,
    borderRadius: 3,
    transition: "width .4s",
  }),
  logBox: {
    background: "#0F172A",
    borderRadius: 10,
    padding: "16px 20px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    color: "#94A3B8",
    maxHeight: 200,
    overflowY: "auto",
    lineHeight: 1.7,
  },
  pill: (color) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: color === "green" ? "#DCFCE7" : color === "red" ? "#FEE2E2" : color === "amber" ? "#FEF3C7" : "#EEF2FF",
    color: color === "green" ? "#059669" : color === "red" ? "#DC2626" : color === "amber" ? "#D97706" : "#4338CA",
  }),
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    padding: "10px 14px",
    textAlign: "left",
    fontWeight: 600,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: ".05em",
    color: "#94A3B8",
    background: "#F8FAFC",
    borderBottom: "1px solid #E2E8F0",
  },
  td: {
    padding: "12px 14px",
    borderBottom: "1px solid #F1F5F9",
    color: "#334155",
  },
};

// ── Password Gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [pass, setPass] = useState("");
  const [err, setErr]   = useState("");

  function check() {
    const currentPass = localStorage.getItem("vantiq_admin_pw") || DEFAULT_PASS;
    if (pass === currentPass) { onUnlock(); }
    else { setErr("Incorrect password."); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F2747", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: 360, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🔐</div>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, color: "#0F2747", marginBottom: 6 }}>Admin Access</h2>
        <p style={{ fontSize: 13, color: "#64748B", marginBottom: 24 }}>Vantiq CUET Platform</p>
        <input
          type="password"
          placeholder="Enter admin password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && check()}
          style={{ width: "100%", padding: "12px 16px", border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "'Sora', sans-serif", fontSize: 14, marginBottom: 12, boxSizing: "border-box" }}
          autoFocus
        />
        {err && <p style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>{err}</p>}
        <button onClick={check} style={{ ...S.btn, ...S.btnPrimary, width: "100%" }}>
          Enter Dashboard
        </button>
      </div>
    </div>
  );
}

// ── Cache Status Card ─────────────────────────────────────────────────────────
function CacheCard({ mode, data, onFill, filling }) {
  const pct   = Math.round((data.current / CACHE_SIZE) * 100);
  const color = pct > 50 ? "#059669" : pct > 20 ? "#D97706" : "#DC2626";
  const label = pct > 50 ? "green" : pct > 20 ? "amber" : "red";

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2747", marginBottom: 2 }}>{mode}</div>
          <div style={S.statSub}>{data.current} / {CACHE_SIZE} sets</div>
        </div>
        <span style={S.pill(label)}>{pct}%</span>
      </div>
      <div style={S.progressBar}>
        <div style={S.progressFill(pct, color)} />
      </div>
      <button
        onClick={() => onFill(mode)}
        disabled={filling === mode}
        style={{ ...S.btn, ...(filling === mode ? S.btnMuted : S.btnSuccess), marginTop: 14, width: "100%", fontSize: 12 }}
      >
        {filling === mode ? "Filling..." : `Fill ${mode} Cache`}
      </button>
    </div>
  );
}

// ── User Manager Component ────────────────────────────────────────────────────
function UserManager({ addLog }) {
  const [email,   setEmail]   = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null);

  async function lookupUser() {
    if (!email.trim()) return;
    setLoading(true); setProfile(null); setMsg(null);
    try {
      const emailLower = email.trim().toLowerCase();
      // Try exact match first, then case-insensitive variants
      let snap = await getDocs(query(collection(db, "users"), where("email", "==", emailLower)));
      if (snap.empty) snap = await getDocs(query(collection(db, "users"), where("email", "==", email.trim())));
      if (snap.empty) {
        // Also search by displayName or check if current user
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email?.toLowerCase() === emailLower) {
          // Use current user's UID directly
          const { getDoc, doc: docRef } = await import("firebase/firestore");
          const userDoc = await getDoc(docRef(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            snap = { docs: [{ id: currentUser.uid, data: () => userDoc.data() }], empty: false };
          }
        }
      }
      if (snap.empty) { setMsg({ text: `No account found for ${email}. Check spelling or try your exact registered email.`, type: "error" }); setLoading(false); return; }
      const d = snap.docs[0];
      // Get test count
      const testsQ = query(collection(db, "tests"), where("uid", "==", d.id), orderBy("completedAt", "desc"), limit(5));
      const testsSnap = await getDocs(testsQ);
      setProfile({ id: d.id, ...d.data(), recentTests: testsSnap.docs.map(t => t.data()) });
      addLog(`Looked up user: ${email}`, "info");
    } catch(e) { setMsg({ text: `Error: ${e.message}`, type: "error" }); }
    setLoading(false);
  }

  async function grantAccess() {
    if (!profile) return;
    setLoading(true);
    try {
      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "users", profile.id), { unlocked: true, unlockedAt: new Date(), unlockedBy: "admin" });
      setProfile(p => ({ ...p, unlocked: true }));
      addLog(`Granted pro access to ${email}`, "success");
      setMsg({ text: `✅ Pro access granted to ${email}`, type: "success" });
    } catch(e) { setMsg({ text: `Error: ${e.message}`, type: "error" }); }
    setLoading(false);
  }

  async function revokeAccess() {
    if (!profile) return;
    setLoading(true);
    try {
      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "users", profile.id), { unlocked: false });
      setProfile(p => ({ ...p, unlocked: false }));
      addLog(`Revoked pro access from ${email}`, "info");
      setMsg({ text: `Access revoked for ${email}`, type: "success" });
    } catch(e) { setMsg({ text: `Error: ${e.message}`, type: "error" }); }
    setLoading(false);
  }

  const fmtDate = ts => {
    if (!ts) return "—";
    try { return (ts.toDate ? ts.toDate() : new Date(ts)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return "—"; }
  };

  const inputStyle = {
    flex: 1, padding: "10px 14px", border: "1px solid #E2E8F0",
    borderRadius: 8, fontFamily: "'Sora', sans-serif", fontSize: 13, outline: "none",
  };

  return (
    <div style={{ ...S.card, maxWidth: 600 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input type="email" placeholder="student@example.com" value={email}
          onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && lookupUser()}
          style={inputStyle} />
        <button onClick={lookupUser} disabled={loading} style={{ ...S.btn, ...S.btnPrimary }}>
          {loading ? "..." : "Look Up"}
        </button>
      </div>

      {msg && <p style={{ fontSize: 12, marginBottom: 12, fontWeight: 600, color: msg.type === "error" ? "#DC2626" : "#059669" }}>{msg.text}</p>}

      {profile && (
        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "16px", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Name",         val: profile.displayName || "—" },
              { label: "Email",        val: profile.email || "—" },
              { label: "Tests Used",   val: profile.testsUsed || 0 },
              { label: "Access",       val: profile.unlocked ? "Pro ✅" : "Free" },
              { label: "Registered",   val: fmtDate(profile.createdAt) },
              { label: "Last Test",    val: fmtDate(profile.lastTestAt) },
            ].map(row => (
              <div key={row.label}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".05em" }}>{row.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 2 }}>{String(row.val)}</div>
              </div>
            ))}
          </div>

          {profile.recentTests?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Recent Tests</div>
              {profile.recentTests.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid #F1F5F9" }}>
                  <span>{t.mode || "Mock"}</span>
                  <span style={{ fontFamily: "monospace" }}>{t.totalScore ?? "—"} pts · {t.accuracy ?? 0}%</span>
                  <span style={{ color: "#94A3B8" }}>{fmtDate(t.completedAt)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {!profile.unlocked
              ? <button onClick={grantAccess} disabled={loading} style={{ ...S.btn, ...S.btnSuccess, fontSize: 12 }}>Grant Pro Access</button>
              : <button onClick={revokeAccess} disabled={loading} style={{ ...S.btn, ...S.btnDanger, fontSize: 12 }}>Revoke Access</button>
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reset User Free Limit Component ──────────────────────────────────────────
function ResetUserLimit({ addLog }) {
  const [email,   setEmail]   = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email.trim()) { setResult({ text: "Enter a user email address.", type: "error" }); return; }
    setLoading(true);
    setResult(null);
    try {
      const emailLower = email.trim().toLowerCase();
      let snap = await getDocs(query(collection(db, "users"), where("email", "==", emailLower)));
      if (snap.empty) snap = await getDocs(query(collection(db, "users"), where("email", "==", email.trim())));
      // Fallback: if email matches currently signed-in user, use their UID directly
      if (snap.empty && auth.currentUser?.email?.toLowerCase() === emailLower) {
        const { getDoc, doc: docRef2 } = await import("firebase/firestore");
        const ud = await getDoc(docRef2(db, "users", auth.currentUser.uid));
        if (ud.exists()) snap = { docs: [{ id: auth.currentUser.uid, data: () => ud.data() }], empty: false };
      }
      if (!snap.docs?.length) {
        setResult({ text: `No user found for: ${email}. Check spelling or try exact registered email.`, type: "error" });
        setLoading(false); return;
      }
      const userDoc = snap.docs[0];
      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "users", userDoc.id), {
        testsUsed: 0,
        unlocked: false,
        dailyTests: {},
      });
      addLog(`Reset free limit for ${email} — testsUsed set to 0`, "success");
      setResult({ text: `✅ Free limit reset for ${email}. They now have 4 free Mock Exams again.`, type: "success" });
      setEmail("");
    } catch (e) {
      addLog(`Reset failed for ${email}: ${e.message}`, "error");
      setResult({ text: `Error: ${e.message}`, type: "error" });
    }
    setLoading(false);
  }

  return (
    <div style={{ ...S.card, maxWidth: 480 }}>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
        Resets a student's Mock Exam count to 0. Use for support requests or when a test was consumed due to a technical error.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          type="email"
          placeholder="student@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleReset()}
          style={{
            flex: 1, padding: "10px 14px", border: "1px solid #E2E8F0",
            borderRadius: 8, fontFamily: "'Sora', sans-serif", fontSize: 13, outline: "none",
          }}
        />
        <button
          onClick={handleReset}
          disabled={loading}
          style={{ ...S.btn, ...(loading ? S.btnMuted : S.btnDanger), whiteSpace: "nowrap" }}
        >
          {loading ? "Resetting..." : "Reset Limit"}
        </button>
      </div>
      {result && (
        <p style={{ fontSize: 12, marginTop: 10, fontWeight: 600, color: result.type === "error" ? "#DC2626" : "#059669" }}>
          {result.text}
        </p>
      )}
    </div>
  );
}

// ── Change Password Component ─────────────────────────────────────────────────
function ChangePassword() {
  const [current,  setCurrent]  = useState("");
  const [newPass,  setNewPass]  = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [msg,      setMsg]      = useState(null);

  function handleChange() {
    setMsg(null);
    const activePass = localStorage.getItem("vantiq_admin_pw") || DEFAULT_PASS;
    if (current !== activePass)    { setMsg({ text: "Current password is incorrect.", type: "error" }); return; }
    if (newPass.length < 8)        { setMsg({ text: "New password must be at least 8 characters.", type: "error" }); return; }
    if (newPass !== confirm)       { setMsg({ text: "New passwords do not match.", type: "error" }); return; }
    localStorage.setItem("vantiq_admin_pw", newPass);
    setMsg({ text: "Password updated. Takes effect on next login.", type: "success" });
    setCurrent(""); setNewPass(""); setConfirm("");
  }

  const inputStyle = {
    width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0",
    borderRadius: 8, fontFamily: "'Sora', sans-serif", fontSize: 13,
    marginBottom: 10, boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ ...S.card, maxWidth: 420 }}>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
        Password is stored in this browser. Works immediately — no redeploy needed.
      </p>
      <input type="password" placeholder="Current password"     value={current}  onChange={e => setCurrent(e.target.value)}  style={inputStyle} />
      <input type="password" placeholder="New password (min 8)" value={newPass}  onChange={e => setNewPass(e.target.value)}  style={inputStyle} />
      <input type="password" placeholder="Confirm new password" value={confirm}  onChange={e => setConfirm(e.target.value)}  style={inputStyle}
        onKeyDown={e => e.key === "Enter" && handleChange()} />
      {msg && (
        <p style={{ fontSize: 12, marginBottom: 10, color: msg.type === "error" ? "#DC2626" : "#059669", fontWeight: 600 }}>
          {msg.type === "success" ? "✅" : "❌"} {msg.text}
        </p>
      )}
      <button onClick={handleChange} style={{ ...S.btn, ...S.btnPrimary, width: "100%" }}>
        Update Password
      </button>
    </div>
  );
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [unlocked,    setUnlocked]    = useState(false);
  const [fbUser,      setFbUser]      = useState(null);
  const [fbLoading,   setFbLoading]   = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [stats,       setStats]       = useState(null);
  const [cache,       setCache]       = useState({});
  const [recentTests, setRecentTests] = useState([]);
  const [recentPay,   setRecentPay]   = useState([]);
  const [logs,        setLogs]        = useState([]);
  const [filling,     setFilling]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Sign in with Firebase Google auth after password gate
  // Required for Firestore rules (isAdmin checks email)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setFbUser(u);
      if (unlocked && u) loadData();
    });
    return unsub;
  }, [unlocked]);

  async function handleFirebaseSignIn() {
    setFbLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      setFbUser(result.user);
      addLog(`Signed in as ${result.user.email}`, "success");
    } catch(e) {
      addLog("Google sign-in failed: " + e.message, "error");
    }
    setFbLoading(false);
  }

  async function handleSwitchAccount() {
    setFbLoading(true);
    try {
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      setFbUser(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      setFbUser(result.user);
      addLog(`Switched to ${result.user.email}`, "success");
      loadData();
    } catch(e) {
      addLog("Switch failed: " + e.message, "error");
    }
    setFbLoading(false);
  }

  const addLog = (msg, type = "info") => {
    const ts = new Date().toLocaleTimeString("en-IN");
    setLogs(l => [`[${ts}] ${type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️"} ${msg}`, ...l].slice(0, 50));
  };

  const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const loadData = useCallback(async () => {
    setLoading(true);
    addLog("Loading dashboard data...");
    const user = auth.currentUser;
    if (!user) {
      addLog("Not signed in with Google — click 'Sign in with Google' below to load stats", "error");
      setLoading(false);
      return;
    }
    try {
      // ── User stats ───────────────────────────────────────────────────────
      // getDocs instead of getCountFromServer — works reliably with Firestore security rules
      const usersSnap   = await getDocs(collection(db, "users"));
      const totalUsers  = usersSnap.size;
      const totalPaid   = usersSnap.docs.filter(d => d.data().unlocked === true).length;

      // Today's tests
      const today      = todayIST();
      const usersToday = await getDocs(query(collection(db, "users"), orderBy("lastTestAt", "desc"), limit(100)));
      let testsToday   = 0;
      usersToday.docs.forEach(d => {
        const dt = d.data().dailyTests || {};
        testsToday += dt[today] || 0;
      });

      // ── Cache status ─────────────────────────────────────────────────────
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const cacheData = {};
      for (const mode of ["Mock", "QuickPractice"]) {
        const snap  = await getDocs(query(collection(db, "questionCache"), where("mode", "==", mode)));
        const fresh = snap.docs.filter(d => d.data().createdAt?.toDate() > cutoff);
        cacheData[mode] = { current: fresh.length, needed: Math.max(0, CACHE_SIZE - fresh.length) };
      }
      setCache(cacheData);

      // ── Recent tests ─────────────────────────────────────────────────────
      const testsSnap = await getDocs(query(collection(db, "tests"), orderBy("completedAt", "desc"), limit(10)));
      setRecentTests(testsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // ── Recent payments ──────────────────────────────────────────────────
      const paySnap = await getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(10)));
      setRecentPay(paySnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // ── Revenue ──────────────────────────────────────────────────────────
      const allPay    = await getDocs(collection(db, "payments"));
      const totalRev  = allPay.size * 199;

      setStats({ totalUsers, totalPaid, testsToday, totalRev, convRate: totalUsers > 0 ? Math.round((totalPaid / totalUsers) * 100) : 0 });
      setLastRefresh(new Date().toLocaleTimeString("en-IN"));
      addLog(`Data loaded — ${totalUsers} users, ${totalPaid} paid, ₹${totalRev} revenue`, "success");
    } catch (e) {
      addLog(`Load error: ${e.message}`, "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (unlocked) loadData();
  }, [unlocked, loadData]);

  async function fillCache(mode) {
    setFilling(mode);
    addLog(`Starting ${mode} cache fill...`);
    try {
      // Send adminKey in body only — avoids CORS preflight from custom header
      const res = await fetch(`${CF_BASE}/triggerCacheWarm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, adminKey: ADMIN_KEY }),
      });
      const d = await res.json();
      if (d.message) {
        addLog(`${mode} fill: ${d.message}. Generated: ${d.generated ?? "running..."}, Status: ${JSON.stringify(d.status)}`, "success");
        await loadData();
      } else {
        addLog(`${mode} fill error: ${d.error}`, "error");
      }
    } catch (e) {
      addLog(`${mode} fill failed: ${e.message}`, "error");
    }
    setFilling(null);
  }

  async function fillAllCache() {
    addLog("Starting full cache fill (Mock + QuickPractice)...");
    await fillCache("Mock");
    await fillCache("QuickPractice");
  }

  const fmtDate = (ts) => {
    if (!ts) return "—";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return "—"; }
  };

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={S.headerTitle}>Vantiq CUET — Admin</span>
          <span style={S.headerBadge}>English (101)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastRefresh && <span style={{ color: "rgba(255,255,255,.5)", fontSize: 11 }}>Updated {lastRefresh}</span>}
          <button onClick={loadData} disabled={loading} style={{ ...S.btn, ...S.btnMuted, fontSize: 12, padding: "6px 14px" }}>
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      <div style={S.body}>
        {/* Firebase auth banner */}
        {!fbUser && (
          <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 10, padding: "12px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "#92400E", fontWeight: 500 }}>
              ⚠️ Sign in with Google to load student stats and use cache controls.
            </span>
            <button onClick={handleFirebaseSignIn} disabled={fbLoading}
              style={{ ...S.btn, background: "#fff", color: "#0F2747", border: "1px solid #D97706", fontSize: 12, padding: "7px 16px" }}>
              {fbLoading ? "Signing in..." : "Sign in with Google"}
            </button>
          </div>
        )}
        {fbUser && (
          <div style={{ background: "#DCFCE7", border: "1px solid #86EFAC", borderRadius: 10, padding: "10px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#166534" }}>✅ Signed in as {fbUser.email}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSwitchAccount} disabled={fbLoading} style={{ ...S.btn, background: "#fff", color: "#0F2747", border: "1px solid #86EFAC", fontSize: 11, padding: "4px 12px" }}>
                {fbLoading ? "..." : "Switch Account"}
              </button>
              <button onClick={loadData} disabled={loading} style={{ ...S.btn, ...S.btnMuted, fontSize: 11, padding: "4px 12px" }}>
                Reload Data
              </button>
            </div>
          </div>
        )}
        {/* KPI Strip */}
        <div style={S.sectionTitle}>Overview</div>
        <div style={S.grid}>
          {[
            { label: "Total Students", val: stats?.totalUsers ?? "—", sub: "registered users" },
            { label: "Paid Access",    val: stats?.totalPaid  ?? "—", sub: `₹${stats?.totalRev ?? 0} revenue` },
            { label: "Conversion",     val: stats?.convRate   != null ? `${stats.convRate}%` : "—", sub: "free → paid" },
            { label: "Tests Today",    val: stats?.testsToday ?? "—", sub: todayIST() },
          ].map(s => (
            <div key={s.label} style={{ ...S.card, borderLeft: "4px solid #4338CA" }}>
              <div style={S.statVal}>{s.val}</div>
              <div style={S.statLabel}>{s.label}</div>
              <div style={S.statSub}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Cache Control */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={S.sectionTitle}>Cache Health</div>
          <button onClick={fillAllCache} disabled={!!filling} style={{ ...S.btn, ...S.btnPrimary, fontSize: 12, padding: "8px 16px" }}>
            {filling ? `Filling ${filling}...` : "⚡ Fill All Cache"}
          </button>
        </div>
        <div style={S.grid}>
          {Object.entries(cache).map(([mode, data]) => (
            <CacheCard key={mode} mode={mode} data={data} onFill={fillCache} filling={filling} />
          ))}
        </div>

        {/* Two column layout for tables */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Recent Tests */}
          <div>
            <div style={S.sectionTitle}>Recent Tests</div>
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["Mode", "Score", "Accuracy", "Date"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentTests.length === 0 ? (
                    <tr><td colSpan={4} style={{ ...S.td, textAlign: "center", color: "#94A3B8" }}>No tests yet</td></tr>
                  ) : recentTests.map((t, i) => (
                    <tr key={i}>
                      <td style={S.td}><span style={S.pill("indigo")}>{t.mode || "Mock"}</span></td>
                      <td style={{ ...S.td, fontFamily: "monospace" }}>{t.totalScore ?? "—"}</td>
                      <td style={{ ...S.td, fontWeight: 600, color: (t.accuracy || 0) >= 70 ? "#059669" : (t.accuracy || 0) >= 45 ? "#D97706" : "#DC2626" }}>
                        {t.accuracy ?? 0}%
                      </td>
                      <td style={{ ...S.td, color: "#94A3B8", fontSize: 11 }}>{fmtDate(t.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payments */}
          <div>
            <div style={S.sectionTitle}>Recent Payments</div>
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["Amount", "Status", "Date"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentPay.length === 0 ? (
                    <tr><td colSpan={3} style={{ ...S.td, textAlign: "center", color: "#94A3B8" }}>No payments yet</td></tr>
                  ) : recentPay.map((p, i) => (
                    <tr key={i}>
                      <td style={{ ...S.td, fontFamily: "monospace", fontWeight: 600 }}>₹{(p.amount || 0) / 100}</td>
                      <td style={S.td}><span style={S.pill(p.status === "verified" ? "green" : "red")}>{p.status}</span></td>
                      <td style={{ ...S.td, color: "#94A3B8", fontSize: 11 }}>{fmtDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div style={S.sectionTitle}>Activity Log</div>
        <div style={S.logBox}>
          {logs.length === 0
            ? <span style={{ color: "#475569" }}>No activity yet...</span>
            : logs.map((l, i) => <div key={i}>{l}</div>)
          }
        </div>

        {/* Quick Links */}
        <div style={S.sectionTitle}>Quick Links</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Firebase Console",   url: "https://console.firebase.google.com/project/vantiq-cuet/overview" },
            { label: "Firebase Functions", url: "https://console.firebase.google.com/project/vantiq-cuet/functions" },
            { label: "Firestore",          url: "https://console.firebase.google.com/project/vantiq-cuet/firestore" },
            { label: "Netlify Deploys",    url: "https://app.netlify.com/projects/vantiq-cuetmock/deploys" },
            { label: "GitHub Actions",     url: "https://github.com/casinghal/cuet-mock-platform/actions" },
            { label: "Razorpay Dashboard", url: "https://dashboard.razorpay.com" },
            { label: "GA4 Analytics",      url: "https://analytics.google.com" },
            { label: "Anthropic Console",  url: "https://console.anthropic.com" },
          ].map(link => (
            <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
              style={{ ...S.btn, ...S.btnMuted, textDecoration: "none", fontSize: 12 }}>
              {link.label} ↗
            </a>
          ))}
        </div>

        {/* Reset User Free Limit */}
        <div style={S.sectionTitle}>Reset Student Free Limit</div>
        <ResetUserLimit addLog={addLog} />

        {/* User Manager */}
        <div style={S.sectionTitle}>User Management</div>
        <p style={{ fontSize: 13, color: "#64748B", marginBottom: 12, marginTop: -8 }}>
          Look up any student by email — view their profile, test history, and grant or revoke pro access.
        </p>
        <UserManager addLog={addLog} />

        {/* Change Password */}
        <div style={S.sectionTitle}>Change Admin Password</div>
        <ChangePassword />

        <div style={{ textAlign: "center", marginTop: 40, fontSize: 11, color: "#CBD5E1" }}>
          Vantiq CUET Admin · {new Date().getFullYear()} · Internal use only
        </div>
      </div>
    </div>
  );
}
