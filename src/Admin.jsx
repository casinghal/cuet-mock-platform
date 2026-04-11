import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut,
} from "firebase/auth";
import {
  getFirestore, collection, getDocs, query, orderBy, limit, where, setDoc, doc,
} from "firebase/firestore";

// ─── Firebase init ────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};
const fbApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth  = getAuth(fbApp);
const db    = getFirestore(fbApp);

const CF_BASE       = import.meta.env.VITE_CLOUD_FUNCTION_BASE;
const ADMIN_KEY     = import.meta.env.VITE_ADMIN_KEY;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";

// ─── Cache config ─────────────────────────────────────────────────────────────
const CACHE_CONFIG = {
  Mock:          { size: 120, threshold: 100, label: "Mock Cache"     },
  QuickPractice: { size: 200, threshold: 160, label: "QP Cache"       },
  GAT_Mock:      { size: 80,  threshold: 60,  label: "GAT Mock Cache" },
  GAT_QP:        { size: 150, threshold: 120, label: "GAT QP Cache"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return "—";
  const dt = d?.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
    ", " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};
const trunc = (str, n) => str && str.length > n ? str.slice(0, n) + "…" : str || "—";
const cfFetch = async (path, body = {}) => {
  if (!CF_BASE)   throw new Error("VITE_CLOUD_FUNCTION_BASE not set in Netlify env vars");
  if (!ADMIN_KEY) throw new Error("VITE_ADMIN_KEY not set in Netlify env vars");
  const res = await fetch(`${CF_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const D = {
  bg:       "#07090F",
  surface:  "#0C1120",
  surfaceAlt: "#0A0E1A",
  border:   "rgba(255,255,255,0.07)",
  borderBright: "rgba(255,255,255,0.13)",
  cyan:     "#00C9A7",
  indigo:   "#818CF8",
  amber:    "#FBBF24",
  red:      "#F87171",
  green:    "#34D399",
  gold:     "#F59E0B",
  textPrimary:   "#E2E8F0",
  textSecondary: "#64748B",
  textMuted:     "#1E293B",
  glowCyan:  "0 0 14px rgba(0,201,167,0.28)",
  glowRed:   "0 0 14px rgba(248,113,113,0.35)",
  glowAmber: "0 0 14px rgba(251,191,36,0.28)",
  glowGreen: "0 0 14px rgba(52,211,153,0.25)",
};

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${D.bg}; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #0C1120; }
  ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #334155; }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
  @keyframes glow-r  { 0%,100% { box-shadow: 0 0 6px rgba(248,113,113,0.4); } 50% { box-shadow: 0 0 18px rgba(248,113,113,0.7); } }
  @keyframes glow-a  { 0%,100% { box-shadow: 0 0 6px rgba(251,191,36,0.35); } 50% { box-shadow: 0 0 16px rgba(251,191,36,0.6); } }
  @keyframes shimmer { 0%,100% { opacity:0.4; } 50% { opacity:0.8; } }
  @keyframes fadeIn  { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
  .cmd-btn { transition: all 0.15s; }
  .cmd-btn:hover { opacity: 0.82; transform: translateY(-1px); }
  .tab-btn { transition: all 0.15s; background: none; border: none; cursor: pointer; }
  .row-hover:hover { background: rgba(255,255,255,0.03) !important; }
  .kpi-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 10px; }
  .live-grid { display: grid; grid-template-columns: 44% 56%; gap: 10px; }
  .pay-grid  { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  .rating-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  @media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(3,1fr); } }
  @media (max-width: 860px)  { .kpi-grid { grid-template-columns: repeat(2,1fr); } .live-grid { grid-template-columns: 1fr; } }
`;

// ─── Reusable primitives ──────────────────────────────────────────────────────
const Spinner = () => (
  <span style={{ display:"inline-block", width:12, height:12, border:`2px solid rgba(255,255,255,0.15)`, borderTop:`2px solid ${D.cyan}`, borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
);

const Tag = ({ children, type = "info" }) => {
  const map = {
    healthy: { bg:"rgba(52,211,153,0.12)",  color:D.green,  border:"rgba(52,211,153,0.25)"  },
    warn:    { bg:"rgba(251,191,36,0.12)",  color:D.amber,  border:"rgba(251,191,36,0.25)"  },
    critical:{ bg:"rgba(248,113,113,0.12)", color:D.red,    border:"rgba(248,113,113,0.25)" },
    info:    { bg:"rgba(129,140,248,0.12)", color:D.indigo, border:"rgba(129,140,248,0.25)" },
    paid:    { bg:"rgba(52,211,153,0.12)",  color:D.green,  border:"rgba(52,211,153,0.25)"  },
    free:    { bg:"rgba(100,116,139,0.15)", color:"#94A3B8", border:"rgba(100,116,139,0.2)" },
    mock:    { bg:"rgba(129,140,248,0.12)", color:D.indigo, border:"rgba(129,140,248,0.25)" },
  };
  const t = map[type] || map.info;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:t.bg, color:t.color, border:`1px solid ${t.border}`, letterSpacing:"0.04em" }}>
      {children}
    </span>
  );
};

const Btn = ({ children, onClick, variant = "default", disabled, style: extra = {}, href, target }) => {
  const variants = {
    default: { background:"rgba(255,255,255,0.06)", color:D.textPrimary,   border:`1px solid ${D.border}` },
    primary: { background:D.indigo,                 color:"#fff",           border:"none"                  },
    cyan:    { background:D.cyan,                   color:"#07090F",        border:"none"                  },
    danger:  { background:"rgba(248,113,113,0.12)", color:D.red,           border:`1px solid rgba(248,113,113,0.3)` },
    ghost:   { background:"transparent",            color:D.textSecondary,  border:`1px solid ${D.border}` },
    perm:    { background:"rgba(127,29,29,0.4)",   color:"#FCA5A5",        border:`1px solid rgba(248,113,113,0.3)` },
  };
  const v = variants[variant] || variants.default;
  const base = {
    height: 30, padding:"0 12px", borderRadius:6, fontSize:11, fontWeight:700,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
    display:"inline-flex", alignItems:"center", gap:5, whiteSpace:"nowrap",
    fontFamily:"'Sora',sans-serif", textDecoration:"none", transition:"all 0.15s",
    ...v, ...extra,
  };
  if (href) return <a href={href} target={target} rel="noreferrer" style={base} className="cmd-btn">{children}</a>;
  return <button onClick={onClick} disabled={disabled} style={base} className="cmd-btn">{children}</button>;
};

// ─── KPI tile ─────────────────────────────────────────────────────────────────
function KpiTile({ value, label, sub, accent = D.cyan, loading, alert }) {
  return (
    <div style={{
      background: D.surface, borderRadius:10, padding:"14px 16px",
      border:`1px solid ${alert ? "rgba(248,113,113,0.4)" : D.border}`,
      borderTop:`2px solid ${accent}`,
      boxShadow: alert ? D.glowRed : "none",
      animation: alert ? "glow-r 2s ease-in-out infinite" : "none",
      minWidth:0,
    }}>
      {loading
        ? <div style={{ height:28, background:"rgba(255,255,255,0.06)", borderRadius:4, animation:"shimmer 1.2s infinite" }} />
        : <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:24, fontWeight:700, color: alert ? D.red : D.textPrimary, lineHeight:1 }}>{value ?? "—"}</div>
      }
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:D.textSecondary, marginTop:5 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

// ─── Status pill for header ───────────────────────────────────────────────────
function HPill({ label, value, state = "ok" }) {
  const map = {
    ok:       { dot: D.cyan,  bg:"rgba(0,201,167,0.1)",   border:"rgba(0,201,167,0.2)",   text:D.textPrimary },
    warn:     { dot: D.amber, bg:"rgba(251,191,36,0.1)",  border:"rgba(251,191,36,0.25)", text:D.amber       },
    critical: { dot: D.red,   bg:"rgba(248,113,113,0.12)",border:"rgba(248,113,113,0.3)", text:D.red         },
    muted:    { dot:"#334155",bg:"rgba(255,255,255,0.04)", border:D.border,               text:D.textSecondary},
  };
  const m = map[state];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 9px", background:m.bg, border:`1px solid ${m.border}`, borderRadius:20, fontSize:10, fontWeight:600, color:m.text, whiteSpace:"nowrap" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.dot, flexShrink:0, animation: state==="critical"?"pulse 1s infinite": state==="warn"?"pulse 2s infinite":"none" }} />
      <span style={{ color:D.textSecondary, marginRight:2 }}>{label}</span>
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>{value}</span>
    </span>
  );
}

// ─── Cache bar ────────────────────────────────────────────────────────────────
function CacheBar({ mode, config, current }) {
  const pct       = Math.min(100, Math.round((current / config.size) * 100));
  const isCritical = current < config.threshold * 0.5;
  const isWarning  = current < config.threshold && !isCritical;
  const color      = isCritical ? D.red : isWarning ? D.amber : D.cyan;
  const glow       = isCritical ? D.glowRed : isWarning ? D.glowAmber : "none";
  return (
    <div style={{ padding:"10px 16px", borderBottom:`1px solid ${D.border}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <span style={{ fontSize:11, fontWeight:600, color:D.textPrimary }}>{config.label}</span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700, color }}>
          {current}/{config.size}
        </span>
      </div>
      <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:4, height:5, overflow:"hidden", position:"relative" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:4, transition:"width 0.6s", boxShadow:glow }} />
        <div style={{ position:"absolute", top:0, left:`${(config.threshold/config.size)*100}%`, width:1, height:"100%", background:D.amber, opacity:0.6 }} />
      </div>
      <div style={{ fontSize:9, color:D.textSecondary, marginTop:3, fontFamily:"'JetBrains Mono',monospace" }}>
        threshold {config.threshold} · {isWarning||isCritical ? `⚠ ${config.threshold-current} below` : "✓ healthy"}
      </div>
    </div>
  );
}

// ─── Card shell ───────────────────────────────────────────────────────────────
const Card = ({ children, style: extra = {}, accent }) => (
  <div style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:10, overflow:"hidden", ...(accent?{borderTop:`2px solid ${accent}`}:{}), ...extra }}>
    {children}
  </div>
);

const CardHead = ({ title, right }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:`1px solid ${D.border}`, gap:8 }}>
    <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:D.textSecondary }}>{title}</span>
    {right && <div style={{ display:"flex", gap:6, alignItems:"center" }}>{right}</div>}
  </div>
);

// ─── Table primitives ─────────────────────────────────────────────────────────
const THead = ({ cols, template }) => (
  <div style={{ display:"grid", gridTemplateColumns:template, padding:"6px 14px", borderBottom:`1px solid ${D.border}`, background:D.surfaceAlt }}>
    {cols.map((c,i) => (
      <span key={i} style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:D.textSecondary, textAlign:typeof c==="object"?c.align||"left":"left" }}>
        {typeof c==="object"?c.label:c}
      </span>
    ))}
  </div>
);

const TRow = ({ cells, template, highlight }) => (
  <div
    className="row-hover"
    style={{ display:"grid", gridTemplateColumns:template, padding:"0 14px", height:34, alignItems:"center", borderBottom:`1px solid ${D.border}`, background: highlight?"rgba(248,113,113,0.06)":"transparent" }}
  >
    {cells}
  </div>
);

// ─── Log line ─────────────────────────────────────────────────────────────────
const LogLine = ({ entry }) => {
  const colors = { error:D.red, warn:D.amber, success:D.cyan, info:"#475569" };
  const borders = { error:D.red, warn:D.amber, success:D.cyan, info:"#1E293B" };
  return (
    <div style={{ padding:"3px 14px", fontSize:10, fontFamily:"'JetBrains Mono',monospace", color:colors[entry.type]||colors.info, borderLeft:`2px solid ${borders[entry.type]||borders.info}`, marginBottom:1 }}>
      {entry.text}
    </div>
  );
};

// ─── Health check item ────────────────────────────────────────────────────────
const HealthRow = ({ name, ok, message }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:`1px solid ${D.border}`, fontSize:11 }}>
    <span style={{ color: ok ? D.cyan : D.red, fontWeight:700, width:14, textAlign:"center", flexShrink:0 }}>{ok?"✓":"✗"}</span>
    <span style={{ fontWeight:600, color:D.textPrimary }}>{name}</span>
    {message && <span style={{ color:D.textSecondary, fontSize:10 }}>— {message}</span>}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const [password,  setPassword]  = useState("");
  const [authed,    setAuthed]    = useState(false);
  const [pwError,   setPwError]   = useState("");
  const [fbUser,    setFbUser]    = useState(null);
  const [fbLoading, setFbLoading] = useState(true);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [stats,         setStats]         = useState(null);
  const [recentTests,   setRecentTests]   = useState([]);
  const [recentPay,     setRecentPay]     = useState([]);
  const [feedback,      setFeedback]      = useState([]);
  const [ratings,       setRatings]       = useState([]);
  const [userBreakdown, setUserBreakdown] = useState([]);
  const [liveUsers,     setLiveUsers]     = useState(0);
  const [insights,      setInsights]      = useState(null);
  const [intel,         setIntel]         = useState(null);
  const [intelLoad,     setIntelLoad]     = useState(false);
  const [gatCALoad,     setGatCALoad]     = useState(false);
  const [gatCAResult,   setGatCAResult]   = useState(null);
  const [intelGenLoad,  setIntelGenLoad]  = useState(false);

  // ── Cache ───────────────────────────────────────────────────────────────────
  const [cacheStatus,  setCacheStatus]  = useState(null);
  const [filling,      setFilling]      = useState(false);
  const [fillProgress, setFillProgress] = useState(null);
  const fillPollRef  = useRef(null);
  const fillStartRef = useRef(null);
  const stalePollsRef = useRef(0);

  // ── Health ──────────────────────────────────────────────────────────────────
  const [healthData, setHealthData] = useState(null);
  const [healthLoad, setHealthLoad] = useState(false);

  // ── UI ──────────────────────────────────────────────────────────────────────
  const [activeTab,   setActiveTab]   = useState("students");
  const [loading,     setLoading]     = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [logs,        setLogs]        = useState([]);

  // ── User management ─────────────────────────────────────────────────────────
  const [lookupEmail,  setLookupEmail]  = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoad,   setLookupLoad]   = useState(false);
  const [anomalies,    setAnomalies]    = useState([]);
  const [anomalyLoad,  setAnomalyLoad]  = useState(false);
  const [anomalyTs,    setAnomalyTs]    = useState(null);
  const [blockLoad,    setBlockLoad]    = useState(null);
  const [adminNotes,   setAdminNotes]   = useState("");
  const [notesUid,     setNotesUid]     = useState(null);
  const [newPw,        setNewPw]        = useState("");
  const [pwMsg,        setPwMsg]        = useState("");

  const statusPollRef = useRef(null);

  // ── Logging ─────────────────────────────────────────────────────────────────
  const addLog = useCallback((msg, type = "info") => {
    const ts = new Date().toLocaleTimeString("en-IN");
    setLogs(prev => [{ text:`[${ts}] ${msg}`, type }, ...prev.slice(0, 39)]);
  }, []);

  // ── Firebase auth ───────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setFbUser(u); setFbLoading(false); });
    return unsub;
  }, []);

  const handlePassword = () => {
    if (password === ADMIN_PASSWORD) { setAuthed(true); setPwError(""); }
    else setPwError("Incorrect password.");
  };

  // ── Load Firestore data ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!fbUser) return;
    setLoading(true);
    addLog("Loading dashboard data...");
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map(d => ({ id:d.id, ...d.data() }));
      const total  = users.length;
      const paid   = users.filter(u => u.unlocked).length;
      const revenue = paid * 199;
      const convPct = total > 0 ? ((paid/total)*100).toFixed(1) : "0.0";

      const today = new Date(); today.setHours(0,0,0,0);
      const testsQ    = query(collection(db,"tests"), orderBy("completedAt","desc"), limit(50));
      const testsSnap = await getDocs(testsQ);
      const allTests  = testsSnap.docs.map(d => ({ id:d.id, ...d.data() }));
      const todayTests = allTests.filter(t => {
        const d = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt||0);
        return d >= today;
      });

      const userMap = {};
      users.forEach(u => { userMap[u.id] = { email:u.email||u.displayName||u.id, mock:0, qp:0, unlocked:u.unlocked, lastTest:u.lastTestAt, testsUsed:u.testsUsed||0, blocked:!!u.blocked||!!(u.blockedUntil&&(u.blockedUntil.toDate?u.blockedUntil.toDate():new Date(u.blockedUntil))>new Date()), blockCount:u.blockCount||0 }; });
      allTests.forEach(t => { if (userMap[t.uid]) { if (t.mode==="Mock") userMap[t.uid].mock++; else userMap[t.uid].qp++; } });
      const breakdown = Object.values(userMap).sort((a,b)=>b.mock-a.mock).slice(0,50);

      setUserBreakdown(breakdown);
      setRecentTests(allTests.slice(0,30));
      setStats({ total, paid, revenue, convPct, testsToday:todayTests.length });

      try { const pQ=query(collection(db,"payments"),orderBy("createdAt","desc"),limit(20)); setRecentPay((await getDocs(pQ)).docs.map(d=>({id:d.id,...d.data()}))); } catch(e){addLog("Payments: "+e.message,"warn");}
      try { const fQ=query(collection(db,"feedback"),orderBy("createdAt","desc"),limit(30));  setFeedback((await getDocs(fQ)).docs.map(d=>({id:d.id,...d.data()}))); } catch(e){addLog("Feedback: "+e.message,"warn");}
      try { const rQ=query(collection(db,"ratings"),orderBy("createdAt","desc"),limit(100));  setRatings((await getDocs(rQ)).docs.map(d=>({id:d.id,...d.data()}))); } catch(e){addLog("Ratings: "+e.message,"warn");}
      try {
        const pQ=query(collection(db,"presence")); const pSnap=await getDocs(pQ);
        const ago=new Date(Date.now()-5*60*1000);
        setLiveUsers(pSnap.docs.filter(d=>{const ls=d.data().lastSeen?.toDate?d.data().lastSeen.toDate():null;return ls&&ls>ago;}).length);
      } catch(e){ setLiveUsers(0); }
      try { const iQ=query(collection(db,"cuetIntelligence"),limit(5)); setIntel((await getDocs(iQ)).docs.map(d=>({id:d.id,...d.data()}))); } catch(e){addLog("Intel: "+e.message,"warn");}

      setLastRefresh(new Date());
      addLog(`Loaded: ${total} users · ${allTests.length} tests · ${paid} paid`,"success");
    } catch(e) { addLog("Load error: "+e.message,"error"); }
    finally { setLoading(false); }
  }, [fbUser, addLog]);

  // ── Cache ───────────────────────────────────────────────────────────────────
  const loadCacheStatus = useCallback(async (silent=false) => {
    try {
      const data = await cfFetch("getCacheStatus");
      setCacheStatus(data?.status||null);
      return data?.status||null;
    } catch(e) {
      if (!silent) addLog("Cache status: "+e.message,"warn");
      return null;
    }
  }, [addLog]);

  const fillAllCache = useCallback(async () => {
    if (filling) { addLog("Fill already in progress","warn"); return; }
    setFilling(true); fillStartRef.current=Date.now(); stalePollsRef.current=0;
    addLog("Starting cache fill...");
    try {
      const res = await cfFetch("triggerCacheWarm",{});
      if (res?.locked) {
        addLog(`Fill lock active since ${res.lockedSince?new Date(res.lockedSince).toLocaleTimeString("en-IN"):"recently"}`,"info");
        setFillProgress({ locked:true, mock:res.status?.Mock?.current??0, qp:res.status?.QuickPractice?.current??0, mockTarget:CACHE_CONFIG.Mock.size, qpTarget:CACHE_CONFIG.QuickPractice.size, elapsed:0 });
      } else {
        addLog("Cache fill started","success");
        setFillProgress({ started:true });
      }
    } catch(e) { addLog("triggerCacheWarm: "+e.message,"error"); setFilling(false); return; }

    fillPollRef.current = setInterval(async () => {
      const elapsed = Math.round((Date.now()-fillStartRef.current)/1000);
      const status  = await loadCacheStatus(true);
      if (status) {
        const mC=status.Mock?.current??0, qC=status.QuickPractice?.current??0;
        const mF=mC>=CACHE_CONFIG.Mock.size, qF=qC>=CACHE_CONFIG.QuickPractice.size;
        setFillProgress({ mock:mC, qp:qC, mockTarget:CACHE_CONFIG.Mock.size, qpTarget:CACHE_CONFIG.QuickPractice.size, elapsed, locked:status.locked });
        if (mC===fillProgress?.mock && qC===fillProgress?.qp) stalePollsRef.current++;
        else stalePollsRef.current=0;
        if ((mF&&qF)||stalePollsRef.current>=8||elapsed>570) {
          clearInterval(fillPollRef.current); setFilling(false); setFillProgress(null);
          addLog(mF&&qF?"Cache full — all modes at target":"Fill cycle ended — check status", mF&&qF?"success":"warn");
        }
      }
    }, 15000);
  }, [filling, loadCacheStatus, fillProgress, addLog]);

  const checkAndFill = useCallback(async () => {
    const status = await loadCacheStatus(true);
    if (!status) return;
    const needsFill =
      (status.Mock?.current??0)<CACHE_CONFIG.Mock.threshold ||
      (status.QuickPractice?.current??0)<CACHE_CONFIG.QuickPractice.threshold ||
      (status.GAT_Mock?.current??0)<CACHE_CONFIG.GAT_Mock.threshold ||
      (status.GAT_QP?.current??0)<CACHE_CONFIG.GAT_QP.threshold;
    if (needsFill) { addLog("Cache below threshold — auto-fill in 1.5s","warn"); setTimeout(fillAllCache,1500); }
  }, [loadCacheStatus, fillAllCache, addLog]);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authed&&fbUser) { loadData(); checkAndFill(); setTimeout(()=>runAnomalyDetection(),4000); }
    else if (authed&&!fbUser&&!fbLoading) { loadCacheStatus(); }
  }, [authed,fbUser,fbLoading]);

  useEffect(() => {
    if (!authed) return;
    statusPollRef.current = setInterval(()=>loadCacheStatus(),60000);
    return () => clearInterval(statusPollRef.current);
  }, [authed,loadCacheStatus]);

  useEffect(() => () => { clearInterval(fillPollRef.current); clearInterval(statusPollRef.current); }, []);

  // ── Platform actions ────────────────────────────────────────────────────────
  const runHealthCheck = async () => {
    setHealthLoad(true); addLog("Running health check...");
    try {
      const data = await cfFetch("platformHealthCheck");
      setHealthData(data);
      addLog(`Health: ${data.overallStatus} · ${data.autoFixed?.length||0} auto-fixed`, data.overallStatus==="healthy"?"success":"warn");
    } catch(e) { addLog("Health check: "+e.message,"error"); }
    finally { setHealthLoad(false); }
  };

  const genInsights = async () => {
    addLog("Generating feedback insights...");
    try { const data=await cfFetch("generateFeedbackInsights"); setInsights(data); addLog("Insights generated","success"); }
    catch(e) { addLog("Insights: "+e.message,"error"); }
  };

  const updateIntelligence = async (subject) => {
    setIntelGenLoad(true); addLog(`Updating intelligence: ${subject}...`);
    try { await cfFetch("updateCuetIntelligence",{subject}); addLog(`Intelligence updated: ${subject}`,"success"); await loadData(); }
    catch(e) { addLog("Intelligence: "+e.message,"error"); }
    finally { setIntelGenLoad(false); }
  };

  const runGATCARefresh = async () => {
    if (gatCALoad) return; setGatCALoad(true); addLog("Refreshing GAT current affairs...");
    try { const data=await cfFetch("refreshGATCurrentAffairs",{}); setGatCAResult(data); addLog(`GAT CA refreshed — v${data.refreshVersion}, ${data.cacheInvalidated} sets cleared`,"success"); }
    catch(e) { addLog("GAT CA: "+e.message,"error"); }
    finally { setGatCALoad(false); }
  };

  // ── User management ─────────────────────────────────────────────────────────
  const lookupUser = async () => {
    if (!lookupEmail.trim()) return; setLookupLoad(true); setLookupResult(null);
    try {
      const q=query(collection(db,"users"),where("email","==",lookupEmail.trim().toLowerCase()),limit(1));
      const snap=await getDocs(q);
      setLookupResult(snap.empty?{notFound:true}:{id:snap.docs[0].id,...snap.docs[0].data()});
    } catch(e) { addLog("Lookup: "+e.message,"error"); }
    finally { setLookupLoad(false); }
  };

  const runAnomalyDetection = async () => {
    setAnomalyLoad(true);
    try {
      const data=await cfFetch("detectAnomalies");
      setAnomalies(data.flags||[]); setAnomalyTs(new Date());
      if (data.autoBlocked?.length) data.autoBlocked.forEach(u=>addLog(`AUTO-BLOCKED ${u.email} — ${u.isPermanent?"PERMANENT":"1hr"} (offense #${u.blockCount})`,"error"));
      addLog(`Anomaly scan: ${data.flags?.length||0} flag(s), ${data.autoBlocked?.length||0} auto-blocked`, data.flags?.length?"warn":"success");
    } catch(e) { addLog("Anomaly scan: "+e.message,"error"); }
    finally { setAnomalyLoad(false); }
  };

  const blockUser = async (uid, email, duration, reason) => {
    setBlockLoad(uid);
    try {
      const data=await cfFetch("blockUser",{uid,duration,reason});
      addLog(`${duration==="unblock"?"Unblocked":duration==="permanent"?"PERM BLOCKED":"Blocked 1hr"}: ${email} (#${data.blockCount||1})`, duration==="unblock"?"success":"error");
      setLookupResult(p=>p?{...p,blocked:duration==="permanent",blockedUntil:duration==="1h"?new Date(Date.now()+3600000):null,blockCount:data.blockCount||1}:p);
      setAnomalies(prev=>prev.filter(a=>a.uid!==uid));
    } catch(e) { addLog("Block: "+e.message,"error"); }
    finally { setBlockLoad(null); }
  };

  const deleteUser = async (uid, email) => {
    if (!window.confirm(`Permanently delete ${email}? Removes ALL tests, payments, auth. Cannot be undone.`)) return;
    setBlockLoad(uid);
    try { const data=await cfFetch("deleteUser",{uid}); addLog(`DELETED: ${email} — ${data.testsDeleted} tests, ${data.paymentsDeleted} payments`,"error"); setLookupResult(null); loadData(); }
    catch(e) { addLog("Delete: "+e.message,"error"); }
    finally { setBlockLoad(null); }
  };

  const saveAdminNotes = async (uid, notes) => {
    try { await setDoc(doc(db,"users",uid),{adminNotes:notes},{merge:true}); addLog(`Notes saved for ${uid.slice(0,8)}`,"success"); setLookupResult(p=>p?{...p,adminNotes:notes}:p); }
    catch(e) { addLog("Notes: "+e.message,"error"); }
  };

  const grantAccess   = async uid => { try { await setDoc(doc(db,"users",uid),{unlocked:true,unlockedAt:new Date()},{merge:true}); addLog(`Granted access: ${uid}`,"success"); setLookupResult(p=>({...p,unlocked:true})); } catch(e){addLog("grantAccess: "+e.message,"error");} };
  const revokeAccess  = async uid => { try { await setDoc(doc(db,"users",uid),{unlocked:false},{merge:true}); addLog(`Revoked access: ${uid}`,"warn"); setLookupResult(p=>({...p,unlocked:false})); } catch(e){addLog("revokeAccess: "+e.message,"error");} };
  const resetFreeLimit= async uid => { try { await setDoc(doc(db,"users",uid),{testsUsed:0},{merge:true}); addLog(`Reset free limit: ${uid}`,"success"); setLookupResult(p=>({...p,testsUsed:0})); } catch(e){addLog("resetFreeLimit: "+e.message,"error");} };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const avgRating = ratings.length>0 ? (ratings.reduce((a,r)=>a+(r.stars||0),0)/ratings.length).toFixed(1) : "—";
  const recentActivity = recentTests.slice(0,10).map(t=>({ email:t.email||t.displayName||t.uid?.slice(0,10), label:`${t.mode} · ${t.totalScore??0}pts`, time:fmt(t.completedAt), icon:t.mode==="Mock"?"▣":"▷" }));
  const mockCurrent    = cacheStatus?.Mock?.current          ?? "—";
  const qpCurrent      = cacheStatus?.QuickPractice?.current ?? "—";
  const gatMockCurrent = cacheStatus?.GAT_Mock?.current      ?? "—";
  const gatQPCurrent   = cacheStatus?.GAT_QP?.current        ?? "—";
  const cacheHealthy   = cacheStatus && mockCurrent>=CACHE_CONFIG.Mock.threshold && qpCurrent>=CACHE_CONFIG.QuickPractice.threshold;
  const cacheWarn      = cacheStatus && !cacheHealthy && mockCurrent>=CACHE_CONFIG.Mock.threshold*0.5;
  const cacheCrit      = cacheStatus && !cacheHealthy && !cacheWarn;
  const platformStatus = healthData?.overallStatus ?? "unknown";
  const pillState      = (cur, threshold) => typeof cur==="number" ? cur<threshold*0.5?"critical":cur<threshold?"warn":"ok" : "muted";

  // ════════════════════════════════════════════════════════════════
  // PASSWORD GATE
  // ════════════════════════════════════════════════════════════════
  if (!authed) return (
    <div style={{ minHeight:"100vh", background:D.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Sora',sans-serif" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:16, padding:40, width:360, animation:"fadeIn 0.3s ease" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:D.cyan, boxShadow:D.glowCyan }} />
          <span style={{ color:D.textPrimary, fontWeight:800, fontSize:16 }}>Vantiq CUET · Admin</span>
          <span style={{ marginLeft:"auto", background:"rgba(52,211,153,0.12)", color:D.cyan, fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:20, border:`1px solid rgba(52,211,153,0.25)`, letterSpacing:"0.06em" }}>LIVE</span>
        </div>
        <div style={{ color:D.textSecondary, fontSize:11, marginBottom:24, lineHeight:1.5 }}>Control centre — authorised access only</div>
        <input
          type="password" placeholder="Admin password" value={password}
          onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handlePassword()}
          style={{ width:"100%", height:38, background:"rgba(255,255,255,0.05)", border:`1px solid ${D.border}`, borderRadius:8, padding:"0 14px", fontSize:13, fontFamily:"'Sora',sans-serif", color:D.textPrimary, outline:"none", marginBottom:10 }}
        />
        {pwError && <div style={{ color:D.red, fontSize:11, marginBottom:10 }}>{pwError}</div>}
        <button onClick={handlePassword} style={{ width:"100%", height:40, background:D.cyan, color:"#07090F", border:"none", borderRadius:8, fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"'Sora',sans-serif" }}>
          Enter Dashboard
        </button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // MAIN DASHBOARD
  // ════════════════════════════════════════════════════════════════
  const TABS = ["students","platform","payments","content","settings"];

  return (
    <div style={{ fontFamily:"'Sora',sans-serif", background:D.bg, minHeight:"100vh", color:D.textPrimary }}>
      <style>{GLOBAL_CSS}</style>

      {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
      <div style={{ position:"sticky", top:0, zIndex:100, background:"#090C18", borderBottom:`1px solid ${D.border}`, height:52, display:"flex", alignItems:"center", padding:"0 16px", gap:10 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:8, flexShrink:0 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:D.cyan, boxShadow:D.glowCyan }} />
          <span style={{ fontWeight:800, fontSize:13, color:D.textPrimary, letterSpacing:"0.02em" }}>Vantiq · Admin</span>
          <span style={{ background:"rgba(52,211,153,0.1)", color:D.cyan, fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:20, border:`1px solid rgba(52,211,153,0.2)`, letterSpacing:"0.08em" }}>LIVE</span>
        </div>

        {/* Status pills — inline in header */}
        <div style={{ display:"flex", gap:5, alignItems:"center", overflowX:"auto", flex:1 }}>
          <HPill label="Platform" value={platformStatus==="unknown"?"—":platformStatus.toUpperCase()} state={platformStatus==="healthy"?"ok":platformStatus==="unknown"?"muted":"critical"} />
          <HPill label="Mock"  value={typeof mockCurrent==="number"?`${mockCurrent}/${CACHE_CONFIG.Mock.size}`:"—"} state={pillState(mockCurrent,CACHE_CONFIG.Mock.threshold)} />
          <HPill label="QP"    value={typeof qpCurrent==="number"?`${qpCurrent}/${CACHE_CONFIG.QuickPractice.size}`:"—"} state={pillState(qpCurrent,CACHE_CONFIG.QuickPractice.threshold)} />
          <HPill label="Rev"   value={stats?`₹${stats.revenue.toLocaleString("en-IN")}`:"—"} state="ok" />
          <HPill label="Live"  value={liveUsers>0?`${liveUsers} online`:stats?.total??"—"} state="ok" />
          {lastRefresh && <span style={{ fontSize:9, color:"#334155", fontFamily:"'JetBrains Mono',monospace", marginLeft:4, flexShrink:0 }}>↻ {lastRefresh.toLocaleTimeString("en-IN")}</span>}
        </div>

        {/* Header actions */}
        <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
          {fbUser
            ? <><span style={{ fontSize:10, color:D.textSecondary, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fbUser.email}</span>
                <Btn variant="ghost" onClick={()=>signOut(auth)}>Sign out</Btn></>
            : <Btn variant="cyan" onClick={()=>signInWithPopup(auth,new GoogleAuthProvider())}>Sign in</Btn>
          }
          <Btn variant="cyan" onClick={()=>{loadData();loadCacheStatus();runAnomalyDetection();}}>
            {loading ? <Spinner /> : "↻ Refresh"}
          </Btn>
        </div>
      </div>

      {/* ══ FIREBASE BANNER ══════════════════════════════════════════════════ */}
      {!fbUser && !fbLoading && (
        <div style={{ background:"rgba(251,191,36,0.08)", borderBottom:`1px solid rgba(251,191,36,0.2)`, padding:"7px 16px", fontSize:11, color:D.amber, display:"flex", alignItems:"center", gap:8 }}>
          <span>⚠</span> Sign in to load Firestore data. Cache status works without sign-in.
          <Btn variant="default" onClick={()=>signInWithPopup(auth,new GoogleAuthProvider())} extra={{marginLeft:8}}>Sign in with Google</Btn>
        </div>
      )}

      {/* ══ FILL PROGRESS STRIP ══════════════════════════════════════════════ */}
      {filling && fillProgress && (
        <div style={{ background:"rgba(0,201,167,0.07)", borderBottom:`1px solid rgba(0,201,167,0.2)`, padding:"6px 16px", display:"flex", alignItems:"center", gap:8, fontSize:11 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:D.cyan, animation:"pulse 1s infinite", flexShrink:0 }} />
          {fillProgress.locked
            ? <span style={{ color:D.amber }}>Fill lock active — another run in progress</span>
            : <span style={{ color:D.textPrimary }}>
                Filling cache · Mock <strong style={{ fontFamily:"'JetBrains Mono',monospace", color:D.cyan }}>{fillProgress.mock??"…"}/{fillProgress.mockTarget}</strong>
                {" "}· QP <strong style={{ fontFamily:"'JetBrains Mono',monospace", color:D.cyan }}>{fillProgress.qp??"…"}/{fillProgress.qpTarget}</strong>
                {" "}· <span style={{ color:D.textSecondary }}>{fillProgress.elapsed??0}s elapsed</span>
              </span>
          }
        </div>
      )}

      {/* ══ ANOMALY PANEL ════════════════════════════════════════════════════ */}
      {anomalies.length > 0 && (
        <div style={{ background:"rgba(248,113,113,0.06)", borderBottom:`2px solid rgba(248,113,113,0.3)`, padding:"10px 16px", animation:"fadeIn 0.3s ease" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:14 }}>🚨</span>
              <span style={{ fontWeight:800, color:D.red, fontSize:12 }}>{anomalies.filter(a=>!a.alreadyBlocked).length} Anomal{anomalies.filter(a=>!a.alreadyBlocked).length===1?"y":"ies"} Detected</span>
              {anomalyTs && <span style={{ fontSize:9, color:D.textSecondary }}>· scanned {anomalyTs.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>}
            </div>
            <div style={{ display:"flex", gap:5 }}>
              <Btn onClick={runAnomalyDetection} disabled={anomalyLoad}>{anomalyLoad?"Scanning…":"Re-scan"}</Btn>
              <Btn onClick={()=>setAnomalies([])}>Dismiss</Btn>
            </div>
          </div>
          {anomalies.map((a,i) => (
            <div key={i} style={{ background:D.surface, border:`1px solid ${a.severity==="critical"?"rgba(248,113,113,0.4)":"rgba(251,191,36,0.3)"}`, borderLeft:`3px solid ${a.severity==="critical"?D.red:D.amber}`, borderRadius:8, padding:"9px 12px", marginBottom:6, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, flexWrap:"wrap", boxShadow:a.severity==="critical"?D.glowRed:"none" }}>
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                  <span style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", color:a.severity==="critical"?D.red:D.amber, letterSpacing:"0.06em" }}>{a.severity==="critical"?"⛔ CRITICAL":"⚠ WARNING"} · {a.pattern.replace(/_/g," ")}</span>
                  {a.autoBlocked && <Tag type="critical">{a.permanentlyBlocked?"PERM-BANNED":"AUTO-BLOCKED 1HR"}</Tag>}
                  {a.alreadyBlocked && <Tag type="free">already blocked</Tag>}
                </div>
                <div style={{ fontWeight:700, fontSize:11, color:D.textPrimary, marginBottom:1 }}>{a.email}</div>
                <div style={{ fontSize:10, color:D.textSecondary }}>{a.detail}</div>
                <div style={{ fontSize:10, color:"#475569", fontStyle:"italic", marginTop:2 }}>💡 {a.suggestion}</div>
              </div>
              <div style={{ display:"flex", gap:5, flexShrink:0, paddingTop:2 }}>
                {!a.autoBlocked && !a.alreadyBlocked && (<>
                  <Btn variant="danger" onClick={()=>blockUser(a.uid,a.email,"1h",`Admin: ${a.pattern}`)} disabled={blockLoad===a.uid}>{blockLoad===a.uid?"…":"Block 1h"}</Btn>
                  <Btn variant="perm"  onClick={()=>blockUser(a.uid,a.email,"permanent",`Admin: ${a.pattern}. Permanent.`)} disabled={blockLoad===a.uid}>Perm Ban</Btn>
                </>)}
                <Btn onClick={()=>{setLookupEmail(a.email);setTimeout(lookupUser,50);}}>Profile</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ COMMAND ROW ══════════════════════════════════════════════════════ */}
      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderBottom:`1px solid ${D.border}`, flexWrap:"wrap" }}>
        <Btn onClick={()=>{loadData();loadCacheStatus();}}>{loading?<Spinner/>:"↻ Refresh Data"}</Btn>
        <Btn onClick={runHealthCheck}>{healthLoad?<Spinner/>:"Health Check"}</Btn>
        <Btn variant="cyan" onClick={fillAllCache} disabled={filling}>{filling?"Filling…":"Fill Cache"}</Btn>
        <Btn variant="ghost" onClick={runAnomalyDetection} disabled={anomalyLoad}>{anomalyLoad?<Spinner/>:"Scan Anomalies"}</Btn>
        <Btn href="https://console.firebase.google.com/project/vantiq-cuet/functions/logs" target="_blank">Logs ↗</Btn>
        <Btn href="https://github.com/casinghal/cuet-mock-platform/actions" target="_blank">Actions ↗</Btn>
      </div>

      {/* ══ KPI GRID ═════════════════════════════════════════════════════════ */}
      <div style={{ padding:"12px 16px 10px" }}>
        <div className="kpi-grid">
          <KpiTile value={stats?.total}    label="Total Students" sub="registered"      accent={D.indigo} loading={loading&&!stats} />
          <KpiTile value={stats?.paid}     label="Paid Students"  sub="unlocked"        accent={D.green}  loading={loading&&!stats} />
          <KpiTile value={stats?`${stats.convPct}%`:null} label="Conversion" sub="free → paid" accent={D.gold} loading={loading&&!stats} />
          <KpiTile value={stats?.testsToday} label="Tests Today"  sub="completed"       accent={D.cyan}   loading={loading&&!stats} />
          <KpiTile value={stats?`₹${stats.revenue.toLocaleString("en-IN")}`:null} label="Revenue" sub="₹199/unlock" accent={D.green} loading={loading&&!stats} />
          <KpiTile value={liveUsers||"0"}  label="Online Now"     sub="last 5 min"      accent={D.cyan}   loading={false} />
        </div>
      </div>

      {/* ══ LIVE SECTION ═════════════════════════════════════════════════════ */}
      <div style={{ padding:"0 16px 10px" }}>
        <div className="live-grid">
          {/* Recent Activity */}
          <Card>
            <CardHead title="Recent Activity" right={<span style={{ fontSize:9, color:D.textSecondary }}>last 10</span>} />
            {recentActivity.length===0
              ? <div style={{ padding:"16px 14px", fontSize:11, color:D.textSecondary }}>No activity yet</div>
              : recentActivity.map((a,i) => (
                <div key={i} className="row-hover" style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderBottom:i<recentActivity.length-1?`1px solid ${D.border}`:"none" }}>
                  <span style={{ color:D.indigo, fontSize:11, flexShrink:0 }}>{a.icon}</span>
                  <span style={{ fontWeight:600, fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:D.textPrimary, flex:1 }}>{trunc(a.email,22)}</span>
                  <span style={{ color:"#334155", fontSize:9, fontFamily:"'JetBrains Mono',monospace", whiteSpace:"nowrap", flexShrink:0 }}>{a.label}</span>
                  <span style={{ color:"#1E293B", fontSize:9, fontFamily:"'JetBrains Mono',monospace", whiteSpace:"nowrap", flexShrink:0, marginLeft:4 }}>{a.time}</span>
                </div>
              ))
            }
          </Card>

          {/* Student Breakdown */}
          <Card>
            <CardHead title="Student Breakdown" right={<span style={{ fontSize:9, color:D.textSecondary }}>Mock ↓</span>} />
            <THead cols={["Email",{label:"Mock",align:"center"},{label:"QP",align:"center"},{label:"Access",align:"center"},"Last Test"]} template="2fr .6fr .6fr .8fr 1.3fr" />
            {userBreakdown.length===0
              ? <div style={{ padding:"16px 14px", fontSize:11, color:D.textSecondary }}>No students yet</div>
              : userBreakdown.slice(0,10).map((u,i) => (
                <TRow key={i} template="2fr .6fr .6fr .8fr 1.3fr" highlight={u.blocked} cells={[
                  <span style={{ fontWeight:600, fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:u.blocked?D.red:D.textPrimary }}>{u.blocked&&"⛔ "}{trunc(u.email,24)}</span>,
                  <span style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700, color:D.cyan }}>{u.mock}</span>,
                  <span style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:D.indigo }}>{u.qp}</span>,
                  <span style={{ textAlign:"center" }}><Tag type={u.unlocked?"paid":"free"}>{u.unlocked?"Pro":"Free"}</Tag></span>,
                  <span style={{ color:D.textSecondary, fontSize:9 }}>{fmt(u.lastTest)}</span>,
                ]} />
              ))
            }
          </Card>
        </div>
      </div>

      {/* ══ TAB BAR ══════════════════════════════════════════════════════════ */}
      <div style={{ display:"flex", borderBottom:`1px solid ${D.border}`, padding:"0 16px", background:D.surface }}>
        {TABS.map(t => (
          <button key={t} onClick={()=>setActiveTab(t)} className="tab-btn"
            style={{ padding:"9px 16px", fontSize:11, fontWeight:activeTab===t?700:500, color:activeTab===t?D.textPrimary:D.textSecondary, borderBottom:activeTab===t?`2px solid ${D.cyan}`:"2px solid transparent", marginBottom:-1, letterSpacing:"0.02em" }}
          >
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB PANELS
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ padding:"12px 16px 40px" }}>

        {/* ── STUDENTS ───────────────────────────────────────────────────────── */}
        {activeTab==="students" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {/* User Lookup */}
            <Card>
              <CardHead title="User Management" />
              <div style={{ padding:"12px 14px" }}>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <input
                    style={{ flex:1, maxWidth:300, height:32, background:"rgba(255,255,255,0.04)", border:`1px solid ${D.border}`, borderRadius:6, padding:"0 12px", fontSize:11, fontFamily:"'Sora',sans-serif", color:D.textPrimary, outline:"none" }}
                    placeholder="Search by email address" value={lookupEmail}
                    onChange={e=>setLookupEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&lookupUser()}
                  />
                  <Btn variant="cyan" onClick={lookupUser}>{lookupLoad?<Spinner/>:"Lookup"}</Btn>
                </div>

                {lookupResult && (
                  <div style={{ background:D.surfaceAlt, border:`1px solid ${D.border}`, borderRadius:8, padding:12, animation:"fadeIn 0.2s ease" }}>
                    {lookupResult.notFound
                      ? <div style={{ color:D.amber, fontSize:11 }}>No user found with that email.</div>
                      : <>
                          {(lookupResult.blocked||lookupResult.blockedUntil) && (
                            <div style={{ background:"rgba(248,113,113,0.08)", border:`1px solid rgba(248,113,113,0.3)`, borderRadius:6, padding:"8px 10px", marginBottom:10 }}>
                              <div style={{ fontWeight:700, color:D.red, fontSize:11, marginBottom:2 }}>
                                {lookupResult.blocked?"⛔ PERMANENTLY BLOCKED":`⚠ BLOCKED UNTIL ${new Date(lookupResult.blockedUntil?.toDate?lookupResult.blockedUntil.toDate():lookupResult.blockedUntil).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`}
                              </div>
                              {lookupResult.blockReason && <div style={{ fontSize:10, color:D.textSecondary }}>{lookupResult.blockReason}</div>}
                              {lookupResult.blockCount>0 && <div style={{ fontSize:9, color:"#475569", marginTop:2 }}>Offense #{lookupResult.blockCount}</div>}
                            </div>
                          )}
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px 12px", marginBottom:10 }}>
                            {[
                              ["Email",      lookupResult.email,                          false],
                              ["Access",     lookupResult.unlocked?"Paid / Pro":"Free",   false],
                              ["Tests Used", lookupResult.testsUsed??0,                   true ],
                              ["Joined",     fmt(lookupResult.createdAt),                 false],
                              ["Last Test",  fmt(lookupResult.lastTestAt),                false],
                              ["Block Count",lookupResult.blockCount??0,                  true ],
                            ].map(([k,v,mono]) => (
                              <div key={k}>
                                <div style={{ fontSize:8, textTransform:"uppercase", color:D.textSecondary, letterSpacing:"0.07em", marginBottom:2 }}>{k}</div>
                                <div style={{ fontSize:11, fontWeight:600, fontFamily:mono?"'JetBrains Mono',monospace":"inherit", color:k==="Block Count"&&v>0?D.red:D.textPrimary }}>{v??"—"}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                            {!lookupResult.unlocked
                              ? <Btn variant="cyan"   onClick={()=>grantAccess(lookupResult.id)}>Grant Pro Access</Btn>
                              : <Btn variant="danger" onClick={()=>revokeAccess(lookupResult.id)}>Revoke Access</Btn>
                            }
                            <Btn onClick={()=>resetFreeLimit(lookupResult.id)}>Reset Free Limit</Btn>
                            {lookupResult.blocked||lookupResult.blockedUntil
                              ? <Btn variant="cyan" onClick={()=>blockUser(lookupResult.id,lookupResult.email,"unblock","")} disabled={blockLoad===lookupResult.id}>{blockLoad===lookupResult.id?"…":"✓ Unblock"}</Btn>
                              : <><Btn variant="danger" onClick={()=>blockUser(lookupResult.id,lookupResult.email,"1h","Admin: manual 1h")} disabled={blockLoad===lookupResult.id}>{blockLoad===lookupResult.id?"…":"Block 1h"}</Btn>
                                  <Btn variant="perm" onClick={()=>blockUser(lookupResult.id,lookupResult.email,"permanent","Admin: perm ban")} disabled={blockLoad===lookupResult.id}>Perm Ban</Btn></>
                            }
                            <Btn onClick={()=>deleteUser(lookupResult.id,lookupResult.email)} disabled={blockLoad===lookupResult.id} extra={{marginLeft:"auto",background:"rgba(31,41,55,0.8)",color:"#9CA3AF",border:`1px solid rgba(55,65,81,0.5)`}}>🗑 Delete</Btn>
                          </div>
                          <div style={{ borderTop:`1px solid ${D.border}`, paddingTop:10 }}>
                            <div style={{ fontSize:8, textTransform:"uppercase", color:D.textSecondary, letterSpacing:"0.07em", marginBottom:6 }}>Admin Notes (internal)</div>
                            <div style={{ display:"flex", gap:6 }}>
                              <textarea value={notesUid===lookupResult.id?adminNotes:(lookupResult.adminNotes||"")} onChange={e=>{setNotesUid(lookupResult.id);setAdminNotes(e.target.value);}} rows={2} placeholder="Private notes about this user…"
                                style={{ flex:1, fontSize:10, background:"rgba(255,255,255,0.04)", border:`1px solid ${D.border}`, borderRadius:6, padding:"6px 8px", fontFamily:"inherit", resize:"vertical", color:D.textPrimary, outline:"none" }} />
                              <Btn variant="cyan" onClick={()=>saveAdminNotes(lookupResult.id,notesUid===lookupResult.id?adminNotes:(lookupResult.adminNotes||""))} extra={{alignSelf:"flex-end"}}>Save</Btn>
                            </div>
                          </div>
                        </>
                    }
                  </div>
                )}
              </div>
            </Card>

            {/* All students */}
            <Card>
              <CardHead title={`All Students · ${userBreakdown.length}`} />
              <div style={{ overflowX:"auto" }}>
                <div style={{ minWidth:700 }}>
                  <THead cols={["Email",{label:"Mock",align:"center"},{label:"QP",align:"center"},{label:"Used",align:"center"},{label:"Access",align:"center"},"Last Test"]} template="2.5fr 1fr 1fr 1fr 1.2fr 1.5fr" />
                  {userBreakdown.length===0
                    ? <div style={{ padding:"16px 14px", color:D.textSecondary, fontSize:11 }}>No students yet</div>
                    : userBreakdown.map((u,i) => (
                      <TRow key={i} template="2.5fr 1fr 1fr 1fr 1.2fr 1.5fr" highlight={u.blocked} cells={[
                        <span style={{ fontWeight:600, fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:u.blocked?D.red:D.textPrimary, cursor:"pointer" }} onClick={()=>{setLookupEmail(u.email);}}>{trunc(u.email,30)}</span>,
                        <span style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700, color:D.cyan }}>{u.mock}</span>,
                        <span style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:D.indigo }}>{u.qp}</span>,
                        <span style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>{u.testsUsed}</span>,
                        <span style={{ textAlign:"center" }}><Tag type={u.unlocked?"paid":"free"}>{u.unlocked?"Pro":"Free"}</Tag></span>,
                        <span style={{ color:D.textSecondary, fontSize:9 }}>{fmt(u.lastTest)}</span>,
                      ]} />
                    ))
                  }
                </div>
              </div>
            </Card>

            {/* Recent tests */}
            <Card>
              <CardHead title={`Recent Tests · ${recentTests.length}`} />
              <div style={{ overflowX:"auto" }}>
                <div style={{ minWidth:700 }}>
                  <THead cols={["Email","Mode",{label:"Score",align:"center"},{label:"Correct",align:"center"},{label:"Accuracy",align:"center"},"Completed"]} template="2fr 1fr 1fr 1fr 1fr 1.5fr" />
                  {recentTests.slice(0,20).map((t,i) => (
                    <TRow key={t.id} template="2fr 1fr 1fr 1fr 1fr 1.5fr" cells={[
                      <span style={{ fontWeight:600, fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:D.textPrimary }}>{trunc(t.email||t.displayName,28)}</span>,
                      <Tag type="mock">{t.mode}</Tag>,
                      <span style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700, color:D.cyan }}>{t.totalScore??"—"}</span>,
                      <span style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:D.green }}>{t.correct??"—"}</span>,
                      <span style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:t.accuracy>=70?D.green:t.accuracy>=45?D.amber:D.red }}>{t.accuracy!=null?`${t.accuracy}%`:"—"}</span>,
                      <span style={{ color:D.textSecondary, fontSize:9 }}>{fmt(t.completedAt)}</span>,
                    ]} />
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── PLATFORM ───────────────────────────────────────────────────────── */}
        {activeTab==="platform" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {/* Health check */}
            <Card accent={healthData ? (healthData.overallStatus==="healthy"?D.cyan:D.red) : D.border}>
              <CardHead title="Platform Health" right={
                <Btn variant={healthData?.overallStatus!=="healthy"?"cyan":"default"} onClick={runHealthCheck}>
                  {healthLoad?<Spinner/>:"Run Health Check"}
                </Btn>
              } />
              <div style={{ padding:14 }}>
                {!healthData
                  ? <div style={{ color:D.textSecondary, fontSize:11 }}>Run a health check to see results.</div>
                  : <>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                        <Tag type={healthData.overallStatus==="healthy"?"healthy":"critical"}>{healthData.overallStatus?.toUpperCase()}</Tag>
                        {healthData.autoFixed?.length>0 && <span style={{ fontSize:10, color:D.amber }}>{healthData.autoFixed.length} auto-fixed</span>}
                        {healthData.warnings?.length>0 && <span style={{ fontSize:10, color:D.amber }}>{healthData.warnings.length} warning(s)</span>}
                      </div>
                      {healthData.checks && Object.entries(healthData.checks).map(([k,v]) => <HealthRow key={k} name={k} ok={v.ok} message={v.message} />)}
                    </>
                }
              </div>
            </Card>

            {/* Cache bars */}
            <Card>
              <CardHead title="Cache Health" right={<Btn variant="cyan" onClick={fillAllCache} disabled={filling}>{filling?"Filling…":"Fill All Cache"}</Btn>} />
              {Object.entries(CACHE_CONFIG).map(([mode,config]) => (
                <CacheBar key={mode} mode={mode} config={config} current={cacheStatus?.[mode]?.current??0} />
              ))}
              <div style={{ padding:"8px 14px" }}><Btn onClick={loadCacheStatus}>↻ Refresh Status</Btn></div>
            </Card>

            {/* Platform links */}
            <Card>
              <CardHead title="Platform Links" />
              <div style={{ padding:"10px 14px", display:"flex", gap:6, flexWrap:"wrap" }}>
                {[
                  ["Firebase Console","https://console.firebase.google.com/project/vantiq-cuet"],
                  ["Netlify Dashboard","https://app.netlify.com"],
                  ["GitHub Actions","https://github.com/casinghal/cuet-mock-platform/actions"],
                  ["Razorpay","https://dashboard.razorpay.com"],
                  ["GA4 Analytics","https://analytics.google.com"],
                  ["Live Site","https://vantiq-cuetmock.netlify.app"],
                ].map(([label,href]) => <Btn key={label} href={href} target="_blank">{label} ↗</Btn>)}
              </div>
            </Card>
          </div>
        )}

        {/* ── PAYMENTS ───────────────────────────────────────────────────────── */}
        {activeTab==="payments" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div className="pay-grid">
              <KpiTile value={stats?`₹${stats.revenue.toLocaleString("en-IN")}`:null} label="Total Revenue" sub="₹199/unlock" accent={D.green} />
              <KpiTile value={stats?.paid??null} label="Paid Students" sub="unlocked" accent={D.indigo} />
              <KpiTile value={recentPay.length} label="Transactions" sub="in Firestore" accent={D.gold} />
            </div>
            <Card>
              <CardHead title={`Recent Payments · ${recentPay.length}`} />
              {recentPay.length===0
                ? <div style={{ padding:"16px 14px", color:D.textSecondary, fontSize:11 }}>No payment records yet</div>
                : <div style={{ overflowX:"auto" }}>
                    <div style={{ minWidth:600 }}>
                      <THead cols={["Order ID","Payment ID","UID",{label:"Amount",align:"center"},"Date"]} template="2fr 1.5fr 1.5fr 1fr 1.5fr" />
                      {recentPay.map((p,i) => (
                        <TRow key={p.id} template="2fr 1.5fr 1.5fr 1fr 1.5fr" cells={[
                          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:D.textPrimary }}>{trunc(p.orderId,20)}</span>,
                          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:D.textSecondary }}>{trunc(p.paymentId,20)}</span>,
                          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:D.textSecondary }}>{trunc(p.uid,14)}</span>,
                          <span style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700, color:D.green }}>₹{p.amount??199}</span>,
                          <span style={{ color:D.textSecondary, fontSize:9 }}>{fmt(p.createdAt)}</span>,
                        ]} />
                      ))}
                    </div>
                  </div>
              }
            </Card>
          </div>
        )}

        {/* ── CONTENT ────────────────────────────────────────────────────────── */}
        {activeTab==="content" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div className="rating-grid">
              <KpiTile value={avgRating} label="Avg Rating" sub="out of 5" accent={D.gold} />
              <KpiTile value={ratings.length} label="Ratings" sub="collected" accent={D.indigo} />
              <KpiTile value={feedback.length} label="Feedback Items" sub="received" accent={D.cyan} />
            </div>

            {/* Feedback insights */}
            <Card>
              <CardHead title="Feedback Insights" right={<Btn variant="cyan" onClick={genInsights}>Generate Insights</Btn>} />
              <div style={{ padding:14 }}>
                {!insights
                  ? <div style={{ color:D.textSecondary, fontSize:11 }}>Click "Generate Insights" to analyse recent feedback.</div>
                  : <>
                      <div style={{ fontSize:12, lineHeight:1.7, color:D.textPrimary, marginBottom:12 }}>{insights.summary}</div>
                      {insights.insights?.map((ins,i) => (
                        <div key={i} style={{ fontSize:11, padding:"6px 10px", background:D.surfaceAlt, borderLeft:`2px solid ${D.indigo}`, borderRadius:4, marginBottom:5, color:D.textPrimary }}>{ins}</div>
                      ))}
                    </>
                }
              </div>
            </Card>

            {/* Raw feedback */}
            <Card>
              <CardHead title={`Raw Feedback · ${feedback.length}`} />
              {feedback.length===0
                ? <div style={{ padding:"14px", color:D.textSecondary, fontSize:11 }}>No feedback yet</div>
                : feedback.slice(0,15).map((f,i) => (
                    <div key={f.id} className="row-hover" style={{ padding:"9px 14px", borderBottom:`1px solid ${D.border}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:10, fontWeight:600, color:D.textPrimary }}>{trunc(f.email,30)}</span>
                        <span style={{ fontSize:9, color:D.textSecondary, fontFamily:"'JetBrains Mono',monospace" }}>{fmt(f.createdAt)}</span>
                      </div>
                      <div style={{ fontSize:11, color:D.textSecondary, lineHeight:1.5 }}>{f.text}</div>
                      {f.page && <span style={{ fontSize:9, color:"#334155" }}>page: {f.page}</span>}
                    </div>
                  ))
              }
            </Card>

            {/* Intelligence */}
            <Card>
              <CardHead title="CUET Intelligence" right={
                <div style={{ display:"flex", gap:5 }}>
                  <Btn onClick={()=>updateIntelligence("English")} disabled={intelGenLoad}>{intelGenLoad?<Spinner/>:"Update English"}</Btn>
                  <Btn onClick={runGATCARefresh} disabled={gatCALoad} extra={{ background:gatCALoad?"rgba(255,255,255,0.04)":"rgba(52,211,153,0.12)", color:D.green, border:`1px solid rgba(52,211,153,0.25)` }}>
                    {gatCALoad?"Fetching…":"↺ GAT CA Refresh"}
                  </Btn>
                </div>
              } />
              <div style={{ padding:14 }}>
                <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                  {[{label:"English 101",c:D.cyan},{label:"GAT 501",c:D.cyan},{label:"Economics — coming",c:D.amber}].map(({label,c}) => (
                    <span key={label} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 9px", background:`${c}12`, border:`1px solid ${c}30`, borderRadius:20, fontSize:9, fontWeight:700, color:c }}>
                      <span style={{ width:4, height:4, borderRadius:"50%", background:c }} />{label}
                    </span>
                  ))}
                </div>
                {gatCAResult && <div style={{ fontSize:10, color:D.cyan, fontWeight:600, marginBottom:10, padding:"5px 8px", background:"rgba(52,211,153,0.07)", borderRadius:5, border:`1px solid rgba(52,211,153,0.15)` }}>GAT CA: v{gatCAResult.refreshVersion} · {gatCAResult.contextLength} chars · {gatCAResult.cacheInvalidated} sets cleared</div>}
                {!intel||intel.length===0
                  ? <div style={{ color:D.textSecondary, fontSize:11 }}>No intelligence data loaded.</div>
                  : intel.map(item => (
                      <div key={item.id} style={{ padding:"9px 11px", background:D.surfaceAlt, border:`1px solid ${D.border}`, borderRadius:7, marginBottom:7 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:D.textPrimary }}>{item.subject}</span>
                          <span style={{ fontSize:9, color:D.textSecondary }}>Updated {fmt(item.updatedAt)}</span>
                        </div>
                        <div style={{ fontSize:10, color:D.textSecondary, lineHeight:1.5 }}>{trunc(item.preview,180)}</div>
                      </div>
                    ))
                }
              </div>
            </Card>
          </div>
        )}

        {/* ── SETTINGS ───────────────────────────────────────────────────────── */}
        {activeTab==="settings" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Card>
                <CardHead title="Admin Access" />
                <div style={{ padding:14 }}>
                  <div style={{ fontSize:11, color:D.textSecondary, marginBottom:8, lineHeight:1.6 }}>
                    Password set via <code style={{ background:"rgba(255,255,255,0.06)", padding:"1px 6px", borderRadius:4, fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:D.textPrimary }}>VITE_ADMIN_PASSWORD</code> in Netlify env vars.
                  </div>
                  <div style={{ fontSize:10, color:"#334155", lineHeight:1.6 }}>
                    To rotate → Netlify → Site Config → Environment Variables → update → trigger redeploy.
                  </div>
                </div>
              </Card>
              <Card>
                <CardHead title="Firebase Status" />
                <div style={{ padding:14 }}>
                  {fbUser
                    ? <><div style={{ fontSize:11, color:D.cyan, marginBottom:8, fontWeight:600 }}>✓ Signed in as {fbUser.email}</div>
                        <Btn variant="danger" onClick={()=>signOut(auth)}>Sign out of Firebase</Btn></>
                    : <><div style={{ fontSize:11, color:D.amber, marginBottom:8 }}>Not signed in — Firestore reads disabled</div>
                        <Btn variant="cyan" onClick={()=>signInWithPopup(auth,new GoogleAuthProvider())}>Sign in with Google</Btn></>
                  }
                </div>
              </Card>
            </div>

            {/* Activity log */}
            <Card>
              <CardHead title="Session Activity Log" right={<Btn onClick={()=>setLogs([])}>Clear</Btn>} />
              <div style={{ maxHeight:280, overflowY:"auto", padding:"6px 0" }}>
                {logs.length===0
                  ? <div style={{ padding:"12px 14px", color:D.textSecondary, fontSize:11 }}>No activity this session</div>
                  : logs.map((entry,i) => <LogLine key={i} entry={entry} />)
                }
              </div>
            </Card>

            {/* Platform info */}
            <Card>
              <CardHead title="Platform Info" />
              <div style={{ padding:14 }}>
                {[
                  ["Platform","Vantiq CUET Mock Test"],["Live URL","vantiq-cuetmock.netlify.app"],
                  ["Firebase","vantiq-cuet"],["CF Region","us-central1"],["Node.js","20"],
                  ["Frontend","React (Vite) · Netlify"],["Auth","Firebase · Google only"],
                  ["Payments","Razorpay · ₹199 one-time"],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${D.border}`, fontSize:11 }}>
                    <span style={{ color:D.textSecondary, fontWeight:600 }}>{k}</span>
                    <span style={{ color:D.textPrimary, fontFamily:"'JetBrains Mono',monospace", fontSize:10 }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
