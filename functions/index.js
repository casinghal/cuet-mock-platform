/**
 * Firebase Cloud Functions — Vantiq CUET Platform
 * v4.9.0 — Cache-first architecture with per-student deduplication
 *
 * LIMITS:
 * - FREE_LIMIT: 4 tests before paywall
 * - DAILY_TEST_LIMIT: 15 tests per day (paid users only)
 * - Cache: 30 sets per mode, filled via triggerCacheWarm endpoint
 * - Per-student deduplication: usedCacheSetIds[]
 *
 * NOTE: warmQuestionCache (scheduled) excluded — needs Cloud Scheduler setup
 * Use triggerCacheWarm HTTP endpoint to fill cache manually or via cron job
 */
const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const axios     = require("axios");
const crypto    = require("crypto");
const Razorpay  = require("razorpay");

admin.initializeApp();
const db               = admin.firestore();
const FREE_LIMIT       = 4;
const UNLOCK_AMOUNT    = 19900;
const CACHE_SIZE       = 30;
const CACHE_TTL_MS     = 7 * 24 * 60 * 60 * 1000;
const DAILY_TEST_LIMIT = 15;
const MODES            = ["Practice", "Mock", "SpeedDrill"];

function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function setCORS(res) {
  res.set("Access-Control-Allow-Origin",  "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function verifyToken(req, res) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return null; }
  try { return await admin.auth().verifyIdToken(h.split("Bearer ")[1]); }
  catch (e) { res.status(401).json({ error: "Invalid token" }); return null; }
}

function extractJSON(rawText) {
  let cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  const firstBrace   = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const end = cleaned.lastIndexOf("}");
    if (end > firstBrace) cleaned = cleaned.substring(firstBrace, end + 1);
  } else if (firstBracket !== -1) {
    const end = cleaned.lastIndexOf("]");
    if (end > firstBracket) cleaned = cleaned.substring(firstBracket, end + 1);
  }
  try { return JSON.parse(cleaned); } catch (e1) {}
  const fixed = cleaned.replace(/,\s*([}\]])/g, "$1");
  try { return JSON.parse(fixed); } catch (e2) {}
  functions.logger.error("JSON_EXTRACT_FAILED", { raw_preview: rawText.substring(0, 300) });
  throw new Error("JSON extraction failed");
}

async function callAnthropic(prompt, maxTokens, apiKey) {
  const r = await axios.post(
    "https://api.anthropic.com/v1/messages",
    { model: "claude-haiku-4-5-20251001", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] },
    { headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, timeout: 105000 }
  );
  if (r.data?.stop_reason === "max_tokens") throw new Error("TRUNCATION");
  const parsed = extractJSON(r.data?.content?.[0]?.text || "");
  return parsed.questions || parsed;
}

function buildPrompts(mode) {
  const diffMap = {
    Practice:   "medium — concept building, accessible vocabulary",
    Mock:       "challenging — full NTA exam standard",
    SpeedDrill: "moderate — speed-optimised, clear question stems",
  };
  const diff = diffMap[mode] || diffMap.Mock;
  const promptA = `You are an NTA CUET English (101) question paper generator.
Generate exactly 28 MCQ questions. Return ONLY a JSON object — no markdown, no preamble.
JSON schema:
{"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"topic":"Reading Comprehension","passage":"full passage text or null","explanation":"2-3 sentences"}]}
Topic distribution (MANDATORY):
- Reading Comprehension: 15 questions across 2 passages (Passage 1: factual 250-300 words × 8q, Passage 2: narrative 250-300 words × 7q)
- Synonyms and Antonyms: 9 questions (passage = null)
- Sentence Rearrangement: 4 questions (passage = null)
Rules: correct is 0-indexed. All RC questions sharing a passage must have identical passage text. Explanation: 2-3 sentences. Mode: ${mode} | Difficulty: ${diff}
Return ONLY the JSON object. Begin with { — nothing before it.`;
  const promptB = `You are an NTA CUET English (101) question paper generator.
Generate exactly 22 MCQ questions. Return ONLY a JSON object — no markdown, no preamble.
JSON schema:
{"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"topic":"Reading Comprehension","passage":"full passage text or null","explanation":"2-3 sentences"}]}
Topic distribution (MANDATORY):
- Reading Comprehension: 7 questions (Passage 3: literary/philosophical 250-300 words × 7q)
- Sentence Rearrangement: 3 questions (passage = null)
- Choosing Correct Word: 7 questions (passage = null)
- Match the Following: 3 questions (passage = null)
- Grammar and Vocabulary: 2 questions (passage = null)
Rules: correct is 0-indexed. All RC questions sharing a passage must have identical passage text. Explanation: 2-3 sentences. Mode: ${mode} | Difficulty: ${diff}
Return ONLY the JSON object. Begin with { — nothing before it.`;
  return { promptA, promptB };
}

async function generateQuestionSet(mode, apiKey) {
  const { promptA, promptB } = buildPrompts(mode);
  const [batchA, batchB] = await Promise.all([
    callAnthropic(promptA, 4500, apiKey),
    callAnthropic(promptB, 3500, apiKey),
  ]);
  const questions = [...batchA, ...batchB];
  if (questions.length < 40) throw new Error(`INCOMPLETE_SET:${questions.length}`);
  return questions;
}

// ─── MANUAL CACHE TRIGGER ────────────────────────────────────────────────────
exports.triggerCacheWarm = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    setCORS(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    try {
      const adminKey    = req.headers["x-admin-key"] || "";
      const cfg         = functions.config();
      const expectedKey = cfg.admin?.key || process.env.ADMIN_KEY || "";
      if (!adminKey || adminKey !== expectedKey) {
        res.status(403).json({ error: "Forbidden", received: adminKey.substring(0,4), expected_prefix: expectedKey.substring(0,4) }); return;
      }
      const KEY = cfg.anthropic?.api_key || process.env.ANTHROPIC_API_KEY;
      if (!KEY) { res.status(500).json({ error: "No API key configured" }); return; }
      const cutoff = new Date(Date.now() - CACHE_TTL_MS);
      const status = {};
      for (const mode of MODES) {
        const snap = await db.collection("questionCache").where("mode", "==", mode).get();
        const fresh = snap.docs.filter(d => d.data().createdAt?.toDate() > cutoff);
        status[mode] = { current: fresh.length, needed: Math.max(0, CACHE_SIZE - fresh.length) };
      }
      res.status(200).json({ message: "Cache warming started", status });
      (async () => {
        functions.logger.info("CACHE_WARM_START");
        for (const mode of MODES) {
          const existing = await db.collection("questionCache").where("mode", "==", mode).get();
          const fresh    = existing.docs.filter(d => d.data().createdAt?.toDate() > cutoff);
          const needed   = Math.max(0, CACHE_SIZE - fresh.length);
          for (let i = 0; i < needed; i++) {
            try {
              const questions = await generateQuestionSet(mode, KEY);
              await db.collection("questionCache").add({ mode, questions, createdAt: admin.firestore.FieldValue.serverTimestamp(), questionCount: questions.length });
              await new Promise(r => setTimeout(r, 2000));
            } catch (e) { functions.logger.error("CACHE_SET_FAILED", { mode, error: e.message }); }
          }
        }
        functions.logger.info("CACHE_WARM_COMPLETE");
      })();
    } catch (e) {
      functions.logger.error("TRIGGER_CACHE_CRASHED", { error: e.message, stack: e.stack });
      res.status(500).json({ error: "Function error: " + e.message });
    }
  });

// ─── 1. generateQuestions ────────────────────────────────────────────────────
exports.generateQuestions = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    setCORS(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }
    const startTime = Date.now();
    const decoded   = await verifyToken(req, res);
    if (!decoded) return;
    const uid = decoded.uid;
    let userDoc;
    try {
      const snap = await db.collection("users").doc(uid).get();
      userDoc    = snap.data() || {};
    } catch (e) { res.status(500).json({ error: "Could not verify access. Please try again." }); return; }
    const isUnlocked = !!(userDoc.unlocked);
    const testsUsed  = userDoc.testsUsed || 0;
    if (!isUnlocked && testsUsed >= FREE_LIMIT) { res.status(402).json({ error: "free_limit_reached", paywall: true }); return; }
    if (isUnlocked) {
      const today      = todayIST();
      const dailyCount = (userDoc.dailyTests || {})[today] || 0;
      if (dailyCount >= DAILY_TEST_LIMIT) {
        res.status(429).json({ error: "Don't stress yourself too much today. Attempt more tests tomorrow.", code: "daily_limit_reached" }); return;
      }
    }
    const mode       = (req.body.config || {}).mode || "Mock";
    const usedSetIds = userDoc.usedCacheSetIds || [];
    const cutoff     = new Date(Date.now() - CACHE_TTL_MS);
    functions.logger.info("GENERATION_START", { uid, mode, usedCount: usedSetIds.length });
    let cacheDoc = null;
    try {
      const allSnap   = await db.collection("questionCache").where("mode", "==", mode).get();
      // Filter by TTL client-side to avoid composite index requirement
      const usedSet   = new Set(usedSetIds);
      const available = allSnap.docs.filter(d => !usedSet.has(d.id) && d.data().createdAt?.toDate() > cutoff);
      if (available.length > 0) cacheDoc = available[Math.floor(Math.random() * available.length)];
    } catch (e) { functions.logger.error("CACHE_QUERY_FAILED", { uid, error: e.message }); res.status(500).json({ error: "Could not load your test. Please try again." }); return; }
    if (!cacheDoc) {
      functions.logger.info("CACHE_EXHAUSTED_FOR_USER", { uid, mode });
      res.status(503).json({ error: "You have completed all available tests for this mode. More tests are being prepared — please check back later.", code: "no_tests_available" }); return;
    }
    const questions = cacheDoc.data().questions;
    const setId     = cacheDoc.id;
    const today     = todayIST();
    try {
      await db.collection("users").doc(uid).update({
        testsUsed: admin.firestore.FieldValue.increment(1),
        lastTestAt: admin.firestore.FieldValue.serverTimestamp(),
        usedCacheSetIds: admin.firestore.FieldValue.arrayUnion(setId),
        [`dailyTests.${today}`]: admin.firestore.FieldValue.increment(1),
      });
    } catch (e) { functions.logger.error("COUNTER_UPDATE_FAIL", { uid }); }
    functions.logger.info("GENERATION_COMPLETE", { uid, mode, setId, source: "cache", questionCount: questions.length, durationMs: Date.now() - startTime });
    res.status(200).json({ questions });
  });

// ─── 2. generateAdvisory ─────────────────────────────────────────────────────
exports.generateAdvisory = functions.runWith({ timeoutSeconds: 60, memory: "128MB" }).https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }
  const decoded = await verifyToken(req, res); if (!decoded) return;
  const { prompt } = req.body;
  const KEY = functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY;
  try {
    const r = await axios.post("https://api.anthropic.com/v1/messages",
      { model: "claude-sonnet-4-6", max_tokens: 500, messages: [{ role: "user", content: prompt }] },
      { headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" }, timeout: 55000 });
    res.status(200).json({ text: r.data?.content?.[0]?.text || "Keep practising — consistency is key." });
  } catch (e) { res.status(200).json({ text: "Analysis unavailable. Focus on weak topics before next test." }); }
});

// ─── 3. checkTestLimit ───────────────────────────────────────────────────────
exports.checkTestLimit = functions.runWith({ timeoutSeconds: 20, memory: "256MB" }).https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }
  const decoded = await verifyToken(req, res); if (!decoded) return;
  const uid = decoded.uid;
  try {
    const snap       = await db.collection("users").doc(uid).get();
    const ud         = snap.data() || {};
    const isUnlocked = !!(ud.unlocked);
    const testsUsed  = ud.testsUsed || 0;
    const today      = todayIST();
    const dailyCount = (ud.dailyTests || {})[today] || 0;
    const freemiumBlocked = !isUnlocked && testsUsed >= FREE_LIMIT;
    const dailyBlocked    = isUnlocked && dailyCount >= DAILY_TEST_LIMIT;
    const allowed         = !freemiumBlocked && !dailyBlocked;
    const testsRemaining  = isUnlocked ? Math.max(0, DAILY_TEST_LIMIT - dailyCount) : Math.max(0, FREE_LIMIT - testsUsed);
    const limitLabel      = isUnlocked ? `${testsRemaining} tests remaining today` : `${testsRemaining} free tests remaining`;
    res.status(200).json({ allowed, isUnlocked, testsUsed, freeLimit: FREE_LIMIT, freeRemaining: isUnlocked ? null : Math.max(0, FREE_LIMIT - testsUsed), dailyLimit: DAILY_TEST_LIMIT, dailyCount, dailyRemaining: isUnlocked ? Math.max(0, DAILY_TEST_LIMIT - dailyCount) : null, testsRemaining, limitLabel });
  } catch (e) { res.status(500).json({ error: "Limit check failed" }); }
});

// ─── 4. createOrder ──────────────────────────────────────────────────────────
exports.createOrder = functions.runWith({ timeoutSeconds: 30, memory: "128MB" }).https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }
  const decoded = await verifyToken(req, res); if (!decoded) return;
  const KID = functions.config().razorpay?.key_id || process.env.RAZORPAY_KEY_ID;
  const SEC = functions.config().razorpay?.secret  || process.env.RAZORPAY_SECRET;
  if (!KID || !SEC) { res.status(500).json({ error: "Payment service not configured" }); return; }
  try {
    const rzp   = new Razorpay({ key_id: KID, key_secret: SEC });
    const order = await rzp.orders.create({ amount: UNLOCK_AMOUNT, currency: "INR", notes: { uid: decoded.uid, product: "cuet_unlimited" } });
    res.status(200).json({ id: order.id, amount: order.amount, currency: order.currency });
  } catch (e) { functions.logger.error("Order fail:", e); res.status(500).json({ error: "Could not create order. Try again." }); }
});

// ─── 5. verifyPayment ────────────────────────────────────────────────────────
exports.verifyPayment = functions.runWith({ timeoutSeconds: 30, memory: "128MB" }).https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }
  const decoded = await verifyToken(req, res); if (!decoded) return;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) { res.status(400).json({ error: "Missing payment params" }); return; }
  const SEC = functions.config().razorpay?.secret || process.env.RAZORPAY_SECRET;
  if (!SEC) { res.status(500).json({ error: "Payment service not configured" }); return; }
  const expected = crypto.createHmac("sha256", SEC).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
  if (expected !== razorpay_signature) { functions.logger.warn("Sig mismatch uid:", decoded.uid); res.status(400).json({ error: "Signature verification failed", unlocked: false }); return; }
  try {
    await db.collection("users").doc(decoded.uid).update({ unlocked: true, paymentId: razorpay_payment_id, orderId: razorpay_order_id, unlockedAt: admin.firestore.FieldValue.serverTimestamp() });
    await db.collection("payments").add({ uid: decoded.uid, orderId: razorpay_order_id, paymentId: razorpay_payment_id, amount: UNLOCK_AMOUNT, status: "verified", createdAt: admin.firestore.FieldValue.serverTimestamp() });
    functions.logger.info("Unlocked uid:", decoded.uid);
    res.status(200).json({ unlocked: true });
  } catch (e) { functions.logger.error("Firestore unlock fail:", e); res.status(500).json({ error: "Unlock failed. Contact support: " + razorpay_payment_id, unlocked: false }); }
});

// ─── 6. razorpayWebhook ──────────────────────────────────────────────────────
exports.razorpayWebhook = functions.runWith({ timeoutSeconds: 30, memory: "128MB" }).https.onRequest(async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Not allowed"); return; }
  const WS  = functions.config().razorpay?.webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!WS)  { res.status(500).send("Not configured"); return; }
  const sig = req.headers["x-razorpay-signature"];
  const exp = crypto.createHmac("sha256", WS).update(JSON.stringify(req.body)).digest("hex");
  if (sig !== exp) { functions.logger.warn("Webhook sig mismatch"); res.status(400).send("Invalid signature"); return; }
  const event   = req.body.event;
  const payment = req.body.payload?.payment?.entity;
  if (event === "payment.captured" && payment?.notes?.uid) {
    try { await db.collection("users").doc(payment.notes.uid).update({ unlocked: true, unlockedAt: admin.firestore.FieldValue.serverTimestamp() }); }
    catch (e) { functions.logger.error("Webhook unlock fail:", e); }
  }
  res.status(200).json({ status: "ok" });
});
