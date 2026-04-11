import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  setDoc,
  doc,
} from "firebase/firestore";

// ─── Firebase init ────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const fbApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

const CF_BASE = import.meta.env.VITE_CLOUD_FUNCTION_BASE;
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";

// ─── Cache config ─────────────────────────────────────────────────────────────
const CACHE_CONFIG = {
  Mock: { size: 120, threshold: 100, label: "Mock Cache" },
  QuickPractice: { size: 200, threshold: 160, label: "QP Cache" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return "—";
  const dt = d?.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
    ", " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const trunc = (str, n) =>
  str && str.length > n ? str.slice(0, n) + "…" : str || "—";

const cfFetch = async (path, body = {}) => {
  if (!CF_BASE) throw new Error("VITE_CLOUD_FUNCTION_BASE not set in Netlify env vars");
  if (!ADMIN_KEY) throw new Error("VITE_ADMIN_KEY not set in Netlify env vars");
  const res = await fetch(`${CF_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  // Layout
  page: {
    fontFamily: "'Sora', sans-serif",
    background: "#F8FAFC",
    minHeight: "100vh",
    color: "#0F2747",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "#0F2747",
    height: 52,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    borderBottom: "1px solid #1a3a6b",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerTitle: {
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: "0.02em",
  },
  envBadge: {
    background: "#059669",
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 20,
    letterSpacing: "0.05em",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  emailChip: {
    background: "rgba(255,255,255,0.1)",
    color: "#cbd5e1",
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 20,
    maxWidth: 180,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // Status bar
  statusBar: {
    position: "sticky",
    top: 52,
    zIndex: 99,
    background: "#fff",
    borderBottom: "1px solid #E2E8F0",
    padding: "6px 20px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    overflowX: "auto",
    height: 48,
  },
  pill: (color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "4px 10px",
    background: "#F1F5F9",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    border: "1px solid #E2E8F0",
    whiteSpace: "nowrap",
    color: "#0F2747",
  }),
  pillDot: (color) => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),
  // Command row
  commandRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 20px",
    gap: 8,
    flexWrap: "wrap",
  },
  commandLeft: { display: "flex", gap: 8, flexWrap: "wrap" },
  btnSmall: (variant = "default") => ({
    height: 32,
    padding: "0 14px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border: variant === "primary" ? "none" : "1px solid #E2E8F0",
    background:
      variant === "primary"
        ? "#4338CA"
        : variant === "danger"
        ? "#FEE2E2"
        : "#fff",
    color:
      variant === "primary"
        ? "#fff"
        : variant === "danger"
        ? "#DC2626"
        : "#0F2747",
    transition: "all 0.15s",
  }),
  lastRefresh: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "'JetBrains Mono', monospace",
  },
  // Fill progress strip
  fillStrip: {
    background: "#ECFDF5",
    border: "1px solid #A7F3D0",
    borderRadius: 8,
    padding: "7px 14px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    margin: "0 20px 8px",
  },
  fillDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#059669",
    animation: "pulse 1.4s infinite",
  },
  // KPI grid
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6,1fr)",
    gap: 12,
    padding: "0 20px 12px",
  },
  kpiTile: (accent = "#4338CA") => ({
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderLeft: `3px solid ${accent}`,
    borderRadius: 10,
    padding: "12px 16px",
    minWidth: 0,
  }),
  kpiVal: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 26,
    fontWeight: 700,
    color: "#0F2747",
    lineHeight: 1,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#94A3B8",
    marginTop: 4,
  },
  kpiSub: { fontSize: 11, color: "#64748B", marginTop: 2 },
  // Live section
  liveSection: {
    display: "grid",
    gridTemplateColumns: "45% 55%",
    gap: 12,
    padding: "0 20px 12px",
  },
  card: {
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
  },
  cardHeader: {
    padding: "10px 14px",
    borderBottom: "1px solid #F1F5F9",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94A3B8" },
  // Tables
  tableRow: (alt) => ({
    display: "grid",
    alignItems: "center",
    height: 34,
    borderBottom: "1px solid #F1F5F9",
    fontSize: 12,
    background: alt ? "#FAFBFD" : "#fff",
    padding: "0 14px",
  }),
  tableHeader: {
    display: "grid",
    alignItems: "center",
    height: 30,
    borderBottom: "1px solid #E2E8F0",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#94A3B8",
    padding: "0 14px",
    background: "#F8FAFC",
  },
  // Tabs
  tabBar: {
    display: "flex",
    borderBottom: "2px solid #E2E8F0",
    padding: "0 20px",
    gap: 0,
  },
  tabItem: (active) => ({
    padding: "10px 18px",
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    color: active ? "#0F2747" : "#94A3B8",
    borderBottom: active ? "2px solid #4338CA" : "2px solid transparent",
    cursor: "pointer",
    marginBottom: -2,
    transition: "all 0.15s",
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid #4338CA" : "2px solid transparent",
  }),
  tabPanel: { padding: "16px 20px" },
  // Misc
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#94A3B8",
    padding: "12px 20px 6px",
  },
  statusBadge: (type) => {
    const map = {
      healthy: { bg: "#DCFCE7", color: "#059669" },
      warning: { bg: "#FEF3C7", color: "#D97706" },
      critical: { bg: "#FEE2E2", color: "#DC2626" },
      info: { bg: "#EEF2FF", color: "#4338CA" },
      paid: { bg: "#DCFCE7", color: "#059669" },
      free: { bg: "#F1F5F9", color: "#64748B" },
    };
    const t = map[type] || map.info;
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      background: t.bg,
      color: t.color,
    };
  },
  // Input
  input: {
    height: 34,
    border: "1px solid #E2E8F0",
    borderRadius: 6,
    padding: "0 12px",
    fontSize: 12,
    fontFamily: "'Sora', sans-serif",
    color: "#0F2747",
    background: "#fff",
    outline: "none",
    width: "100%",
  },
  // Log entry
  logEntry: (type) => ({
    padding: "4px 12px",
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    color:
      type === "error"
        ? "#DC2626"
        : type === "warn"
        ? "#D97706"
        : type === "success"
        ? "#059669"
        : "#64748B",
    borderLeft: `2px solid ${
      type === "error"
        ? "#DC2626"
        : type === "warn"
        ? "#D97706"
        : type === "success"
        ? "#059669"
        : "#E2E8F0"
    }`,
    marginBottom: 1,
  }),
  // Health check
  healthItem: (ok) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 0",
    fontSize: 12,
    borderBottom: "1px solid #F1F5F9",
    color: ok ? "#059669" : "#DC2626",
  }),
  // Spinner
  spinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid #E2E8F0",
    borderTop: "2px solid #4338CA",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ label, value, color = "#059669", warning = false, critical = false }) {
  const dotColor = critical ? "#DC2626" : warning ? "#D97706" : color;
  const pillStyle = {
    ...S.pill(),
    ...(critical
      ? { background: "#FEE2E2", borderColor: "#FECACA" }
      : warning
      ? { background: "#FEF3C7", borderColor: "#FDE68A" }
      : {}),
  };
  return (
    <span style={pillStyle}>
      <span
        style={{
          ...S.pillDot(dotColor),
          ...(warning || critical
            ? { animation: "pulse 1.2s infinite" }
            : {}),
        }}
      />
      {label}:{" "}
      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
    </span>
  );
}

function KpiTile({ value, label, sub, accent = "#4338CA", loading }) {
  return (
    <div style={S.kpiTile(accent)}>
      {loading ? (
        <div style={{ height: 26, background: "#F1F5F9", borderRadius: 4, animation: "shimmer 1.2s infinite" }} />
      ) : (
        <div style={S.kpiVal}>{value ?? "—"}</div>
      )}
      <div style={S.kpiLabel}>{label}</div>
      {sub && <div style={S.kpiSub}>{sub}</div>}
    </div>
  );
}

function CacheBar({ mode, config, current }) {
  const pct = Math.min(100, Math.round((current / config.size) * 100));
  const isWarning = current < config.threshold;
  const isCritical = current < config.threshold * 0.5;
  const color = isCritical ? "#DC2626" : isWarning ? "#D97706" : "#059669";
  return (
    <div style={{ padding: "10px 14px", borderBottom: "1px solid #F1F5F9" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{config.label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color }}>
          {current}/{config.size}
        </span>
      </div>
      <div style={{ background: "#F1F5F9", borderRadius: 4, height: 6, overflow: "hidden", position: "relative" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${(config.threshold / config.size) * 100}%`,
            width: 2,
            height: "100%",
            background: "#D97706",
          }}
        />
      </div>
      <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 3 }}>
        threshold {config.threshold} · {isWarning ? `${config.threshold - current} below threshold` : "healthy"}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pwError, setPwError] = useState("");
  const [fbUser, setFbUser] = useState(null);
  const [fbLoading, setFbLoading] = useState(true);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [stats, setStats] = useState(null);
  const [recentTests, setRecentTests] = useState([]);
  const [recentPay, setRecentPay] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [userBreakdown, setUserBreakdown] = useState([]);
  const [liveUsers, setLiveUsers] = useState(0);
  const [insights, setInsights] = useState(null);
  const [intel, setIntel] = useState(null);
  const [intelLoad, setIntelLoad] = useState(false);
  const [intelGenLoad, setIntelGenLoad] = useState(false);

  // ── Cache state ─────────────────────────────────────────────────────────────
  const [cacheStatus, setCacheStatus] = useState(null);
  const [filling, setFilling] = useState(false);
  const [fillProgress, setFillProgress] = useState(null);
  const fillPollRef = useRef(null);
  const fillStartRef = useRef(null);
  const stalePollsRef = useRef(0);

  // ── Health state ────────────────────────────────────────────────────────────
  const [healthData, setHealthData] = useState(null);
  const [healthLoad, setHealthLoad] = useState(false);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("students");
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [logs, setLogs] = useState([]);

  // ── User management state ───────────────────────────────────────────────────
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoad, setLookupLoad] = useState(false);

  // ── Change password state ───────────────────────────────────────────────────
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  // ── Refs ────────────────────────────────────────────────────────────────────
  const statusPollRef = useRef(null);

  // ── Logging ─────────────────────────────────────────────────────────────────
  const addLog = useCallback((msg, type = "info") => {
    const ts = new Date().toLocaleTimeString("en-IN");
    setLogs((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 40).map((l, i) =>
      i === 0 ? { text: `[${ts}] ${msg}`, type } : typeof l === "string" ? { text: l, type: "info" } : l
    ));
  }, []);

  // ── Firebase auth listener ──────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      setFbLoading(false);
    });
    return unsub;
  }, []);

  // ── Password gate ───────────────────────────────────────────────────────────
  const handlePassword = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError("");
    } else {
      setPwError("Incorrect password.");
    }
  };

  // ── Load Firestore data ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!fbUser) return;
    setLoading(true);
    addLog("Loading dashboard data...");

    try {
      // Users
      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const total = users.length;
      const paid = users.filter((u) => u.unlocked).length;
      const revenue = paid * 199;
      const convPct = total > 0 ? ((paid / total) * 100).toFixed(1) : "0.0";

      // Recent tests (today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const testsQ = query(collection(db, "tests"), orderBy("completedAt", "desc"), limit(50));
      const testsSnap = await getDocs(testsQ);
      const allTests = testsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const todayTests = allTests.filter((t) => {
        const d = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt || 0);
        return d >= today;
      });

      // Build user breakdown
      const userMap = {};
      users.forEach((u) => {
        userMap[u.id] = {
          email: u.email || u.displayName || u.id,
          mock: 0,
          qp: 0,
          unlocked: u.unlocked,
          lastTest: u.lastTestAt,
          testsUsed: u.testsUsed || 0,
        };
      });
      allTests.forEach((t) => {
        if (userMap[t.uid]) {
          if (t.mode === "Mock") userMap[t.uid].mock++;
          else userMap[t.uid].qp++;
        }
      });
      const breakdown = Object.values(userMap)
        .sort((a, b) => b.mock - a.mock)
        .slice(0, 50);

      setUserBreakdown(breakdown);
      setRecentTests(allTests.slice(0, 30));

      // Recent activity feed (last 8 events across tests)
      setStats({ total, paid, revenue, convPct, testsToday: todayTests.length });

      // Payments
      try {
        const payQ = query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(20));
        const paySnap = await getDocs(payQ);
        setRecentPay(paySnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        addLog("Payments load: " + e.message, "warn");
      }

      // Feedback
      try {
        const fbQ = query(collection(db, "feedback"), orderBy("createdAt", "desc"), limit(30));
        const fbSnap = await getDocs(fbQ);
        setFeedback(fbSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        addLog("Feedback load: " + e.message, "warn");
      }

      // Ratings
      try {
        const rQ = query(collection(db, "ratings"), orderBy("createdAt", "desc"), limit(100));
        const rSnap = await getDocs(rQ);
        setRatings(rSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        addLog("Ratings load: " + e.message, "warn");
      }

      // Presence (live users)
      try {
        const pQ = query(collection(db, "presence"));
        const pSnap = await getDocs(pQ);
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const live = pSnap.docs.filter((d) => {
          const ls = d.data().lastSeen?.toDate ? d.data().lastSeen.toDate() : null;
          return ls && ls > fiveMinsAgo;
        });
        setLiveUsers(live.length);
      } catch (e) {
        setLiveUsers(0);
      }

      // Intelligence
      try {
        const iQ = query(collection(db, "cuetIntelligence"), limit(5));
        const iSnap = await getDocs(iQ);
        setIntel(iSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        addLog("Intelligence load: " + e.message, "warn");
      }

      setLastRefresh(new Date());
      addLog(`Loaded: ${total} users, ${allTests.length} tests, ${paid} paid`, "success");
    } catch (e) {
      addLog("Data load error: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [fbUser, addLog]);

  // ── Load cache status ────────────────────────────────────────────────────────
  const loadCacheStatus = useCallback(async (silent = false) => {
    try {
      const data = await cfFetch("getCacheStatus");
      setCacheStatus(data?.status || null);
      return data?.status || null;
    } catch (e) {
      // Only log config errors (missing env vars) — transient fetch errors are silent during polling
      if (!silent && (e.message.includes("not set") || e.message.includes("HTTP 403"))) {
        addLog("Cache status error: " + e.message, "warn");
      }
      return null;
    }
  }, [addLog]);

  // ── Fill all cache ───────────────────────────────────────────────────────────
  const fillAllCache = useCallback(async () => {
    if (filling) {
      addLog("Fill already in progress — wait for it to complete", "warn");
      return;
    }
    setFilling(true);
    fillStartRef.current = Date.now();
    stalePollsRef.current = 0;
    addLog("Starting cache fill...");

    try {
      const res = await cfFetch("triggerCacheWarm", {});
      if (res?.locked) {
        addLog(`Fill already running (locked since ${res.lockedSince ? new Date(res.lockedSince).toLocaleTimeString("en-IN") : "recently"}) — watching progress...`, "info");
        // Still show progress strip using last known counts from getCacheStatus
        const s = res.status || {};
        setFillProgress({
          locked: true,
          mock: s.Mock?.current ?? 0,
          qp: s.QuickPractice?.current ?? 0,
          mockTarget: CACHE_CONFIG.Mock.size,
          qpTarget: CACHE_CONFIG.QuickPractice.size,
          elapsed: 0,
        });
      } else {
        addLog("Cache fill started: " + (res?.message || ""), "success");
        setFillProgress({ started: true });
      }
    } catch (e) {
      addLog("triggerCacheWarm error: " + e.message, "error");
      setFilling(false);
      return;
    }

    // Poll every 15 seconds
    fillPollRef.current = setInterval(async () => {
      const elapsed = Math.round((Date.now() - fillStartRef.current) / 1000);
      const status = await loadCacheStatus(true); // silent=true — no log spam during polling
      if (status) {
        const mCurrent = status.Mock?.current ?? 0;
        const qCurrent = status.QuickPractice?.current ?? 0;
        const mFull = mCurrent >= CACHE_CONFIG.Mock.size;
        const qFull = qCurrent >= CACHE_CONFIG.QuickPractice.size;

        setFillProgress({
          mock: mCurrent,
          qp: qCurrent,
          mockTarget: CACHE_CONFIG.Mock.size,
          qpTarget: CACHE_CONFIG.QuickPractice.size,
          elapsed,
          locked: status.locked,
        });

        const prevMock = fillProgress?.mock;
        const prevQp = fillProgress?.qp;
        if (mCurrent === prevMock && qCurrent === prevQp) {
          stalePollsRef.current++;
        } else {
          stalePollsRef.current = 0;
        }

        if ((mFull && qFull) || stalePollsRef.current >= 8 || elapsed > 570) {
          clearInterval(fillPollRef.current);
          setFilling(false);
          setFillProgress(null);
          if (mFull && qFull) addLog("Cache full — all modes at target", "success");
          else addLog("Fill cycle ended — check status", "warn");
        }
      }
    }, 15000);
  }, [filling, loadCacheStatus, fillProgress, addLog]);

  // ── Auto-fill check on load ──────────────────────────────────────────────────
  const checkAndFill = useCallback(async () => {
    const status = await loadCacheStatus(true); // silent on auto-check
    if (!status) return;
    const needsFill =
      (status.Mock?.current ?? 0) < CACHE_CONFIG.Mock.threshold ||
      (status.QuickPractice?.current ?? 0) < CACHE_CONFIG.QuickPractice.threshold;
    if (needsFill) {
      addLog("Cache below threshold — auto-fill starting in 1.5s", "warn");
      setTimeout(fillAllCache, 1500);
    }
  }, [loadCacheStatus, fillAllCache, addLog]);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authed && fbUser) {
      loadData();
      checkAndFill();
    } else if (authed && !fbUser && !fbLoading) {
      loadCacheStatus();
    }
  }, [authed, fbUser, fbLoading]);

  // ── Auto-refresh status bar every 60s ───────────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    statusPollRef.current = setInterval(() => {
      loadCacheStatus();
    }, 60000);
    return () => clearInterval(statusPollRef.current);
  }, [authed, loadCacheStatus]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(fillPollRef.current);
      clearInterval(statusPollRef.current);
    };
  }, []);

  // ── Health check ─────────────────────────────────────────────────────────────
  const runHealthCheck = async () => {
    setHealthLoad(true);
    addLog("Running health check...");
    try {
      const data = await cfFetch("platformHealthCheck");
      setHealthData(data);
      addLog(
        `Health: ${data.overallStatus} · ${data.autoFixed?.length || 0} auto-fixed`,
        data.overallStatus === "healthy" ? "success" : "warn"
      );
    } catch (e) {
      addLog("Health check error: " + e.message, "error");
    } finally {
      setHealthLoad(false);
    }
  };

  // ── Feedback insights ─────────────────────────────────────────────────────────
  const genInsights = async () => {
    addLog("Generating feedback insights...");
    try {
      const data = await cfFetch("generateFeedbackInsights");
      setInsights(data);
      addLog("Insights generated", "success");
    } catch (e) {
      addLog("Insights error: " + e.message, "error");
    }
  };

  // ── Update intelligence ───────────────────────────────────────────────────────
  const updateIntelligence = async (subject) => {
    setIntelGenLoad(true);
    addLog(`Updating intelligence: ${subject}...`);
    try {
      const data = await cfFetch("updateCuetIntelligence", { subject });
      addLog(`Intelligence updated: ${subject}`, "success");
      await loadData();
    } catch (e) {
      addLog("Intelligence error: " + e.message, "error");
    } finally {
      setIntelGenLoad(false);
    }
  };

  // ── User management ───────────────────────────────────────────────────────────
  const lookupUser = async () => {
    if (!lookupEmail.trim()) return;
    setLookupLoad(true);
    setLookupResult(null);
    try {
      const q = query(collection(db, "users"), where("email", "==", lookupEmail.trim().toLowerCase()), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        setLookupResult({ notFound: true });
      } else {
        setLookupResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (e) {
      addLog("User lookup error: " + e.message, "error");
    } finally {
      setLookupLoad(false);
    }
  };

  const grantAccess = async (uid) => {
    try {
      await setDoc(doc(db, "users", uid), { unlocked: true, unlockedAt: new Date() }, { merge: true });
      addLog(`Granted access to ${uid}`, "success");
      setLookupResult((p) => ({ ...p, unlocked: true }));
    } catch (e) {
      addLog("grantAccess error: " + e.message, "error");
    }
  };

  const revokeAccess = async (uid) => {
    try {
      await setDoc(doc(db, "users", uid), { unlocked: false }, { merge: true });
      addLog(`Revoked access from ${uid}`, "warn");
      setLookupResult((p) => ({ ...p, unlocked: false }));
    } catch (e) {
      addLog("revokeAccess error: " + e.message, "error");
    }
  };

  const resetFreeLimit = async (uid) => {
    try {
      await setDoc(doc(db, "users", uid), { testsUsed: 0 }, { merge: true });
      addLog(`Reset free limit for ${uid}`, "success");
      setLookupResult((p) => ({ ...p, testsUsed: 0 }));
    } catch (e) {
      addLog("resetFreeLimit error: " + e.message, "error");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────────────────────────────────────────
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((a, r) => a + (r.stars || 0), 0) / ratings.length).toFixed(1)
      : "—";

  const recentActivity = recentTests.slice(0, 8).map((t) => ({
    email: t.email || t.displayName || t.uid?.slice(0, 10),
    action: `${t.mode} · ${t.totalScore ?? 0} pts`,
    time: fmt(t.completedAt),
    icon: t.mode === "Mock" ? "📝" : "⚡",
  }));

  // Cache status values
  const mockCurrent = cacheStatus?.Mock?.current ?? "—";
  const qpCurrent = cacheStatus?.QuickPractice?.current ?? "—";
  const cacheHealthy =
    cacheStatus &&
    mockCurrent >= CACHE_CONFIG.Mock.threshold &&
    qpCurrent >= CACHE_CONFIG.QuickPractice.threshold;
  const cacheWarning =
    cacheStatus &&
    !cacheHealthy &&
    (mockCurrent >= CACHE_CONFIG.Mock.threshold * 0.5 || qpCurrent >= CACHE_CONFIG.QuickPractice.threshold * 0.5);
  const cacheCritical = cacheStatus && !cacheHealthy && !cacheWarning;

  // Platform overall
  const platformStatus = healthData?.overallStatus ?? "unknown";

  // ─────────────────────────────────────────────────────────────────────────────
  // PASSWORD GATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #080F1E, #0D1B3E)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Sora', sans-serif",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
          @keyframes shimmer { 0% { opacity:0.6; } 50% { opacity:1; } 100% { opacity:0.6; } }
        `}</style>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 40,
            width: 360,
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
            Vantiq CUET · Admin
          </div>
          <div style={{ color: "#64748B", fontSize: 12, marginBottom: 28 }}>
            Control centre — authorised access only
          </div>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePassword()}
            style={{
              ...S.input,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
              marginBottom: 12,
            }}
          />
          {pwError && (
            <div style={{ color: "#F87171", fontSize: 12, marginBottom: 10 }}>{pwError}</div>
          )}
          <button
            onClick={handlePassword}
            style={{
              width: "100%",
              height: 40,
              background: "#4338CA",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Sora', sans-serif",
            }}
          >
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes shimmer { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #F1F5F9; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
        button:hover { opacity: 0.88; }
        @media (max-width: 900px) {
          .kpi-grid { grid-template-columns: repeat(3,1fr) !important; }
          .live-section { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .kpi-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerTitle}>Vantiq CUET · Admin</div>
          <span style={S.envBadge}>LIVE</span>
        </div>
        <div style={S.headerRight}>
          {fbUser ? (
            <>
              <span style={S.emailChip}>{fbUser.email}</span>
              <button
                onClick={() => signOut(auth)}
                style={{ ...S.btnSmall(), background: "rgba(255,255,255,0.08)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
              style={{ ...S.btnSmall(), background: "#fff", color: "#0F2747" }}
            >
              Sign in with Google
            </button>
          )}
          <button
            onClick={() => { loadData(); loadCacheStatus(); }}
            style={{ ...S.btnSmall("primary"), marginLeft: 4 }}
          >
            {loading ? "↻" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── FIREBASE SIGN-IN BANNER ── */}
      {!fbUser && !fbLoading && (
        <div style={{ background: "#FEF3C7", borderBottom: "1px solid #FDE68A", padding: "8px 20px", fontSize: 12, color: "#D97706", display: "flex", alignItems: "center", gap: 8 }}>
          <span>⚠</span>
          Sign in with Google to load Firestore data. Cache status visible without sign-in.
          <button
            onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
            style={{ ...S.btnSmall(), background: "#D97706", color: "#fff", border: "none", marginLeft: 8 }}
          >
            Sign in
          </button>
        </div>
      )}

      {/* ── ZONE 1: STATUS BAR ── */}
      <div style={S.statusBar}>
        <StatusPill
          label="Platform"
          value={platformStatus === "healthy" ? "HEALTHY" : platformStatus === "unknown" ? "—" : platformStatus.toUpperCase()}
          color={platformStatus === "healthy" ? "#059669" : "#D97706"}
          warning={platformStatus !== "healthy" && platformStatus !== "unknown"}
          critical={platformStatus === "critical"}
        />
        <StatusPill
          label="Mock Cache"
          value={`${mockCurrent}/${CACHE_CONFIG.Mock.size}`}
          color={cacheHealthy ? "#059669" : "#D97706"}
          warning={cacheWarning}
          critical={cacheCritical}
        />
        <StatusPill
          label="QP Cache"
          value={`${qpCurrent}/${CACHE_CONFIG.QuickPractice.size}`}
          color={cacheHealthy ? "#059669" : "#D97706"}
          warning={cacheWarning}
          critical={cacheCritical}
        />
        <StatusPill
          label="Revenue"
          value={stats ? `₹${stats.revenue.toLocaleString("en-IN")}` : "—"}
          color="#4338CA"
        />
        <StatusPill
          label="Students"
          value={liveUsers > 0 ? `${liveUsers} online` : stats?.total ?? "—"}
          color="#059669"
        />
        <span style={{ marginLeft: "auto", ...S.lastRefresh }}>
          {lastRefresh ? `↻ ${lastRefresh.toLocaleTimeString("en-IN")}` : ""}
        </span>
      </div>

      {/* ── FILL PROGRESS STRIP ── */}
      {filling && fillProgress && (
        <div style={S.fillStrip}>
          <div style={S.fillDot} />
          {fillProgress.locked ? (
            <span>Fill lock active — another run in progress</span>
          ) : (
            <span>
              Filling cache · Mock{" "}
              <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fillProgress.mock ?? "…"}/{fillProgress.mockTarget}
              </strong>{" "}
              · QP{" "}
              <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fillProgress.qp ?? "…"}/{fillProgress.qpTarget}
              </strong>{" "}
              · {fillProgress.elapsed ?? 0}s elapsed
            </span>
          )}
        </div>
      )}

      {/* ── ZONE 2: COMMAND ROW ── */}
      <div style={S.commandRow}>
        <div style={S.commandLeft}>
          <button onClick={() => { loadData(); loadCacheStatus(); }} style={S.btnSmall()}>
            {loading ? <span style={S.spinner} /> : "↻ Refresh"}
          </button>
          <button onClick={runHealthCheck} style={S.btnSmall()}>
            {healthLoad ? <span style={S.spinner} /> : "Run Health Check"}
          </button>
          <button onClick={fillAllCache} style={S.btnSmall("primary")} disabled={filling}>
            {filling ? "Filling…" : "Fill Cache"}
          </button>
          <a
            href="https://console.firebase.google.com/project/vantiq-cuet/functions/logs"
            target="_blank"
            rel="noreferrer"
            style={{ ...S.btnSmall(), textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            View Logs ↗
          </a>
        </div>
      </div>

      {/* ── ZONE 3: KPI GRID ── */}
      <div style={{ ...S.kpiGrid }} className="kpi-grid">
        <KpiTile
          value={stats?.total}
          label="Total Students"
          sub="registered"
          accent="#4338CA"
          loading={loading && !stats}
        />
        <KpiTile
          value={stats?.paid}
          label="Paid Students"
          sub="unlocked"
          accent="#059669"
          loading={loading && !stats}
        />
        <KpiTile
          value={stats ? `${stats.convPct}%` : null}
          label="Conversion"
          sub="free → paid"
          accent="#D97706"
          loading={loading && !stats}
        />
        <KpiTile
          value={stats?.testsToday}
          label="Tests Today"
          sub="completed"
          accent="#0F2747"
          loading={loading && !stats}
        />
        <KpiTile
          value={stats ? `₹${stats.revenue.toLocaleString("en-IN")}` : null}
          label="Revenue"
          sub="total · ₹199/unlock"
          accent="#D97706"
          loading={loading && !stats}
        />
        <KpiTile
          value={liveUsers || "0"}
          label="Online Now"
          sub="last 5 min"
          accent="#059669"
          loading={false}
        />
      </div>

      {/* ── LIVE SECTION ── */}
      <div style={{ ...S.liveSection }} className="live-section">
        {/* Recent Activity */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>Recent Activity</span>
            <span style={{ fontSize: 10, color: "#94A3B8" }}>last 8 events</span>
          </div>
          {recentActivity.length === 0 ? (
            <div style={{ padding: "20px 14px", fontSize: 12, color: "#94A3B8" }}>No activity yet</div>
          ) : (
            recentActivity.map((a, i) => (
              <div
                key={i}
                style={{
                  ...S.tableRow(i % 2),
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 6,
                }}
              >
                <span>{a.icon}</span>
                <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0F2747" }}>
                  {trunc(a.email, 24)}
                </span>
                <span style={{ color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, whiteSpace: "nowrap" }}>
                  {a.time}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Student Breakdown */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>Student Breakdown</span>
            <span style={{ fontSize: 10, color: "#94A3B8" }}>sorted by Mock count</span>
          </div>
          <div
            style={{
              ...S.tableHeader,
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr",
            }}
          >
            <span>Email</span>
            <span style={{ textAlign: "center" }}>Mock</span>
            <span style={{ textAlign: "center" }}>QP</span>
            <span style={{ textAlign: "center" }}>Access</span>
            <span>Last Test</span>
          </div>
          {userBreakdown.length === 0 ? (
            <div style={{ padding: "16px 14px", fontSize: 12, color: "#94A3B8" }}>No students yet</div>
          ) : (
            userBreakdown.slice(0, 8).map((u, i) => (
              <div
                key={i}
                style={{
                  ...S.tableRow(i % 2),
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr",
                }}
              >
                <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0F2747" }}>
                  {trunc(u.email, 26)}
                </span>
                <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{u.mock}</span>
                <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{u.qp}</span>
                <span style={{ textAlign: "center" }}>
                  <span style={S.statusBadge(u.unlocked ? "paid" : "free")}>
                    {u.unlocked ? "Paid" : "Free"}
                  </span>
                </span>
                <span style={{ color: "#64748B", fontSize: 11 }}>{fmt(u.lastTest)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div style={S.tabBar}>
        {["students", "platform", "payments", "content", "settings"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={S.tabItem(activeTab === t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB PANELS
      ══════════════════════════════════════════════════════ */}

      {/* ── STUDENTS TAB ── */}
      {activeTab === "students" && (
        <div style={S.tabPanel}>
          {/* User Management */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>User Management</span>
            </div>
            <div style={{ padding: "14px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  style={{ ...S.input, maxWidth: 300 }}
                  placeholder="Search by email address"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookupUser()}
                />
                <button onClick={lookupUser} style={S.btnSmall("primary")}>
                  {lookupLoad ? <span style={S.spinner} /> : "Lookup"}
                </button>
              </div>

              {lookupResult && (
                <div
                  style={{
                    background: lookupResult.notFound ? "#FEF3C7" : "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    padding: 14,
                  }}
                >
                  {lookupResult.notFound ? (
                    <div style={{ color: "#D97706", fontSize: 12 }}>No user found with that email.</div>
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                        {[
                          ["Email", lookupResult.email],
                          ["UID", lookupResult.id?.slice(0, 16) + "…"],
                          ["Tests Used", lookupResult.testsUsed ?? 0],
                          ["Access", lookupResult.unlocked ? "Paid / Unlocked" : "Free"],
                          ["Last Test", fmt(lookupResult.lastTestAt)],
                          ["Joined", fmt(lookupResult.createdAt)],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <div style={{ fontSize: 10, textTransform: "uppercase", color: "#94A3B8", letterSpacing: "0.06em", marginBottom: 2 }}>{k}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, fontFamily: k === "UID" || k === "Tests Used" ? "'JetBrains Mono', monospace" : "inherit" }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {!lookupResult.unlocked ? (
                          <button onClick={() => grantAccess(lookupResult.id)} style={S.btnSmall("primary")}>
                            Grant Unlimited Access
                          </button>
                        ) : (
                          <button onClick={() => revokeAccess(lookupResult.id)} style={S.btnSmall("danger")}>
                            Revoke Access
                          </button>
                        )}
                        <button onClick={() => resetFreeLimit(lookupResult.id)} style={S.btnSmall()}>
                          Reset Free Limit
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Full student table */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>All Students · {userBreakdown.length}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 700 }}>
                <div
                  style={{
                    ...S.tableHeader,
                    gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1.5fr 1.5fr",
                  }}
                >
                  <span>Email</span>
                  <span style={{ textAlign: "center" }}>Mock</span>
                  <span style={{ textAlign: "center" }}>QP</span>
                  <span style={{ textAlign: "center" }}>Used</span>
                  <span style={{ textAlign: "center" }}>Access</span>
                  <span>Last Test</span>
                </div>
                {userBreakdown.length === 0 ? (
                  <div style={{ padding: "20px 14px", color: "#94A3B8", fontSize: 12 }}>No students yet</div>
                ) : (
                  userBreakdown.map((u, i) => (
                    <div
                      key={i}
                      style={{
                        ...S.tableRow(i % 2),
                        gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1.5fr 1.5fr",
                      }}
                    >
                      <span
                        style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0F2747", cursor: "pointer" }}
                        onClick={() => { setLookupEmail(u.email); setActiveTab("students"); }}
                      >
                        {trunc(u.email, 32)}
                      </span>
                      <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{u.mock}</span>
                      <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{u.qp}</span>
                      <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{u.testsUsed}</span>
                      <span style={{ textAlign: "center" }}>
                        <span style={S.statusBadge(u.unlocked ? "paid" : "free")}>
                          {u.unlocked ? "Paid" : "Free"}
                        </span>
                      </span>
                      <span style={{ color: "#64748B", fontSize: 11 }}>{fmt(u.lastTest)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent tests */}
          <div style={{ ...S.card, marginTop: 16 }}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Recent Tests · {recentTests.length}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 700 }}>
                <div
                  style={{
                    ...S.tableHeader,
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.5fr",
                  }}
                >
                  <span>Email</span>
                  <span>Mode</span>
                  <span style={{ textAlign: "center" }}>Score</span>
                  <span style={{ textAlign: "center" }}>Correct</span>
                  <span style={{ textAlign: "center" }}>Accuracy</span>
                  <span>Completed</span>
                </div>
                {recentTests.slice(0, 20).map((t, i) => (
                  <div
                    key={t.id}
                    style={{
                      ...S.tableRow(i % 2),
                      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.5fr",
                    }}
                  >
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {trunc(t.email || t.displayName, 30)}
                    </span>
                    <span>
                      <span style={S.statusBadge("info")}>{t.mode}</span>
                    </span>
                    <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{t.totalScore ?? "—"}</span>
                    <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{t.correct ?? "—"}</span>
                    <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>
                      {t.accuracy != null ? `${t.accuracy}%` : "—"}
                    </span>
                    <span style={{ color: "#64748B", fontSize: 11 }}>{fmt(t.completedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PLATFORM TAB ── */}
      {activeTab === "platform" && (
        <div style={S.tabPanel}>
          {/* Health Check */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Platform Health</span>
              <button onClick={runHealthCheck} style={S.btnSmall(healthData?.overallStatus !== "healthy" ? "primary" : "default")}>
                {healthLoad ? <span style={S.spinner} /> : "Run Health Check"}
              </button>
            </div>
            <div style={{ padding: 14 }}>
              {!healthData ? (
                <div style={{ color: "#94A3B8", fontSize: 12 }}>Run a health check to see results.</div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={S.statusBadge(healthData.overallStatus === "healthy" ? "healthy" : "critical")}>
                      {healthData.overallStatus?.toUpperCase()}
                    </span>
                    {healthData.autoFixed?.length > 0 && (
                      <span style={{ fontSize: 11, color: "#D97706" }}>
                        {healthData.autoFixed.length} issue(s) auto-fixed
                      </span>
                    )}
                    {healthData.warnings?.length > 0 && (
                      <span style={{ fontSize: 11, color: "#D97706" }}>
                        {healthData.warnings.length} warning(s)
                      </span>
                    )}
                  </div>
                  {healthData.checks &&
                    Object.entries(healthData.checks).map(([k, v]) => (
                      <div key={k} style={S.healthItem(v.ok)}>
                        <span>{v.ok ? "✓" : "✗"}</span>
                        <span style={{ fontWeight: 600 }}>{k}</span>
                        {v.message && <span style={{ color: "#64748B", fontSize: 11 }}>— {v.message}</span>}
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>

          {/* Cache Health */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Cache Health</span>
              <button onClick={fillAllCache} style={S.btnSmall("primary")} disabled={filling}>
                {filling ? "Filling…" : "Fill All Cache"}
              </button>
            </div>
            {Object.entries(CACHE_CONFIG).map(([mode, config]) => (
              <CacheBar
                key={mode}
                mode={mode}
                config={config}
                current={cacheStatus?.[mode]?.current ?? 0}
              />
            ))}
            <div style={{ padding: "10px 14px" }}>
              <button onClick={loadCacheStatus} style={S.btnSmall()}>
                Refresh Cache Status
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Platform Links</span>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["Firebase Console", "https://console.firebase.google.com/project/vantiq-cuet"],
                ["Netlify Dashboard", "https://app.netlify.com"],
                ["GitHub Actions", "https://github.com/casinghal/cuet-mock-platform/actions"],
                ["Razorpay Dashboard", "https://dashboard.razorpay.com"],
                ["GA4 Analytics", "https://analytics.google.com"],
                ["Live Platform", "https://vantiq-cuetmock.netlify.app"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...S.btnSmall(), textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                >
                  {label} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {activeTab === "payments" && (
        <div style={S.tabPanel}>
          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <KpiTile
              value={`₹${stats?.revenue.toLocaleString("en-IN") ?? "—"}`}
              label="Total Revenue"
              sub="₹199 × paid students"
              accent="#059669"
            />
            <KpiTile
              value={stats?.paid ?? "—"}
              label="Paid Students"
              sub="unlocked accounts"
              accent="#4338CA"
            />
            <KpiTile
              value={recentPay.length}
              label="Transactions"
              sub="in Firestore"
              accent="#D97706"
            />
          </div>

          {/* Transactions table */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Recent Payments · {recentPay.length}</span>
            </div>
            {recentPay.length === 0 ? (
              <div style={{ padding: "20px 14px", color: "#94A3B8", fontSize: 12 }}>No payment records</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 600 }}>
                  <div
                    style={{
                      ...S.tableHeader,
                      gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 1.5fr",
                    }}
                  >
                    <span>Order ID</span>
                    <span>Payment ID</span>
                    <span>UID</span>
                    <span style={{ textAlign: "center" }}>Amount</span>
                    <span>Date</span>
                  </div>
                  {recentPay.map((p, i) => (
                    <div
                      key={p.id}
                      style={{
                        ...S.tableRow(i % 2),
                        gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 1.5fr",
                      }}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                        {trunc(p.orderId, 20)}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                        {trunc(p.paymentId, 20)}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                        {trunc(p.uid, 14)}
                      </span>
                      <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>
                        ₹{p.amount ?? 199}
                      </span>
                      <span style={{ color: "#64748B", fontSize: 11 }}>{fmt(p.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONTENT TAB ── */}
      {activeTab === "content" && (
        <div style={S.tabPanel}>
          {/* Ratings summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <KpiTile value={avgRating} label="Avg Rating" sub="out of 5" accent="#D97706" />
            <KpiTile value={ratings.length} label="Total Ratings" sub="collected" accent="#4338CA" />
            <KpiTile value={feedback.length} label="Feedback Items" sub="received" accent="#0F2747" />
          </div>

          {/* Feedback insights */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Feedback Insights</span>
              <button onClick={genInsights} style={S.btnSmall("primary")}>
                Generate Insights
              </button>
            </div>
            <div style={{ padding: 14 }}>
              {!insights ? (
                <div style={{ color: "#94A3B8", fontSize: 12 }}>
                  Click "Generate Insights" to analyse recent feedback.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: "#0F2747", marginBottom: 12 }}>
                    {insights.summary}
                  </div>
                  {insights.insights?.map((ins, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 12,
                        padding: "6px 10px",
                        background: "#F8FAFC",
                        borderLeft: "3px solid #4338CA",
                        borderRadius: 4,
                        marginBottom: 6,
                        color: "#0F2747",
                      }}
                    >
                      {ins}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Raw feedback */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Raw Feedback · {feedback.length}</span>
            </div>
            {feedback.length === 0 ? (
              <div style={{ padding: "16px 14px", color: "#94A3B8", fontSize: 12 }}>No feedback yet</div>
            ) : (
              feedback.slice(0, 15).map((f, i) => (
                <div
                  key={f.id}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid #F1F5F9",
                    background: i % 2 ? "#FAFBFD" : "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#0F2747" }}>
                      {trunc(f.email, 30)}
                    </span>
                    <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmt(f.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5 }}>{f.text}</div>
                  {f.page && (
                    <span style={{ fontSize: 10, color: "#94A3B8" }}>page: {f.page}</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Intelligence */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>CUET Intelligence</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => updateIntelligence("English")}
                  style={S.btnSmall()}
                  disabled={intelGenLoad}
                >
                  {intelGenLoad ? <span style={S.spinner} /> : "Update English"}
                </button>
                <button
                  onClick={() => updateIntelligence("GAT")}
                  style={S.btnSmall()}
                  disabled={intelGenLoad}
                >
                  Update GAT
                </button>
              </div>
            </div>
            <div style={{ padding: 14 }}>
              {/* Coverage pills */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "English 101", color: "#059669" },
                  { label: "GAT — coming", color: "#D97706" },
                  { label: "Economics — coming", color: "#D97706" },
                ].map((c) => (
                  <span
                    key={c.label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 10px",
                      background: `${c.color}18`,
                      border: `1px solid ${c.color}40`,
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      color: c.color,
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color }} />
                    {c.label}
                  </span>
                ))}
              </div>
              {!intel || intel.length === 0 ? (
                <div style={{ color: "#94A3B8", fontSize: 12 }}>No intelligence data loaded.</div>
              ) : (
                intel.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "10px 12px",
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{item.subject}</span>
                      <span style={{ fontSize: 10, color: "#94A3B8" }}>Updated {fmt(item.updatedAt)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5 }}>
                      {trunc(item.preview, 180)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === "settings" && (
        <div style={S.tabPanel}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            {/* Change Admin Password */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>Admin Access</span>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
                  Admin password is set via{" "}
                  <code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: 4 }}>
                    VITE_ADMIN_PASSWORD
                  </code>{" "}
                  in Netlify environment variables.
                </div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>
                  To rotate: Netlify → Site Config → Environment Variables → update{" "}
                  <code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: 4 }}>VITE_ADMIN_PASSWORD</code>{" "}
                  → trigger redeploy.
                </div>
              </div>
            </div>

            {/* Firebase auth status */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>Firebase Status</span>
              </div>
              <div style={{ padding: 14 }}>
                {fbUser ? (
                  <>
                    <div style={{ fontSize: 12, color: "#059669", marginBottom: 8, fontWeight: 600 }}>
                      ✓ Signed in as {fbUser.email}
                    </div>
                    <button onClick={() => signOut(auth)} style={S.btnSmall("danger")}>
                      Sign out of Firebase
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: "#D97706", marginBottom: 8 }}>
                      Not signed in — Firestore reads disabled
                    </div>
                    <button
                      onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                      style={S.btnSmall("primary")}
                    >
                      Sign in with Google
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Activity log */}
          <div style={{ ...S.card, marginTop: 16 }}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Activity Log · this session</span>
              <button onClick={() => setLogs([])} style={S.btnSmall()}>Clear</button>
            </div>
            <div
              style={{
                maxHeight: 320,
                overflowY: "auto",
                padding: "8px 0",
              }}
            >
              {logs.length === 0 ? (
                <div style={{ padding: "12px 14px", color: "#94A3B8", fontSize: 12 }}>No activity this session</div>
              ) : (
                logs.map((entry, i) => (
                  <div key={i} style={S.logEntry(entry.type)}>
                    {entry.text}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Platform info */}
          <div style={{ ...S.card, marginTop: 16 }}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Platform Info</span>
            </div>
            <div style={{ padding: 14 }}>
              {[
                ["Platform", "Vantiq CUET Mock Test"],
                ["Live URL", "vantiq-cuetmock.netlify.app"],
                ["Firebase Project", "vantiq-cuet"],
                ["CF Region", "us-central1"],
                ["Node.js (Functions)", "20"],
                ["Frontend", "React (Vite) · Netlify"],
                ["Auth", "Firebase Auth · Google only"],
                ["Payments", "Razorpay · ₹199 one-time"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "5px 0",
                    borderBottom: "1px solid #F1F5F9",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "#94A3B8", fontWeight: 600 }}>{k}</span>
                  <span style={{ color: "#0F2747", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom spacer */}
      <div style={{ height: 40 }} />
    </div>
  );
}
