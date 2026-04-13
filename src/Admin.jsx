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
  getDoc,
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
  Mock:            { size: 20,  threshold: 12,  label: "Mock Cache" },
  QuickPractice:   { size: 30,  threshold: 20,  label: "QP Cache" },
  GAT_Mock:        { size: 20,  threshold: 12,  label: "GAT Mock Cache" },
  GAT_QP:          { size: 30,  threshold: 20,  label: "GAT QP Cache" },
  Economics_Mock:  { size: 20,  threshold: 12,  label: "Economics Mock Cache" },
  Economics_QP:    { size: 30,  threshold: 20,  label: "Economics QP Cache" },
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

// ─── Cache Command Centre ─────────────────────────────────────────────────────
function CacheCommandCentre({ cacheStatus, filling, fillProgress, fillMode, fillAllCache, stopFill, autoFillEnabled, setAutoFillEnabled, lastAutoCheck, autoFillTriggered }) {
  const modes = [
    { key: "Mock",            label: "Eng Mock",   color: "#4338CA", bg: "#EEF2FF" },
    { key: "GAT_Mock",        label: "GAT Mock",   color: "#DC2626", bg: "#FEF2F2" },
    { key: "Economics_Mock",  label: "Eco Mock",   color: "#7C3AED", bg: "#F5F3FF" },
    { key: "QuickPractice",   label: "Eng QP",     color: "#059669", bg: "#ECFDF5" },
    { key: "GAT_QP",          label: "GAT QP",     color: "#D97706", bg: "#FEF3C7" },
    { key: "Economics_QP",    label: "Eco QP",     color: "#0891B2", bg: "#ECFEFF" },
  ];
  const activeMode = fillProgress?.targetMode || (filling && !fillProgress?.targetMode ? "All" : null);
  const elapsed = fillProgress?.elapsed ?? 0;
  const elapsedStr = elapsed >= 60 ? `${Math.floor(elapsed/60)}m ${elapsed%60}s` : `${elapsed}s`;

  const getNeeded = (key) => cacheStatus?.[key]?.needed ?? 0;
  const getCurrent = (key) => cacheStatus?.[key]?.current ?? 0;

  return (
    <div style={{ background:"#fff", borderBottom:"2px solid #E2E8F0" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 20px 7px", borderBottom:"1px solid #F1F5F9" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:10, fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"#0F2747" }}>Cache Engine</span>
          {filling ? (
            <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#F0FDF4", border:"1px solid #BBF7D0", color:"#059669", fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:20 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#059669", display:"inline-block", animation:"pulse 1.2s ease-in-out infinite" }}/>
              GENERATING{activeMode && activeMode!=="All" ? ` · ${activeMode}` : ""} · {elapsedStr} elapsed
            </span>
          ) : (
            <span style={{ fontSize:10, color:"#94A3B8", background:"#F8FAFC", border:"1px solid #E2E8F0", padding:"2px 8px", borderRadius:20 }}>IDLE</span>
          )}
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {filling ? (
            <button onClick={stopFill} style={{ background:"#FEF2F2", border:"1px solid #FECACA", color:"#DC2626", borderRadius:6, padding:"3px 10px", fontSize:10, fontWeight:700, cursor:"pointer" }}>
              ⏹ Stop
            </button>
          ) : null}
          <button onClick={fillAllCache} disabled={filling} style={{ background: filling?"#F1F5F9":"#0F2747", border:"none", color: filling?"#94A3B8":"#fff", borderRadius:6, padding:"3px 10px", fontSize:10, fontWeight:700, cursor: filling?"not-allowed":"pointer" }}>
            ▶ Fill All
          </button>
        </div>
      </div>

      {/* Auto-fill status bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 20px", background: autoFillEnabled ? "#F0FDF4" : "#F8FAFC", borderBottom:"1px solid #F1F5F9" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Toggle */}
          <div
            onClick={() => setAutoFillEnabled(v => !v)}
            style={{ width:32, height:18, borderRadius:9, background: autoFillEnabled ? "#059669" : "#CBD5E1", cursor:"pointer", position:"relative", transition:"background .2s", flexShrink:0 }}
          >
            <div style={{ width:14, height:14, borderRadius:"50%", background:"#fff", position:"absolute", top:2, left: autoFillEnabled ? 16 : 2, transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
          </div>
          <span style={{ fontSize:10, fontWeight:700, color: autoFillEnabled ? "#059669" : "#94A3B8", textTransform:"uppercase", letterSpacing:".06em" }}>
            Auto-fill {autoFillEnabled ? "ON" : "OFF"}
          </span>
          {autoFillEnabled && (
            <span style={{ fontSize:10, color:"#64748B" }}>
              · checks every 30 min
            </span>
          )}
          {autoFillTriggered && (
            <span style={{ fontSize:10, fontWeight:700, color:"#D97706", background:"#FEF3C7", border:"1px solid #FCD34D", padding:"1px 7px", borderRadius:10 }}>
              ⚡ Filling now…
            </span>
          )}
        </div>
        <span style={{ fontSize:10, color:"#94A3B8" }}>
          {lastAutoCheck
            ? `Last checked ${lastAutoCheck.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}`
            : "Not yet checked"}
        </span>
      </div>

      {/* 6-mode grid: 3 cols × 2 rows — Eng / GAT / Economics */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)" }}>
        {modes.map((m, i) => {
          const total   = CACHE_CONFIG[m.key]?.size ?? 100;
          const current = getCurrent(m.key);
          const needed  = getNeeded(m.key);
          const pct     = total > 0 ? Math.round((current / total) * 100) : 0;
          const isFull  = needed === 0 && current > 0;
          const isCrit  = !isFull && pct < 30;
          const isActive= filling && (activeMode === m.key || activeMode === "All");
          const barColor= isFull?"#059669": isActive?m.color: isCrit?"#DC2626":"#CBD5E1";
          const status  = isFull?"FULL": isActive?"FILLING": isCrit?"LOW": "OK";
          const sBg     = isFull?"#ECFDF5": isActive?m.bg: isCrit?"#FEF2F2":"#F8FAFC";
          const sCol    = isFull?"#059669": isActive?m.color: isCrit?"#DC2626":"#64748B";
          return (
            <div key={m.key} style={{ padding:"10px 14px", borderRight: i%3<2?"1px solid #F1F5F9":"none", borderBottom: i<3?"1px solid #F1F5F9":"none", background: isActive?`${m.bg}88`:"#fff", transition:"background .3s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#0F2747" }}>{m.label}</span>
                <span style={{ fontSize:9, fontWeight:800, letterSpacing:".06em", textTransform:"uppercase", background:sBg, color:sCol, padding:"1px 6px", borderRadius:10 }}>{status}</span>
              </div>
              <div style={{ display:"flex", alignItems:"baseline", gap:3, marginBottom:5 }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:24, fontWeight:800, color:barColor, lineHeight:1 }}>{cacheStatus ? current : "—"}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#94A3B8" }}>/ {total}</span>
                <span style={{ fontSize:10, color:"#94A3B8", marginLeft:2 }}>{pct}%</span>
              </div>
              <div style={{ height:4, background:"#F1F5F9", borderRadius:3, overflow:"hidden", marginBottom:5 }}>
                <div style={{ height:"100%", borderRadius:3, background:barColor, width:`${pct}%`, transition:"width 1.5s ease" }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                <span style={{ fontSize:9, color:"#94A3B8" }}>{needed>0 ? `${needed} to go` : "✓ at target"}</span>
                {isActive && elapsed>0 && <span style={{ fontSize:9, color:m.color, fontWeight:600 }}>{elapsedStr}</span>}
              </div>
              <button onClick={() => fillMode(m.key)} disabled={filling || isFull}
                style={{ width:"100%", background: (filling||isFull)?"#F8FAFC":m.bg, border:`1px solid ${(filling||isFull)?"#E2E8F0":barColor+"55"}`, color:(filling||isFull)?"#94A3B8":m.color, borderRadius:5, padding:"4px 0", fontSize:10, fontWeight:700, cursor:(filling||isFull)?"not-allowed":"pointer", textTransform:"uppercase", letterSpacing:".05em" }}>
                {isActive ? "▶ Running…" : isFull ? "✓ Full" : "▶ Fill Now"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Detail bar when filling */}
      {filling && fillProgress && !fillProgress.locked && (
        <div style={{ padding:"7px 20px", background:"#F8FAFF", borderTop:"1px solid #E2E8F0", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, color:"#64748B" }}>Elapsed: <strong style={{ fontFamily:"'JetBrains Mono',monospace", color:"#0F2747" }}>{elapsedStr}</strong></span>
          {fillProgress.targetMode
            ? <span style={{ fontSize:11, color:"#64748B" }}>Filling: <strong style={{ fontFamily:"'JetBrains Mono',monospace", color:"#4338CA" }}>{fillProgress.targetMode}</strong> — <strong style={{ fontFamily:"'JetBrains Mono',monospace" }}>{cacheStatus?.[fillProgress.targetMode]?.current ?? 0}/{CACHE_CONFIG[fillProgress.targetMode]?.size ?? 20}</strong></span>
            : [
                { key:"Mock", label:"Eng Mock", col:"#4338CA" },
                { key:"GAT_Mock", label:"GAT Mock", col:"#DC2626" },
                { key:"Economics_Mock", label:"Eco Mock", col:"#7C3AED" },
                { key:"QuickPractice", label:"Eng QP", col:"#059669" },
                { key:"GAT_QP", label:"GAT QP", col:"#D97706" },
                { key:"Economics_QP", label:"Eco QP", col:"#0891B2" },
              ].map(m => (
                <span key={m.key} style={{ fontSize:11, color:"#64748B" }}>{m.label}: <strong style={{ fontFamily:"'JetBrains Mono',monospace", color:m.col }}>{cacheStatus?.[m.key]?.current ?? 0}/{CACHE_CONFIG[m.key]?.size ?? 20}</strong></span>
              ))
          }
          <span style={{ fontSize:10, color:"#94A3B8", marginLeft:"auto" }}>updates every 15s</span>
        </div>
      )}
      {filling && fillProgress?.locked && (
        <div style={{ padding:"6px 20px", background:"#FFFBEB", borderTop:"1px solid #FDE68A", fontSize:11, color:"#92400E", display:"flex", gap:8 }}>
          <span>⏳</span><span>External fill in progress — monitoring. Cache counts refresh every 15s.</span>
        </div>
      )}
    </div>
  );
}

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
  const [liveUsers,    setLiveUsers]    = useState(0);
  const [onlineUsers,  setOnlineUsers]  = useState([]); // array: {uid, email, screen, lastSeen}
  const [insights, setInsights] = useState(null);
  const [intel, setIntel] = useState(null);
  const [intelLoad, setIntelLoad] = useState(false);
  const [gatCALoad,   setGatCALoad]   = useState(false);  // refreshing GAT CA context
  const [gatCAResult, setGatCAResult] = useState(null);   // last GAT CA refresh result
  const [econDataLoad,   setEconDataLoad]   = useState(false);
  const [econDataResult, setEconDataResult] = useState(null);
  const [intelGenLoad, setIntelGenLoad] = useState(false);

  const [usageData,     setUsageData]     = useState(null);
  const [usageLoading,  setUsageLoading]  = useState(false);
  const [usageTab,      setUsageTab]      = useState("today");
  const [balanceData,   setBalanceData]   = useState(null);
  const [balanceInput,  setBalanceInput]  = useState("");
  const [savingBalance, setSavingBalance] = useState(false);

  // ── Cache state ─────────────────────────────────────────────────────────────
  const [cacheStatus, setCacheStatus] = useState(null);
  const [filling, setFilling] = useState(false);
  const [fillProgress, setFillProgress] = useState(null);
  const fillPollRef = useRef(null);
  const fillStartRef = useRef(null);
  const stalePollsRef = useRef(0);

  // ── Auto-fill state ──────────────────────────────────────────────────────────
  const [autoFillEnabled, setAutoFillEnabled] = useState(true);
  const [lastAutoCheck, setLastAutoCheck] = useState(null);   // Date of last check
  const [autoFillTriggered, setAutoFillTriggered] = useState(false); // true = fill fired this cycle
  const autoFillIntervalRef = useRef(null);

  const [healthData, setHealthData] = useState(null);
  const [healthLoad, setHealthLoad] = useState(false);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("students");
  const [qaQuestions,   setQaQuestions]   = useState(null);   // questions pulled for review
  const [qaLoading,     setQaLoading]     = useState(false);
  const [qaMode,        setQaMode]        = useState("Economics_Mock");
  const [qaEdits,       setQaEdits]       = useState({});     // {idx: {correct: n}}
  const [qaSaving,      setQaSaving]      = useState(false);
  const [qaMsg,         setQaMsg]         = useState(null);
  const [auditRunning,  setAuditRunning]  = useState(false);
  const [auditProgress, setAuditProgress] = useState(null);  // { scanned, fixed, rejected, done }
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [logs, setLogs] = useState([]);

  // ── User management state ───────────────────────────────────────────────────
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [anomalies,    setAnomalies]    = useState([]);
  const [anomalyLoad,  setAnomalyLoad]  = useState(false);
  const [anomalyTs,    setAnomalyTs]    = useState(null);
  const [blockLoad,    setBlockLoad]    = useState(null); // uid being blocked
  const [adminNotes,   setAdminNotes]   = useState("");
  const [notesUid,     setNotesUid]     = useState(null);
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
          blocked: !!u.blocked || !!(u.blockedUntil && (u.blockedUntil.toDate ? u.blockedUntil.toDate() : new Date(u.blockedUntil)) > new Date()),
          blockCount: u.blockCount || 0,
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

      // Presence (live users with email resolution)
      try {
        const pQ = query(collection(db, "presence"));
        const pSnap = await getDocs(pQ);
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const live = pSnap.docs.filter((d) => {
          const ls = d.data().lastSeen?.toDate ? d.data().lastSeen.toDate() : null;
          return ls && ls > fiveMinsAgo;
        });
        setLiveUsers(live.length);
        // Build online user list with emails from users collection
        const userEmailMap = {};
        users.forEach(u => { userEmailMap[u.id] = u.email || u.displayName || u.id.slice(0,10); });
        const onlineList = live.map(d => ({
          uid: d.id,
          email: d.data().email || userEmailMap[d.id] || d.id.slice(0,10),
          screen: d.data().screen || "—",
          lastSeen: d.data().lastSeen?.toDate ? d.data().lastSeen.toDate() : null,
        })).sort((a,b) => (b.lastSeen || 0) - (a.lastSeen || 0));
        setOnlineUsers(onlineList);
      } catch (e) {
        setLiveUsers(0);
        setOnlineUsers([]);
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
        setFillProgress({ elapsed, locked: status.locked });

        // Done when all 6 modes are at target, or stale/timeout
        const allFull = ["Mock","QuickPractice","GAT_Mock","GAT_QP","Economics_Mock","Economics_QP"]
          .every(k => (status[k]?.current ?? 0) >= (CACHE_CONFIG[k]?.size ?? 20));

        const mCurrent = status.Mock?.current ?? 0;
        const qCurrent = status.QuickPractice?.current ?? 0;
        const prevMock = fillProgress?.mock;
        const prevQp = fillProgress?.qp;
        if (mCurrent === prevMock && qCurrent === prevQp) {
          stalePollsRef.current++;
        } else {
          stalePollsRef.current = 0;
        }

        if (allFull || stalePollsRef.current >= 8 || elapsed > 570) {
          clearInterval(fillPollRef.current);
          setFilling(false);
          setFillProgress(null);
          if (allFull) addLog("Cache full — all modes at target", "success");
          else addLog("Fill cycle ended — check status", "warn");
        }
      }
    }, 15000);
  }, [filling, loadCacheStatus, fillProgress, addLog]);

  // ── Targeted mode fill — bypasses lock, fills only one mode ─────────────
  const fillMode = useCallback(async (mode) => {
    if (filling) {
      addLog(`Pausing current fill — switching to ${mode}...`, "warn");
      clearInterval(fillPollRef.current);
      setFilling(false);
      setFillProgress(null);
      await new Promise(r => setTimeout(r, 800));
    }
    setFilling(true);
    fillStartRef.current = Date.now();
    stalePollsRef.current = 0;
    addLog(`Starting targeted fill: ${mode} (force mode — overrides any active lock)...`, "info");
    try {
      const res = await cfFetch("triggerCacheWarm", { mode, force: true });
      addLog(`${mode} fill started: ${res?.message || "running"}`, "success");
      setFillProgress({ started: true, targetMode: mode });
    } catch (e) {
      addLog(`${mode} fill error: ${e.message}`, "error");
      setFilling(false);
      return;
    }
    fillPollRef.current = setInterval(async () => {
      const elapsed = Math.round((Date.now() - fillStartRef.current) / 1000);
      const status = await loadCacheStatus(true);
      if (status) {
        const cur = status[mode]?.current ?? 0;
        const tgt = CACHE_CONFIG[mode]?.size ?? 80;
        setFillProgress({ elapsed, targetMode: mode });
        if (cur >= tgt || elapsed > 590) {
          clearInterval(fillPollRef.current);
          setFilling(false);
          setFillProgress(null);
          addLog(cur >= tgt ? `${mode} cache FULL at ${cur}/${tgt}` : `${mode} fill ended at ${cur}/${tgt}`, cur >= tgt ? "success" : "warn");
        }
      }
    }, 12000);
  }, [filling, loadCacheStatus, addLog]);

  // ── Auto-fill check on load ──────────────────────────────────────────────────
  // ── Stop active fill ──────────────────────────────────────────────────────────
  const stopFill = useCallback(() => {
    clearInterval(fillPollRef.current);
    setFilling(false);
    setFillProgress(null);
    addLog("Fill manually stopped by admin", "warn");
  }, [addLog]);

  const checkAndFill = useCallback(async () => {
    const status = await loadCacheStatus(true); // silent on auto-check
    setLastAutoCheck(new Date());
    if (!status) return;
    const needsFill =
      (status.Mock?.current ?? 0) < CACHE_CONFIG.Mock.threshold ||
      (status.QuickPractice?.current ?? 0) < CACHE_CONFIG.QuickPractice.threshold ||
      (status.GAT_Mock?.current ?? 0) < CACHE_CONFIG.GAT_Mock.threshold ||
      (status.GAT_QP?.current ?? 0) < CACHE_CONFIG.GAT_QP.threshold ||
      (status.Economics_Mock?.current ?? 0) < CACHE_CONFIG.Economics_Mock.threshold ||
      (status.Economics_QP?.current ?? 0) < CACHE_CONFIG.Economics_QP.threshold;
    if (needsFill && !filling) {
      addLog("Auto-fill: cache below threshold — triggering fill", "warn");
      setAutoFillTriggered(true);
      setTimeout(() => { fillAllCache(); setAutoFillTriggered(false); }, 1500);
    }
  }, [loadCacheStatus, fillAllCache, filling, addLog]);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authed && fbUser) {
      loadData();
      // Auto-fill check happens via the dedicated auto-fill interval (10s after load)
      setTimeout(() => runAnomalyDetection(), 4000);
    } else if (authed && !fbUser && !fbLoading) {
      loadCacheStatus();
    }
  }, [authed, fbUser, fbLoading]);

  // ── Auto-refresh every 60s — full dashboard data ──────────────────────────
  // If fill is active: only refresh cache status + presence (lightweight, won't disrupt fill)
  // If fill is idle: full loadData so KPIs, students, tests all update
  const [nextRefreshIn, setNextRefreshIn] = useState(300);
  const refreshCountdownRef = useRef(null);

  useEffect(() => {
    if (!authed) return;
    statusPollRef.current = setInterval(() => {
      // Don't reset fill polling — just refresh data around it
      loadCacheStatus(true);
      if (!filling) loadData();
      setNextRefreshIn(60);
    }, 300000);
    // Countdown ticker
    refreshCountdownRef.current = setInterval(() => {
      setNextRefreshIn(n => n > 0 ? n - 1 : 300);
    }, 1000);
    return () => {
      clearInterval(statusPollRef.current);
      clearInterval(refreshCountdownRef.current);
    };
  }, [authed, loadCacheStatus, loadData, filling]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(fillPollRef.current);
      clearInterval(statusPollRef.current);
      clearInterval(autoFillIntervalRef.current);
    };
  }, []);

  // ── Auto-fill interval — checks every 30 minutes when dashboard is open ──────
  // On initial load: immediate check after 10s (let auth + data settle first)
  // Then every 30 minutes while dashboard is open and autoFillEnabled is true
  useEffect(() => {
    if (!authed) return;
    // Initial check — 10 second delay to let page settle
    const initialTimer = setTimeout(() => {
      if (autoFillEnabled) checkAndFill();
    }, 10000);
    // Recurring check every 30 minutes
    autoFillIntervalRef.current = setInterval(() => {
      if (autoFillEnabled && !filling) checkAndFill();
    }, 30 * 60 * 1000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(autoFillIntervalRef.current);
    };
  }, [authed, autoFillEnabled, filling, checkAndFill]);

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

  // ── Refresh GAT Current Affairs (autonomous — triggers web search CF) ────────
  const runGATCARefresh = async () => {
    if (gatCALoad) return;

    // ── Informed consent popup ────────────────────────────────────────────────
    const gatMock = cacheStatus?.GAT_Mock?.current ?? "unknown";
    const gatQP   = cacheStatus?.GAT_QP?.current   ?? "unknown";
    const confirmed = window.confirm(
      `REFRESH GAT CURRENT AFFAIRS — What will happen:\n\n` +
      `✓  A web search will fetch the latest India current affairs\n` +
      `✓  The GAT question generation context will be updated in Firestore\n` +
      `✓  All ${gatMock} GAT Mock + ${gatQP} GAT QP cached question sets will be PERMANENTLY DELETED\n\n` +
      `⚠  Students will see "tests being prepared" for the next 2–7 minutes until new sets are generated\n` +
      `⚠  The nightly cron will auto-fill. Or go to Cache Health → ⚡ GAT Mock / ⚡ GAT QP to fill immediately\n\n` +
      `Best time to run: Low-traffic hours (late night IST)\n\n` +
      `Press OK to proceed, Cancel to abort.`
    );
    if (!confirmed) return;

    setGatCALoad(true);
    addLog("Refreshing GAT current affairs — fetching latest events from web...");
    try {
      const data = await cfFetch("refreshGATCurrentAffairs", {});
      setGatCAResult(data);
      addLog(`GAT CA refreshed — v${data.refreshVersion}, ${data.cacheInvalidated} cache sets cleared for regeneration`, "success");
      addLog("⚡ Trigger a GAT cache fill now if traffic is active: Cache Health → ⚡ GAT Mock + ⚡ GAT QP", "warn");
    } catch (e) {
      addLog("GAT CA refresh failed: " + e.message, "error");
    } finally {
      setGatCALoad(false);
    }
  };

  const runEconDataRefresh = async () => {
    if (econDataLoad) return;

    // ── Informed consent popup ────────────────────────────────────────────────
    const econMock = cacheStatus?.Economics_Mock?.current ?? "unknown";
    const econQP   = cacheStatus?.Economics_QP?.current   ?? "unknown";
    const confirmed = window.confirm(
      `REFRESH ECONOMICS CURRENT DATA — What will happen:\n\n` +
      `✓  A web search will fetch the latest Indian economy data (Budget, RBI, GDP, MSP)\n` +
      `✓  The Economics question generation context will be updated in Firestore\n` +
      `✓  All ${econMock} Economics Mock + ${econQP} Economics QP cached question sets will be PERMANENTLY DELETED\n\n` +
      `⚠  Students will see "tests being prepared" for the next 2–7 minutes until new sets are generated\n` +
      `⚠  The nightly cron will auto-fill. Or go to Cache Health → ⚡ Eco Mock / ⚡ Eco QP to fill immediately\n\n` +
      `Best time to run: Low-traffic hours (late night IST)\n` +
      `Recommended frequency: After Union Budget (Feb), RBI policy changes, or quarterly\n\n` +
      `Press OK to proceed, Cancel to abort.`
    );
    if (!confirmed) return;

    setEconDataLoad(true);
    addLog("Refreshing Economics data — fetching latest Indian economy data...");
    try {
      const data = await cfFetch("refreshEconomicsCurrentData", {});
      setEconDataResult(data);
      addLog(`Economics data refreshed — v${data.refreshVersion}, ${data.cacheInvalidated} cache sets cleared`, "success");
      addLog("⚡ Trigger an Economics cache fill now if traffic is active: Cache Health → ⚡ Eco Mock + ⚡ Eco QP", "warn");
    } catch (e) {
      addLog("Economics data refresh failed: " + e.message, "error");
    } finally {
      setEconDataLoad(false);
    }
  };

  const clearAndRebuildCache = async (subject) => {
    if (!window.confirm(`Clear ALL cached ${subject} question sets and trigger a fresh rebuild?\nStudents will see "tests preparing" for ~2 minutes.`)) return;
    addLog(`Clearing and rebuilding ${subject} cache...`);
    try {
      const data = await cfFetch("clearAndRebuildSubjectCache", { subject });
      addLog(`${subject} cache rebuilt — ${data.deletedSets} sets cleared. Nightly cron will auto-fill.`, "success");
      await loadCacheStatus();
    } catch (e) {
      addLog(`${subject} cache rebuild failed: ` + e.message, "error");
    }
  };

  const loadApiUsage = async () => {
    setUsageLoading(true);
    try {
      const makeDayStr = (offset) => {
        const d = new Date(); d.setDate(d.getDate() - offset);
        return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      };
      const todayStr = makeDayStr(0);
      const todaySnap = await getDoc(doc(db, "anthropicUsage", todayStr));
      const todayData = todaySnap.exists() ? todaySnap.data() : null;

      const sumDays = async (n) => {
        const snaps = await Promise.all(
          Array.from({ length: n }, (_, i) => getDoc(doc(db, "anthropicUsage", makeDayStr(i))))
        );
        return snaps.reduce((acc, snap) => {
          if (!snap.exists()) return acc;
          const d = snap.data();
          return {
            totalInputTokens:  (acc.totalInputTokens  || 0) + (d.totalInputTokens  || 0),
            totalOutputTokens: (acc.totalOutputTokens || 0) + (d.totalOutputTokens || 0),
            totalCalls:        (acc.totalCalls        || 0) + (d.totalCalls        || 0),
            totalCostUSD:      (acc.totalCostUSD      || 0) + (d.totalCostUSD      || 0),
          };
        }, {});
      };

      const [weekData, monthData] = await Promise.all([sumDays(7), sumDays(30)]);
      setUsageData({ today: todayData, week: weekData, month: monthData });

      const balSnap = await getDoc(doc(db, "platformConfig", "anthropicBalance"));
      if (balSnap.exists()) setBalanceData(balSnap.data());
    } catch (e) {
      addLog("Usage data load failed: " + e.message, "error");
    } finally {
      setUsageLoading(false);
    }
  };

  const saveBalanceRefill = async () => {
    const amt = parseFloat(balanceInput);
    if (!amt || amt <= 0) return;
    setSavingBalance(true);
    try {
      const entry = {
        balanceUSD: amt,
        refilledAt: new Date().toISOString(),
        refilledAtDisplay: new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric", timeZone:"Asia/Kolkata" }),
      };
      await setDoc(doc(db, "platformConfig", "anthropicBalance"), entry);
      setBalanceData(entry);
      setBalanceInput("");
      addLog(`Balance recorded: $${amt.toFixed(2)}`, "success");
    } catch (e) {
      addLog("Balance save failed: " + e.message, "error");
    } finally {
      setSavingBalance(false);
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

  // ── Anomaly detection ──────────────────────────────────────────────────────
  const runAnomalyDetection = async () => {
    setAnomalyLoad(true);
    try {
      const data = await cfFetch("detectAnomalies");
      setAnomalies(data.flags || []);
      setAnomalyTs(new Date());
      if (data.autoBlocked?.length) {
        data.autoBlocked.forEach(u =>
          addLog(`AUTO-BLOCKED ${u.email} — ${u.isPermanent ? "PERMANENT" : "1 hour"} (offense #${u.blockCount})`, "error")
        );
      }
      addLog(`Anomaly scan complete — ${data.flags?.length || 0} flag(s), ${data.autoBlocked?.length || 0} auto-blocked`, data.flags?.length ? "warn" : "success");
    } catch (e) {
      addLog("Anomaly detection error: " + e.message, "error");
    } finally {
      setAnomalyLoad(false);
    }
  };

  // ── Block / unblock user ────────────────────────────────────────────────────
  const blockUser = async (uid, email, duration, reason) => {
    setBlockLoad(uid);
    try {
      const data = await cfFetch("blockUser", { uid, duration, reason });
      addLog(`${duration === "unblock" ? "Unblocked" : duration === "permanent" ? "PERMANENTLY BLOCKED" : "Blocked 1hr"}: ${email} (offense #${data.blockCount || 1})`, duration === "unblock" ? "success" : "error");
      setLookupResult(p => p ? { ...p,
        blocked: duration === "permanent",
        blockedUntil: duration === "1h" ? new Date(Date.now() + 3600000) : null,
        blockCount: data.blockCount || 1,
      } : p);
      // Remove from anomaly list if acted on
      setAnomalies(prev => prev.filter(a => a.uid !== uid));
    } catch (e) {
      addLog("Block error: " + e.message, "error");
    } finally {
      setBlockLoad(null);
    }
  };

  // ── Delete user ─────────────────────────────────────────────────────────────
  const deleteUser = async (uid, email) => {
    if (!window.confirm(`Permanently delete ${email}? This removes ALL their tests, payments, and auth account. Cannot be undone.`)) return;
    setBlockLoad(uid);
    try {
      const data = await cfFetch("deleteUser", { uid });
      addLog(`DELETED: ${email} — ${data.testsDeleted} tests, ${data.paymentsDeleted} payments removed`, "error");
      setLookupResult(null);
      // Refresh student list
      loadData();
    } catch (e) {
      addLog("Delete error: " + e.message, "error");
    } finally {
      setBlockLoad(null);
    }
  };

  // ── Save admin notes ────────────────────────────────────────────────────────
  const saveAdminNotes = async (uid, notes) => {
    try {
      await setDoc(doc(db, "users", uid), { adminNotes: notes }, { merge: true });
      addLog(`Notes saved for ${uid.slice(0,8)}`, "success");
      setLookupResult(p => p ? { ...p, adminNotes: notes } : p);
    } catch (e) {
      addLog("Notes save error: " + e.message, "error");
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
  const mockCurrent   = cacheStatus?.Mock?.current ?? "—";
  const qpCurrent     = cacheStatus?.QuickPractice?.current ?? "—";
  const gatMockCurrent  = cacheStatus?.GAT_Mock?.current ?? "—";
  const gatQPCurrent    = cacheStatus?.GAT_QP?.current   ?? "—";
  const econMockCurrent = cacheStatus?.Economics_Mock?.current ?? "—";
  const econQPCurrent   = cacheStatus?.Economics_QP?.current  ?? "—";
  const cacheHealthy =
    cacheStatus &&
    mockCurrent >= CACHE_CONFIG.Mock.threshold &&
    qpCurrent >= CACHE_CONFIG.QuickPractice.threshold &&
    (gatMockCurrent  === "—" || gatMockCurrent  >= CACHE_CONFIG.GAT_Mock.threshold) &&
    (gatQPCurrent    === "—" || gatQPCurrent    >= CACHE_CONFIG.GAT_QP.threshold) &&
    (econMockCurrent === "—" || econMockCurrent >= CACHE_CONFIG.Economics_Mock.threshold) &&
    (econQPCurrent   === "—" || econQPCurrent   >= CACHE_CONFIG.Economics_QP.threshold);
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
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.9); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @media (max-width: 900px) {
          .kpi-grid { grid-template-columns: repeat(3,1fr) !important; }
          .live-section { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 700px) {
          /* Header — hide email chip, keep buttons */
          .admin-email-chip { display: none !important; }
          /* Status bar — smaller pills */
          .status-bar-wrap { padding: 5px 12px !important; gap: 6px !important; }
          /* Command bar */
          .cmd-bar { padding: 6px 12px !important; flex-wrap: wrap; gap: 6px !important; }
          /* Body padding */
          .admin-body { padding: 12px !important; }
          /* Cards */
          .admin-card { padding: 12px 14px !important; }
          /* Tab bar — scrollable */
          .admin-tab-bar { padding: 0 12px !important; overflow-x: auto; flex-wrap: nowrap !important; }
          .admin-tab-item { white-space: nowrap; font-size: 12px !important; padding: 10px 10px !important; }
          /* Tables — horizontal scroll */
          .admin-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          /* KPI tiles — smaller numbers */
          .kpi-val { font-size: 20px !important; }
          /* Anomaly panel */
          .anomaly-flag { flex-direction: column !important; }
          .anomaly-actions { flex-direction: row; flex-wrap: wrap; }
          /* User management input full width */
          .user-lookup-input { max-width: 100% !important; width: 100% !important; }
          /* Fill progress strip */
          .fill-strip { font-size: 11px !important; padding: 6px 10px !important; }
        }
        @media (max-width: 600px) {
          .kpi-grid { grid-template-columns: repeat(2,1fr) !important; }
          .admin-header-title { font-size: 12px !important; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerTitle} className="admin-header-title">Vantiq CUET · Admin</div>
          <span style={S.envBadge}>LIVE</span>
        </div>
        <div style={S.headerRight}>
          {fbUser ? (
            <>
              <span style={S.emailChip} className="admin-email-chip">{fbUser.email}</span>
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
            onClick={() => { loadData(); loadCacheStatus(); runAnomalyDetection(); }}
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

      {/* ── ANOMALY ALERT PANEL ─────────────────────────────────────────────── */}
      {anomalies.length > 0 && (
        <div style={{ background:"#FEF2F2", borderBottom:"2px solid #FECACA", padding:"10px 24px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>🚨</span>
              <span style={{ fontWeight:700, color:"#DC2626", fontSize:13 }}>
                {anomalies.filter(a=>!a.alreadyBlocked).length} Anomal{anomalies.filter(a=>!a.alreadyBlocked).length===1?"y":"ies"} Detected
              </span>
              {anomalyTs && <span style={{ fontSize:10, color:"#94A3B8" }}>· scanned {anomalyTs.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={runAnomalyDetection} disabled={anomalyLoad} style={{ ...S.btnSmall("muted"), fontSize:10, padding:"3px 10px" }}>
                {anomalyLoad?"Scanning…":"Re-scan"}
              </button>
              <button onClick={()=>setAnomalies([])} style={{ ...S.btnSmall("muted"), fontSize:10, padding:"3px 10px" }}>Dismiss</button>
            </div>
          </div>
          {anomalies.map((a,i) => (
            <div key={i} style={{ background:"#fff", border:`1px solid ${a.severity==="critical"?"#FECACA":"#FCD34D"}`, borderLeft:`4px solid ${a.severity==="critical"?"#DC2626":"#D97706"}`, borderRadius:8, padding:"10px 14px", marginBottom:6, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                  <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:a.severity==="critical"?"#DC2626":"#D97706" }}>
                    {a.severity==="critical"?"⛔ CRITICAL":"⚠️ WARNING"} · {a.pattern.replace(/_/g," ")}
                  </span>
                  {a.autoBlocked && <span style={{ fontSize:10, background:"#DC2626", color:"#fff", borderRadius:10, padding:"1px 7px", fontWeight:700 }}>{a.permanentlyBlocked?"PERM-BANNED":"AUTO-BLOCKED 1HR"}</span>}
                  {a.alreadyBlocked && <span style={{ fontSize:10, background:"#6B7280", color:"#fff", borderRadius:10, padding:"1px 7px" }}>already blocked</span>}
                </div>
                <div style={{ fontWeight:600, fontSize:12, color:"#0F2747", marginBottom:1 }}>{a.email}</div>
                <div style={{ fontSize:11, color:"#64748B" }}>{a.detail}</div>
                <div style={{ fontSize:11, color:"#94A3B8", fontStyle:"italic", marginTop:2 }}>💡 {a.suggestion}</div>
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0, paddingTop:2 }}>
                {!a.autoBlocked && !a.alreadyBlocked && (<>
                  <button onClick={()=>blockUser(a.uid,a.email,"1h",`Admin: ${a.pattern} — ${a.detail}`)} disabled={blockLoad===a.uid} style={{ ...S.btnSmall("danger"), fontSize:11 }}>{blockLoad===a.uid?"…":"Block 1h"}</button>
                  <button onClick={()=>blockUser(a.uid,a.email,"permanent",`Admin: ${a.pattern} — ${a.detail}. Permanent.`)} disabled={blockLoad===a.uid} style={{ ...S.btnSmall("danger"), fontSize:11, background:"#7F1D1D", borderColor:"#7F1D1D" }}>Perm Ban</button>
                </>)}
                <button onClick={()=>{setLookupEmail(a.email); setTimeout(lookupUser,50);}} style={{ ...S.btnSmall("muted"), fontSize:11 }}>Profile</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ZONE 1: STATUS BAR ── */}
      <div style={S.statusBar} className="status-bar-wrap">
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
          label="GAT Mock"
          value={gatMockCurrent === "—" ? "—" : `${gatMockCurrent}/${CACHE_CONFIG.GAT_Mock.size}`}
          color={gatMockCurrent === "—" || gatMockCurrent >= CACHE_CONFIG.GAT_Mock.threshold ? "#059669" : "#D97706"}
        />
        <StatusPill
          label="GAT QP"
          value={gatQPCurrent === "—" ? "—" : `${gatQPCurrent}/${CACHE_CONFIG.GAT_QP.size}`}
          color={gatQPCurrent === "—" || gatQPCurrent >= CACHE_CONFIG.GAT_QP.threshold ? "#059669" : "#D97706"}
        />
        <StatusPill
          label="Eco Mock"
          value={econMockCurrent === "—" ? "—" : `${econMockCurrent}/${CACHE_CONFIG.Economics_Mock.size}`}
          color={econMockCurrent === "—" || econMockCurrent >= CACHE_CONFIG.Economics_Mock.threshold ? "#059669" : "#D97706"}
        />
        <StatusPill
          label="Eco QP"
          value={econQPCurrent === "—" ? "—" : `${econQPCurrent}/${CACHE_CONFIG.Economics_QP.size}`}
          color={econQPCurrent === "—" || econQPCurrent >= CACHE_CONFIG.Economics_QP.threshold ? "#059669" : "#D97706"}
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
          {lastRefresh ? (
            <span style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span>↻ {lastRefresh.toLocaleTimeString("en-IN")}</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, background:"#EEF2FF", color:"#4338CA", borderRadius:10, padding:"1px 7px", fontWeight:700 }}>
                next in {nextRefreshIn}s
              </span>
            </span>
          ) : ""}
        </span>
      </div>

      {/* ── CACHE COMMAND CENTRE ── */}
      <CacheCommandCentre
        cacheStatus={cacheStatus}
        filling={filling}
        fillProgress={fillProgress}
        fillMode={fillMode}
        fillAllCache={fillAllCache}
        stopFill={stopFill}
        autoFillEnabled={autoFillEnabled}
        setAutoFillEnabled={setAutoFillEnabled}
        lastAutoCheck={lastAutoCheck}
        autoFillTriggered={autoFillTriggered}
      />

      {/* ── ZONE 2: COMMAND ROW ── */}
      <div style={S.commandRow}>
        <div style={S.commandLeft}>
          <button onClick={() => { loadData(); loadCacheStatus(); }} style={S.btnSmall()}>
            {loading ? <span style={S.spinner} /> : "↻ Refresh"}
          </button>
          <button onClick={runHealthCheck} style={S.btnSmall()}>
            {healthLoad ? <span style={S.spinner} /> : "Run Health Check"}
          </button>
          {/* Fill controls moved to Cache Command Centre above */}
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
          sub={onlineUsers.length > 0 ? "↓ see Who's Online" : "last 5 min"}
          accent="#059669"
          loading={false}
        />
      </div>

      {/* ── LIVE SECTION ── */}
      <div style={{ ...S.liveSection }} className="live-section">
        {/* Recent Activity — compact */}
        <div style={S.card}>
          <div style={{ ...S.cardHeader, paddingBottom: 6 }}>
            <span style={S.cardTitle}>Recent Activity</span>
            <span style={{ fontSize: 10, color: "#94A3B8" }}>last 10</span>
          </div>
          {recentActivity.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: 11, color: "#94A3B8" }}>No activity yet</div>
          ) : (
            recentActivity.map((a, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderBottom: i < recentActivity.length-1 ? "1px solid #F8FAFC" : "none", background: i%2===0?"#fff":"#FAFAFA" }}>
                <span style={{ fontSize:12, flexShrink:0 }}>{a.icon}</span>
                <span style={{ fontWeight:600, fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#0F2747", flex:1 }}>
                  {trunc(a.email, 22)}
                </span>
                <span style={{ color:"#94A3B8", fontFamily:"'JetBrains Mono',monospace", fontSize:10, whiteSpace:"nowrap", flexShrink:0 }}>
                  {a.time}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Student Breakdown — compact */}
        <div style={S.card}>
          <div style={{ ...S.cardHeader, paddingBottom: 6 }}>
            <span style={S.cardTitle}>Student Breakdown</span>
            <span style={{ fontSize: 10, color: "#94A3B8" }}>Mock ↓</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"2fr .6fr .6fr .8fr 1.2fr", padding:"5px 12px", borderBottom:"1px solid #F1F5F9" }}>
            {["Email","Mock","QP","Access","Last"].map(h => (
              <span key={h} style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", color:"#94A3B8", textAlign: h!=="Email"?"center":undefined }}>{h}</span>
            ))}
          </div>
          {userBreakdown.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: 11, color: "#94A3B8" }}>No students yet</div>
          ) : (
            userBreakdown.slice(0, 10).map((u, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr .6fr .6fr .8fr 1.2fr", padding:"5px 12px", borderBottom: i<9?"1px solid #F8FAFC":"none", background:i%2===0?"#fff":"#FAFAFA", alignItems:"center" }}>
                <span style={{ fontWeight:600, fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color: u.blocked?"#DC2626":"#0F2747" }}>
                  {u.blocked && "⛔ "}{trunc(u.email, 24)}
                </span>
                <span style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700 }}>{u.mock}</span>
                <span style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#4338CA" }}>{u.qp}</span>
                <span style={{ textAlign:"center" }}>
                  <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:10, background: u.unlocked?"#DCFCE7":"#EEF2FF", color: u.unlocked?"#059669":"#4338CA" }}>
                    {u.unlocked?"Pro":"Free"}
                  </span>
                </span>
                <span style={{ color:"#94A3B8", fontSize:10 }}>{fmt(u.lastTest)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── WHO'S ONLINE PANEL ── */}
      {onlineUsers.length > 0 && (
        <div style={{ margin:"0 0 16px", background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #F1F5F9" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:"#059669", display:"inline-block", animation:"pulse 2s ease-in-out infinite" }}/>
              <span style={{ fontSize:11, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"#0F2747" }}>
                Who's Online
              </span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700, color:"#059669", background:"#ECFDF5", padding:"1px 8px", borderRadius:10, border:"1px solid #BBF7D0" }}>
                {onlineUsers.length}
              </span>
            </div>
            <span style={{ fontSize:10, color:"#94A3B8" }}>active in last 5 min · updates every 60s</span>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:0 }}>
            {onlineUsers.map((u, i) => {
              const minsAgo = u.lastSeen ? Math.round((Date.now() - u.lastSeen) / 60000) : null;
              return (
                <div key={u.uid} style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"8px 16px",
                  borderBottom: i < onlineUsers.length - 1 ? "1px solid #F8FAFC" : "none",
                  width:"50%", boxSizing:"border-box",
                  borderRight: i % 2 === 0 ? "1px solid #F1F5F9" : "none",
                }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"#EEF2FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#4338CA" }}>
                      {(u.email || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#0F2747", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {u.email}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:1 }}>
                      <span style={{ width:5, height:5, borderRadius:"50%", background:"#6EE7B7", display:"inline-block" }}/>
                      <span style={{ fontSize:10, color:"#94A3B8" }}>
                        {minsAgo !== null ? (minsAgo === 0 ? "just now" : `${minsAgo}m ago`) : "—"}
                        {u.screen && u.screen !== "—" ? ` · ${u.screen}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB BAR ── */}
      <div style={S.tabBar} className="admin-tab-bar">
        {["students", "platform", "payments", "content", "qa", "settings"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={S.tabItem(activeTab === t)} className="admin-tab-item"
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
            <div style={{ padding: "10px 14px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  style={{ ...S.input, maxWidth: 280, fontSize: 12 }} className="user-lookup-input"
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
                      {/* Block status banner */}
                      {(lookupResult.blocked || lookupResult.blockedUntil) && (
                        <div style={{ background: lookupResult.blocked ? "#FEF2F2" : "#FEF3C7", border: `1px solid ${lookupResult.blocked ? "#FECACA" : "#FCD34D"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                          <div style={{ fontWeight: 700, color: lookupResult.blocked ? "#DC2626" : "#D97706", fontSize: 12, marginBottom: 3 }}>
                            {lookupResult.blocked ? "⛔ PERMANENTLY BLOCKED" : `⚠️ BLOCKED UNTIL ${new Date(lookupResult.blockedUntil?.toDate ? lookupResult.blockedUntil.toDate() : lookupResult.blockedUntil).toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit"})}`}
                          </div>
                          {lookupResult.blockReason && <div style={{ fontSize: 11, color: "#64748B" }}>{lookupResult.blockReason}</div>}
                          {lookupResult.blockCount > 0 && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 3 }}>Offense #{lookupResult.blockCount}</div>}
                        </div>
                      )}

                      {/* Info grid — 3 columns, compact */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 10px", marginBottom: 12 }}>
                        {[
                          ["Email",      lookupResult.email,                                   false],
                          ["Access",     lookupResult.unlocked ? "Paid / Pro" : "Free",        false],
                          ["Tests Used", lookupResult.testsUsed ?? 0,                          true ],
                          ["Joined",     fmt(lookupResult.createdAt),                          false],
                          ["Last Test",  fmt(lookupResult.lastTestAt),                         false],
                          ["Block Count",lookupResult.blockCount ?? 0,                         true ],
                        ].map(([k, v, mono]) => (
                          <div key={k}>
                            <div style={{ fontSize: 9, textTransform: "uppercase", color: "#94A3B8", letterSpacing: "0.06em", marginBottom: 1 }}>{k}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit", color: k==="Block Count" && v > 0 ? "#DC2626" : "#0F2747" }}>{v ?? "—"}</div>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons — all controls */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                        {/* Access controls */}
                        {!lookupResult.unlocked
                          ? <button onClick={() => grantAccess(lookupResult.id)} style={S.btnSmall("primary")}>Grant Pro Access</button>
                          : <button onClick={() => revokeAccess(lookupResult.id)} style={S.btnSmall("danger")}>Revoke Access</button>
                        }
                        <button onClick={() => resetFreeLimit(lookupResult.id)} style={S.btnSmall()}>Reset Free Limit</button>

                        {/* Block controls */}
                        {lookupResult.blocked || lookupResult.blockedUntil ? (
                          <button
                            onClick={() => blockUser(lookupResult.id, lookupResult.email, "unblock", "")}
                            disabled={blockLoad === lookupResult.id}
                            style={{ ...S.btnSmall("primary"), background: "#059669", borderColor: "#059669" }}
                          >
                            {blockLoad === lookupResult.id ? "…" : "✓ Unblock"}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => blockUser(lookupResult.id, lookupResult.email, "1h", "Admin: manual 1-hour suspension")}
                              disabled={blockLoad === lookupResult.id}
                              style={S.btnSmall("danger")}
                            >
                              {blockLoad === lookupResult.id ? "…" : "Block 1 Hour"}
                            </button>
                            <button
                              onClick={() => blockUser(lookupResult.id, lookupResult.email, "permanent", "Admin: permanent ban")}
                              disabled={blockLoad === lookupResult.id}
                              style={{ ...S.btnSmall("danger"), background: "#7F1D1D", borderColor: "#7F1D1D" }}
                            >
                              Perm Ban
                            </button>
                          </>
                        )}

                        {/* Delete — destructive, right-aligned visually */}
                        <button
                          onClick={() => deleteUser(lookupResult.id, lookupResult.email)}
                          disabled={blockLoad === lookupResult.id}
                          style={{ ...S.btnSmall("danger"), marginLeft: "auto", background: "#1F2937", borderColor: "#1F2937" }}
                        >
                          🗑 Delete Account
                        </button>
                      </div>

                      {/* Admin notes */}
                      <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 10 }}>
                        <div style={{ fontSize: 9, textTransform: "uppercase", color: "#94A3B8", letterSpacing: ".06em", marginBottom: 4 }}>Admin Notes (internal only)</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <textarea
                            value={notesUid === lookupResult.id ? adminNotes : (lookupResult.adminNotes || "")}
                            onChange={e => { setNotesUid(lookupResult.id); setAdminNotes(e.target.value); }}
                            rows={2}
                            placeholder="Add private notes about this user…"
                            style={{ flex: 1, fontSize: 11, border: "1px solid #E2E8F0", borderRadius: 6, padding: "6px 8px", fontFamily: "inherit", resize: "vertical" }}
                          />
                          <button
                            onClick={() => saveAdminNotes(lookupResult.id, notesUid === lookupResult.id ? adminNotes : (lookupResult.adminNotes || ""))}
                            style={{ ...S.btnSmall("primary"), alignSelf: "flex-end", fontSize: 11 }}
                          >Save</button>
                        </div>
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
            <div style={{ overflowX: "auto" }} className="admin-table-wrap">
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
            <div style={{ overflowX: "auto" }} className="admin-table-wrap">
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
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <button onClick={() => fillMode("GAT_Mock")} style={{ ...S.btnSmall("primary"), background:"#DC2626" }}>
                  {filling && fillProgress?.targetMode==="GAT_Mock" ? "⏳…" : "⚡ GAT Mock"}
                </button>
                <button onClick={() => fillMode("GAT_QP")} style={{ ...S.btnSmall("primary"), background:"#EA580C" }}>
                  {filling && fillProgress?.targetMode==="GAT_QP" ? "⏳…" : "⚡ GAT QP"}
                </button>
                <button onClick={() => fillMode("Economics_Mock")} style={{ ...S.btnSmall("primary"), background:"#0891B2" }}>
                  {filling && fillProgress?.targetMode==="Economics_Mock" ? "⏳…" : "⚡ Eco Mock"}
                </button>
                <button onClick={() => fillMode("Economics_QP")} style={{ ...S.btnSmall("primary"), background:"#0E7490" }}>
                  {filling && fillProgress?.targetMode==="Economics_QP" ? "⏳…" : "⚡ Eco QP"}
                </button>
                <button onClick={() => fillMode("Mock")} style={S.btnSmall()} disabled={filling}>
                  Eng Mock
                </button>
                <button onClick={() => fillMode("QuickPractice")} style={S.btnSmall()} disabled={filling}>
                  Eng QP
                </button>
                <button onClick={fillAllCache} style={S.btnSmall("primary")} disabled={filling}>
                  {filling && !fillProgress?.targetMode ? "Filling All…" : "Fill All"}
                </button>
              </div>
            </div>
            {Object.entries(CACHE_CONFIG).map(([mode, config]) => (
              <CacheBar
                key={mode}
                mode={mode}
                config={config}
                current={cacheStatus?.[mode]?.current ?? 0}
              />
            ))}
            <div style={{ padding: "10px 14px", display:"flex", gap:6, flexWrap:"wrap", borderTop:"1px solid #F1F5F9" }}>
              <button onClick={loadCacheStatus} style={S.btnSmall()}>
                ↻ Refresh Status
              </button>
              {["English","GAT","Economics"].map(subj => (
                <button key={subj} onClick={() => clearAndRebuildCache(subj)}
                  style={{ ...S.btnSmall(), color:"#DC2626", borderColor:"#FCA5A5" }}
                  title={`Clear all ${subj} cached sets and trigger fresh rebuild`}>
                  ↺ Rebuild {subj}
                </button>
              ))}
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
              <div style={{ overflowX: "auto" }} className="admin-table-wrap">
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

          {/* Claude API Usage Monitor */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Claude API Usage</span>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {["today","week","month"].map(t => (
                  <button key={t} onClick={() => setUsageTab(t)} style={{
                    ...S.btnSmall(), padding:"3px 10px",
                    background: usageTab === t ? "#0F2747" : "transparent",
                    color: usageTab === t ? "#fff" : "inherit",
                    borderColor: usageTab === t ? "#0F2747" : undefined,
                  }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
                <button onClick={loadApiUsage} style={S.btnSmall()} disabled={usageLoading}>
                  {usageLoading ? <span style={S.spinner} /> : "↻ Load"}
                </button>
              </div>
            </div>
            <div style={{ padding: "14px 16px" }}>
              {!usageData ? (
                <div style={{ fontSize:12, color:"#94A3B8", marginBottom:12 }}>
                  Click ↻ Load to fetch usage data from Firestore.
                </div>
              ) : (() => {
                const d = usageData[usageTab] || {};
                const inT  = (d.totalInputTokens  || 0).toLocaleString("en-IN");
                const outT = (d.totalOutputTokens || 0).toLocaleString("en-IN");
                const cost = (d.totalCostUSD || 0).toFixed(4);
                const calls = (d.totalCalls || 0).toLocaleString("en-IN");
                return (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:14 }}>
                    {[
                      { label:"API Calls",       val: calls },
                      { label:"Input Tokens",    val: inT },
                      { label:"Output Tokens",   val: outT },
                      { label:"Est. Cost (USD)", val: `$${cost}` },
                    ].map(s => (
                      <div key={s.label} style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:8, padding:"10px 12px" }}>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:700, color:"#0F2747" }}>{s.val}</div>
                        <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{s.label} · {usageTab}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div style={{ borderTop:"1px solid #E2E8F0", paddingTop:12 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#64748B", textTransform:"uppercase", letterSpacing:".05em", marginBottom:8 }}>
                  Prepaid Balance Tracker
                </div>
                {balanceData ? (
                  <div style={{ display:"flex", gap:20, marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:11, color:"#94A3B8" }}>Last refill</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:700, color:"#059669" }}>
                        ${balanceData.balanceUSD?.toFixed(2)}
                      </div>
                      <div style={{ fontSize:10, color:"#94A3B8" }}>{balanceData.refilledAtDisplay}</div>
                    </div>
                    {usageData?.month && (
                      <div>
                        <div style={{ fontSize:11, color:"#94A3B8" }}>Est. remaining</div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:700,
                          color:(balanceData.balanceUSD-(usageData.month.totalCostUSD||0))<10?"#DC2626":"#0F2747" }}>
                          ${Math.max(0,balanceData.balanceUSD-(usageData.month.totalCostUSD||0)).toFixed(2)}
                        </div>
                        <div style={{ fontSize:10, color:"#94A3B8" }}>after 30-day spend</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize:11, color:"#94A3B8", marginBottom:8 }}>No refill recorded yet.</div>
                )}
                {usageData?.month && balanceData && (balanceData.balanceUSD-(usageData.month.totalCostUSD||0))<10 && (
                  <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:6, padding:"6px 10px", fontSize:11, color:"#DC2626", fontWeight:600, marginBottom:10 }}>
                    ⚠ Estimated remaining below $10 — refill at console.anthropic.com
                  </div>
                )}
                <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                  <input type="number" step="0.01" min="0" placeholder="e.g. 50.00"
                    value={balanceInput} onChange={e => setBalanceInput(e.target.value)}
                    style={{ width:110, padding:"5px 8px", border:"1px solid #E2E8F0", borderRadius:6, fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}
                  />
                  <button onClick={saveBalanceRefill} style={S.btnSmall("primary")} disabled={savingBalance || !balanceInput}>
                    {savingBalance ? "Saving…" : "Record Refill ($)"}
                  </button>
                  <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:11, color:"#4338CA", textDecoration:"none" }}>
                    → Anthropic Console ↗
                  </a>
                </div>
                <div style={{ fontSize:10, color:"#CBD5E1", marginTop:6 }}>
                  Estimates: Haiku $0.80/$4.00 · Sonnet $3.00/$15.00 per million tokens. Actual billing may vary.
                </div>
              </div>
            </div>
          </div>

          {/* Intelligence */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>CUET Intelligence</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={() => updateIntelligence("English")}
                  style={S.btnSmall()}
                  disabled={intelGenLoad}
                  title="Generates fresh NTA pattern analysis and stores in Firestore. Does NOT clear the question cache — existing sets continue serving. To force fresh generation, use ↺ Rebuild English button."
                >
                  {intelGenLoad ? <span style={S.spinner} /> : "Update English"}
                </button>
                <button
                  onClick={runGATCARefresh}
                  style={{ ...S.btnSmall(), background: gatCALoad ? "#94A3B8" : "#059669", color: "#fff" }}
                  disabled={gatCALoad}
                  title="Fetches latest India current affairs via web search and refreshes GAT CA context in Firestore"
                >
                  {gatCALoad ? "Fetching..." : "↺ Refresh GAT CA"}
                </button>
                <button
                  onClick={runEconDataRefresh}
                  style={{ ...S.btnSmall(), background: econDataLoad ? "#94A3B8" : "#0891B2", color: "#fff" }}
                  disabled={econDataLoad}
                  title="Fetches latest Indian economy data via web search and refreshes Economics data context in Firestore"
                >
                  {econDataLoad ? "Fetching..." : "↺ Refresh Econ Data"}
                </button>
              </div>
            </div>
            <div style={{ padding: 14 }}>
              {/* Coverage pills */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {[
                  { label: "English 101",                    color: "#059669" },
                  { label: "GAT 501",                        color: "#059669" },
                  { label: "Economics 118 — ready to launch", color: "#0891B2" },
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
              {gatCAResult && (
                <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginBottom: 8, padding: "6px 10px", background: "#ECFDF5", borderRadius: 6 }}>
                  GAT CA: v{gatCAResult.refreshVersion} · {gatCAResult.contextLength} chars · {gatCAResult.cacheInvalidated} sets cleared
                </div>
              )}
              {econDataResult && (
                <div style={{ fontSize: 11, color: "#0891B2", fontWeight: 600, marginBottom: 10, padding: "6px 10px", background: "#ECFEFF", borderRadius: 6 }}>
                  Econ Data: v{econDataResult.refreshVersion} · {econDataResult.contextLength} chars · {econDataResult.cacheInvalidated} sets cleared
                </div>
              )}
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

      {/* ── QA / CURATION TAB ── */}
      {activeTab === "qa" && (
        <div style={S.tabPanel}>
          {/* ── BULK AUDIT SECTION ── */}
          <div style={{ background: "linear-gradient(135deg,#0F2747,#1a3a6b)", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>⚡ Bulk Cache Accuracy Audit</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>
              Scans every existing cached question set, fixes wrong correct indices, and removes approximate-answer questions. Works across all modes and subjects.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: auditProgress ? 12 : 0 }}>
              {["all","Economics_Mock","Economics_QP","GAT_Mock","GAT_QP","Mock","QuickPractice"].map(m => (
                <button key={m}
                  disabled={auditRunning}
                  onClick={async () => {
                    if (!window.confirm(`Run bulk accuracy audit on ${m === "all" ? "ALL cached sets" : m}? This will auto-fix wrong answers and remove approximate questions. May take several minutes.`)) return;
                    setAuditRunning(true);
                    setAuditProgress({ scanned: 0, fixed: 0, rejected: 0, done: false, batches: 0 });
                    const adminKey = functions.config ? undefined : undefined; // passed via cfFetch
                    let startAfter = null;
                    let totalScanned = 0, totalFixed = 0, totalRejected = 0, batches = 0;
                    try {
                      while (true) {
                        const body = { mode: m === "all" ? undefined : m, limit: 15, startAfter, dryRun: false };
                        if (m === "all") delete body.mode;
                        const result = await cfFetch("auditCacheAccuracy", body);
                        batches++;
                        totalScanned  += result.scanned || 0;
                        totalFixed    += result.totalFixed || 0;
                        totalRejected += result.totalRejected || 0;
                        setAuditProgress({ scanned: totalScanned, fixed: totalFixed, rejected: totalRejected, done: result.done, batches, mode: m });
                        addLog(`Audit batch ${batches}: scanned=${totalScanned} fixed=${totalFixed} rejected=${totalRejected}`, totalFixed > 0 ? "warn" : "info");
                        if (result.done || !result.lastDocId) break;
                        startAfter = result.lastDocId;
                        await new Promise(r => setTimeout(r, 500));
                      }
                      addLog(`✅ Audit complete: ${totalScanned} sets scanned, ${totalFixed} answers fixed, ${totalRejected} bad questions removed`, "success");
                    } catch(e) {
                      addLog("Audit error: " + e.message, "error");
                    } finally { setAuditRunning(false); }
                  }}
                  style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: auditRunning ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)", color: "#fff", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-body)", cursor: auditRunning ? "not-allowed" : "pointer" }}>
                  {m === "all" ? "🔍 Audit All" : m}
                </button>
              ))}
            </div>
            {auditProgress && (
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {[
                    { l: "Scanned", v: auditProgress.scanned, c: "#fff" },
                    { l: "Fixed", v: auditProgress.fixed, c: "#FCD34D" },
                    { l: "Removed", v: auditProgress.rejected, c: "#FCA5A5" },
                    { l: "Batches", v: auditProgress.batches, c: "#94A3B8" },
                  ].map(s => (
                    <div key={s.l}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: ".05em" }}>{s.l}</div>
                    </div>
                  ))}
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                    {auditRunning
                      ? <span style={{ fontSize: 12, color: "#FCD34D", fontWeight: 600 }}>⏳ Running...</span>
                      : <span style={{ fontSize: 12, color: "#6EE7B7", fontWeight: 600 }}>✅ Complete</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── MANUAL REVIEW SECTION ── */}
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>Manual Question Review</span>
            <select
              value={qaMode}
              onChange={e => { setQaMode(e.target.value); setQaQuestions(null); setQaEdits({}); setQaMsg(null); }}
              style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              {["Economics_Mock","Economics_QP","GAT_Mock","GAT_QP","Mock","QuickPractice"].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button
              style={{ ...S.btnSmall("primary"), background: "#4338CA" }}
              onClick={async () => {
                setQaLoading(true); setQaQuestions(null); setQaEdits({}); setQaMsg(null);
                try {
                  // Pull a random cached set for this mode
                  const snap = await import("firebase/firestore").then(async ({ collection, query, where, getDocs }) => {
                    const q = query(collection(db, "questionCache"), where("mode", "==", qaMode));
                    return getDocs(q);
                  }).catch(() => null);
                  if (!snap || snap.empty) { setQaMsg("No cached sets found for this mode."); return; }
                  const docs = snap.docs;
                  const picked = docs[Math.floor(Math.random() * docs.length)];
                  setQaQuestions({ id: picked.id, questions: picked.data().questions || [], mode: qaMode });
                  setQaMsg(`Loaded ${picked.data().questions?.length} questions from set ${picked.id.substring(0,8)}...`);
                } catch(e) {
                  setQaMsg("Error loading questions: " + e.message);
                } finally { setQaLoading(false); }
              }}
            >
              {qaLoading ? "Loading..." : "Load Random Set"}
            </button>
            {qaQuestions && Object.keys(qaEdits).length > 0 && (
              <button
                style={{ ...S.btnSmall("primary"), background: "#DC2626" }}
                onClick={async () => {
                  setQaSaving(true);
                  try {
                    const { doc, updateDoc } = await import("firebase/firestore");
                    const corrected = qaQuestions.questions.map((q, i) =>
                      qaEdits[i] !== undefined ? { ...q, correct: qaEdits[i] } : q
                    );
                    await updateDoc(doc(db, "questionCache", qaQuestions.id), { questions: corrected });
                    setQaQuestions(prev => ({ ...prev, questions: corrected }));
                    setQaEdits({});
                    setQaMsg(`✓ Saved ${Object.keys(qaEdits).length} correction(s) to Firestore`);
                  } catch(e) { setQaMsg("Save failed: " + e.message); }
                  finally { setQaSaving(false); }
                }}
              >
                {qaSaving ? "Saving..." : `Save ${Object.keys(qaEdits).length} Fix${Object.keys(qaEdits).length !== 1 ? "es" : ""}`}
              </button>
            )}
          </div>

          {qaMsg && (
            <div style={{ padding: "8px 14px", borderRadius: 8, background: qaMsg.startsWith("✓") ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${qaMsg.startsWith("✓") ? "#6EE7B7" : "#FECACA"}`, fontSize: 12, color: qaMsg.startsWith("✓") ? "#059669" : "#DC2626", marginBottom: 14 }}>
              {qaMsg}
            </div>
          )}

          {qaQuestions && (
            <div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                Review each question. If the correct answer index is wrong, click the right option below. Highlighted in red = mismatched (explanation contradicts marked answer).
              </p>
              {qaQuestions.questions.map((q, i) => {
                const editedCorrect = qaEdits[i] !== undefined ? qaEdits[i] : q.correct;
                // Simple heuristic: flag if explanation contains a number that matches a different option
                const explLower = (q.explanation || "").toLowerCase();
                const markedOption = q.options[q.correct] || "";
                const markedNum = parseFloat(markedOption.replace(/[^0-9.]/g, ""));
                const approxFlag = explLower.includes("approximately") || explLower.includes("closest") || explLower.includes("nearest");
                const isFlagged = approxFlag;
                return (
                  <div key={i} style={{ border: `1.5px solid ${isFlagged ? "#FECACA" : editedCorrect !== q.correct ? "#FDE68A" : "var(--border)"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12, background: isFlagged ? "#FEF2F2" : editedCorrect !== q.correct ? "#FFFBEB" : "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>Q{i+1}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 10, background: "#EEF2FF", color: "#4338CA" }}>{q.topic}</span>
                      {isFlagged && <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", background: "#FEF2F2", padding: "1px 7px", borderRadius: 10, border: "1px solid #FECACA" }}>⚠ APPROXIMATE ANSWER</span>}
                      {editedCorrect !== q.correct && <span style={{ fontSize: 10, fontWeight: 700, color: "#D97706", background: "#FFFBEB", padding: "1px 7px", borderRadius: 10, border: "1px solid #FDE68A" }}>Edited</span>}
                    </div>
                    <p style={{ fontSize: 12, color: "var(--navy)", fontWeight: 500, marginBottom: 10, lineHeight: 1.55 }}>{q.question}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {q.options.map((opt, oi) => (
                        <button key={oi} onClick={() => setQaEdits(prev => ({ ...prev, [i]: oi }))}
                          style={{ padding: "5px 12px", borderRadius: 6, border: `2px solid ${editedCorrect === oi ? "#059669" : "var(--border)"}`, background: editedCorrect === oi ? "#ECFDF5" : "#fff", color: editedCorrect === oi ? "#059669" : "var(--text-secondary)", fontSize: 12, fontWeight: editedCorrect === oi ? 700 : 400, fontFamily: "var(--font-body)", cursor: "pointer" }}>
                          {String.fromCharCode(65+oi)}. {opt}
                          {editedCorrect === oi && " ✓"}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", background: "var(--bg-alt)", borderRadius: 6, padding: "7px 10px", lineHeight: 1.55 }}>
                      <strong style={{ color: "var(--navy)" }}>Explanation:</strong> {q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
