/**
 * Firebase Cloud Functions — Vantiq CUET Platform
 * TWO-TIER ARCHITECTURE:
 *
 * TIER 1 — QuickPractice (FREE FOREVER)
 * - 15 questions, no timer, rotating question types
 * - Never counted toward freemium limit or daily limit
 * - Labelled "Always Free" — permanent hook to platform
 *
 * TIER 2 — Mock Exam (Free ×4, then ₹199)
 * - 50 questions, 60 min, full NTA simulation
 * - Counts toward freemium limit (4 free) and daily limit (15/day)
 *
 * CACHE: 30 sets per mode × 2 modes = 60 sets total
 * SCHEDULE: Nightly 2AM IST via GitHub Actions cron
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
const CACHE_SIZE       = 60;
const CACHE_TTL_MS     = 7 * 24 * 60 * 60 * 1000;
const DAILY_TEST_LIMIT = 15;
const MODES            = ["Mock", "QuickPractice"];  // Mock first — highest priority

function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function setCORS(res) {
  res.set("Access-Control-Allow-Origin",  "*");
  res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key");
  res.set("Access-Control-Max-Age", "3600");
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

function buildPrompt(mode) {
  if (mode === "QuickPractice") {
    return `You are an NTA CUET English (101) question generator.
Generate exactly 15 MCQ questions for a quick practice session. Return ONLY a JSON object — no markdown, no preamble.

JSON schema:
{"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"topic":"Reading Comprehension","passage":"short passage text or null","explanation":"1-2 sentences"}]}

Topic distribution (MANDATORY — exactly these counts):
- Reading Comprehension: 5 questions (1 short passage, 120-150 words, factual or narrative)
- Synonyms and Antonyms: 3 questions (passage = null)
- Sentence Rearrangement: 3 questions (passage = null)
- Choosing Correct Word: 2 questions (passage = null)
- Grammar and Vocabulary: 2 questions (passage = null)

Rules:
1. correct is 0-indexed (0=A,1=B,2=C,3=D)
2. All RC questions must share identical passage text
3. Every question must have exactly 4 options
4. Every question must have an explanation
5. Difficulty: accessible — suitable for first-time platform visitors
6. Return ONLY the JSON object. Begin with { — nothing before it.`;
  }
  return null;
}

// ── 5-batch Mock generation (10 questions each = exactly 50 total) ─────────────
// Each batch is small enough to return exactly 10 reliably
function buildMockBatch(batchNum) {
  const schema = '{"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"topic":"...","passage":"passage text or null","explanation":"2-3 sentences"}]}';

  // Each batch requests 12 questions (buffer) — sliced to exactly 10 after validation
  // Requesting 12 makes it very reliable to get >= 10 valid questions
  // Passage-based batches (1-3): all questions in a batch share ONE passage → no mixing
  const batches = {
    1: `You are an NTA CUET English (101) question paper generator.
Generate exactly 12 MCQ questions. Return ONLY a JSON object — no markdown, no preamble.
JSON schema: ${schema}
Topic distribution (MANDATORY):
- Reading Comprehension: 8 questions — write ONE factual passage (science/geography/history, exactly 250-300 words). All 8 RC questions must use IDENTICAL passage text.
- Synonyms and Antonyms: 4 questions (passage = null)
Rules: correct is 0-indexed (0=A,1=B,2=C,3=D). Difficulty: challenging — NTA exam standard. Explanation: 2-3 sentences.
Return ONLY the JSON object. Begin with { — nothing before it.`,

    2: `You are an NTA CUET English (101) question paper generator.
Generate exactly 12 MCQ questions. Return ONLY a JSON object — no markdown, no preamble.
JSON schema: ${schema}
Topic distribution (MANDATORY):
- Reading Comprehension: 9 questions — write ONE narrative passage (story or biographical excerpt, exactly 250-300 words). All 9 RC questions must use IDENTICAL passage text.
- Synonyms and Antonyms: 3 questions (passage = null)
Rules: correct is 0-indexed (0=A,1=B,2=C,3=D). Difficulty: challenging — NTA exam standard. Explanation: 2-3 sentences.
Return ONLY the JSON object. Begin with { — nothing before it.`,

    3: `You are an NTA CUET English (101) question paper generator.
Generate exactly 12 MCQ questions. Return ONLY a JSON object — no markdown, no preamble.
JSON schema: ${schema}
Topic distribution (MANDATORY):
- Reading Comprehension: 8 questions — write ONE literary/philosophical passage (critical prose, exactly 250-300 words). All 8 RC questions must use IDENTICAL passage text.
- Synonyms and Antonyms: 4 questions (passage = null)
Rules: correct is 0-indexed (0=A,1=B,2=C,3=D). Difficulty: challenging — NTA exam standard. Explanation: 2-3 sentences.
Return ONLY the JSON object. Begin with { — nothing before it.`,

    4: `You are an NTA CUET English (101) question paper generator.
Generate exactly 12 MCQ questions. Return ONLY a JSON object — no markdown, no preamble.
JSON schema: ${schema}
Topic distribution (MANDATORY):
- Sentence Rearrangement: 8 questions — jumbled P/Q/R/S format, arrange in logical order (passage = null)
- Grammar and Vocabulary: 3 questions — error spotting or correct usage (passage = null)
- Synonyms and Antonyms: 1 question (passage = null)
Rules: correct is 0-indexed (0=A,1=B,2=C,3=D). Difficulty: challenging — NTA exam standard. Explanation: 2-3 sentences.
Return ONLY the JSON object. Begin with { — nothing before it.`,

    5: `You are an NTA CUET English (101) question paper generator.
Generate exactly 12 MCQ questions. Return ONLY a JSON object — no markdown, no preamble.
JSON schema: ${schema}
Topic distribution (MANDATORY):
- Choosing Correct Word: 8 questions — fill in the blank or cloze (passage = null)
- Match the Following: 4 questions — word-meaning or phrase pairs (passage = null)
Rules: correct is 0-indexed (0=A,1=B,2=C,3=D). Difficulty: challenging — NTA exam standard. Explanation: 2-3 sentences.
Return ONLY the JSON object. Begin with { — nothing before it.`,
  };

  return batches[batchNum];
}

// ── Quality Gate — validates every question before accepting the set ──────────
function validateQuestionSet(questions, mode) {
  // With 5-batch architecture, Mock always returns exactly 50 (5 × 10)
  const REQUIRED_COUNT = mode === "Mock" ? 50 : 15;
  const errors = [];

  if (questions.length !== REQUIRED_COUNT) {
    errors.push(`COUNT:${questions.length}/${REQUIRED_COUNT} — must be exactly ${REQUIRED_COUNT}`);
  }

  questions.forEach((q, i) => {
    const n = i + 1;
    if (!q.question || typeof q.question !== "string" || q.question.trim().length < 10) {
      errors.push(`Q${n}:MISSING_QUESTION`);
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`Q${n}:OPTIONS_COUNT(${q.options?.length ?? 0})`);
    }
    if (q.options) {
      q.options.forEach((opt, j) => {
        if (!opt || typeof opt !== "string" || opt.trim().length === 0) {
          errors.push(`Q${n}:EMPTY_OPTION_${j}`);
        }
      });
    }
    if (typeof q.correct !== "number" || q.correct < 0 || q.correct > 3) {
      errors.push(`Q${n}:INVALID_CORRECT(${q.correct})`);
    }
    if (!q.topic || typeof q.topic !== "string") {
      errors.push(`Q${n}:MISSING_TOPIC`);
    }
    if (!q.explanation || typeof q.explanation !== "string" || q.explanation.trim().length < 10) {
      errors.push(`Q${n}:MISSING_EXPLANATION`);
    }
  });

  return errors;
}

async function generateQuestionSet(mode, apiKey) {
  const MAX_RETRIES = 2; // 3 total attempts
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      let questions;

      if (mode === "QuickPractice") {
        const prompt = buildPrompt("QuickPractice");
        questions = await callAnthropic(prompt, 5000, apiKey);
      } else {
        // 5 sequential batches of 10 questions each = exactly 50
        // Per-batch retry strategy: retry individual failing batch (not all 5)
        // Slice to exactly 10 if model returns more
        const tokenBudgets = [4000, 4000, 4000, 3000, 3000]; // RC batches get more tokens
        const allBatches = [];

        for (let b = 1; b <= 5; b++) {
          let batchResult = null;
          let batchError = null;

          // Up to 3 attempts per individual batch
          for (let ba = 1; ba <= 3; ba++) {
            try {
              functions.logger.info("BATCH_START", { batchNum: b, attempt: ba, tokenBudget: tokenBudgets[b-1] });
              const raw = await callAnthropic(buildMockBatch(b), tokenBudgets[b-1], apiKey);
              const count = Array.isArray(raw) ? raw.length : 0;
              functions.logger.info("BATCH_RESULT", { batchNum: b, attempt: ba, count });

              if (!Array.isArray(raw) || count < 10) {
                // Need >= 10 to slice to exactly 10 — retry this batch alone
                throw new Error(`BATCH_${b}_LOW:${count}/12`);
              }
              // Slice to exactly 10 — drop the 2 buffer questions
              batchResult = raw.slice(0, 10);
              functions.logger.info("BATCH_ACCEPTED", { batchNum: b, generated: count, used: 10 });
              break; // Batch succeeded
            } catch(e) {
              batchError = e;
              functions.logger.warn("BATCH_RETRY", { batchNum: b, attempt: ba, reason: e.message });
              if (ba < 3) await new Promise(r => setTimeout(r, 1500 * ba));
            }
          }

          if (!batchResult) {
            throw new Error(`BATCH_${b}_FAILED_ALL_ATTEMPTS: ${batchError?.message}`);
          }
          allBatches.push(...batchResult);
          await new Promise(r => setTimeout(r, 800));
        }

        // Final count check — should be exactly 50
        if (allBatches.length !== 50) {
          throw new Error(`COMBINED_COUNT:${allBatches.length}/50`);
        }
        questions = allBatches;
      }

      // ── Quality gate ────────────────────────────────────────────────────────
      const errors = validateQuestionSet(questions, mode);
      if (errors.length > 0) {
        const errorSummary = errors.slice(0, 5).join(", ") + (errors.length > 5 ? `... +${errors.length - 5} more` : "");
        functions.logger.warn("QUALITY_GATE_FAILED", { mode, attempt, count: questions.length, errors: errorSummary });
        throw new Error(`QUALITY_FAIL:${errorSummary}`);
      }

      functions.logger.info("QUALITY_GATE_PASSED", { mode, attempt, count: questions.length });
      return questions;

    } catch (e) {
      lastError = e;
      if (attempt <= MAX_RETRIES) {
        functions.logger.warn("GENERATION_RETRY", { mode, attempt, reason: e.message });
        await new Promise(r => setTimeout(r, 2000 * attempt)); // backoff: 2s, 4s
      }
    }
  }

  // All attempts failed
  throw new Error(`GENERATION_FAILED_AFTER_${MAX_RETRIES + 1}_ATTEMPTS: ${lastError?.message}`);
}

// ─── MANUAL/SCHEDULED CACHE TRIGGER ─────────────────────────────────────────
exports.triggerCacheWarm = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    setCORS(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    try {
      // Accept key from body (browser-safe, no CORS preflight) or header (curl)
      const adminKey    = req.body?.adminKey || req.headers["x-admin-key"] || "";
      const cfg         = functions.config();
      const expectedKey = cfg.admin?.key || process.env.ADMIN_KEY || "";
      if (!adminKey || adminKey !== expectedKey) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const KEY = cfg.anthropic?.api_key || process.env.ANTHROPIC_API_KEY;
      if (!KEY) { res.status(500).json({ error: "No API key configured" }); return; }
      const cutoff = new Date(Date.now() - CACHE_TTL_MS);
      // Optional targeted mode — pass {"mode":"Mock"} to fill only Mock
      const targetMode = req.body && req.body.mode ? req.body.mode : null;
      const clearMode  = req.body && req.body.clear === true;
      const modesToFill = (targetMode && MODES.includes(targetMode)) ? [targetMode] : MODES;

      // If clear:true, delete all existing docs for targeted modes before filling
      if (clearMode && targetMode) {
        const toDelete = await db.collection("questionCache").where("mode", "==", targetMode).get();
        const delBatch = db.batch();
        toDelete.docs.forEach(d => delBatch.delete(d.ref));
        await delBatch.commit();
        functions.logger.info("CACHE_CLEARED", { mode: targetMode, deleted: toDelete.size });
      }

      const status = {};
      for (const mode of MODES) {
        const snap  = await db.collection("questionCache").where("mode", "==", mode).get();
        const fresh = snap.docs.filter(d => d.data().createdAt?.toDate() > cutoff);
        status[mode] = { current: fresh.length, needed: Math.max(0, CACHE_SIZE - fresh.length) };
      }
      // Synchronous generation — Firebase kills async work after res.send()
      // Generate sets within 8-minute budget, return partial if needed
      const warmStart = Date.now();
      const TIME_BUDGET_MS = 480000; // 8 min — leaves 1 min buffer before 540s timeout
      let generated = 0;
      let skipped = 0;
      functions.logger.info("CACHE_WARM_START", { modesToFill, targetMode });

      for (const mode of modesToFill) {
        const snap  = await db.collection("questionCache").where("mode", "==", mode).get();
        const fresh = snap.docs.filter(d => d.data().createdAt?.toDate() > cutoff);
        const needed = Math.max(0, CACHE_SIZE - fresh.length);
        functions.logger.info("CACHE_MODE_STATUS", { mode, current: fresh.length, needed });

        let consecutiveFails = 0;
        for (let i = 0; i < needed; i++) {
          if (Date.now() - warmStart > TIME_BUDGET_MS) {
            skipped = needed - i;
            functions.logger.info("CACHE_BUDGET_EXCEEDED", { mode, skipped });
            break;
          }
          if (consecutiveFails >= 5) {
            functions.logger.error("CACHE_MODE_ABANDONED", { mode, reason: "5 consecutive failures — moving to next mode" });
            skipped += needed - i;
            break;
          }
          try {
            const questions = await generateQuestionSet(mode, KEY);
            await db.collection("questionCache").add({
              mode, questions,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              questionCount: questions.length,
            });
            generated++;
            consecutiveFails = 0;
            functions.logger.info("CACHE_SET_STORED", { mode, set: i + 1, total: generated, count: questions.length });
            await new Promise(r => setTimeout(r, 2000)); // 2s between sets
          } catch (e) {
            consecutiveFails++;
            functions.logger.error("CACHE_SET_FAILED", { mode, set: i + 1, consecutiveFails, error: e.message });
          }
        }
      }

      functions.logger.info("CACHE_WARM_DONE", { generated, skipped, durationMs: Date.now() - warmStart });
      res.status(200).json({
        message: skipped > 0 ? "Partial cache fill — run again to complete" : "Cache fully warmed",
        generated, skipped,
        status,
        durationMs: Date.now() - warmStart
      });
    } catch (e) {
      functions.logger.error("TRIGGER_CACHE_CRASHED", { error: e.message });
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

    const mode = (req.body.config || {}).mode || "Mock";

    // QuickPractice: free forever, no limits checked
    if (mode !== "QuickPractice") {
      const isUnlocked = !!(userDoc.unlocked);
      const testsUsed  = userDoc.testsUsed || 0;
      if (!isUnlocked && testsUsed >= FREE_LIMIT) {
        res.status(402).json({ error: "free_limit_reached", paywall: true }); return;
      }
      if (isUnlocked) {
        const today      = todayIST();
        const dailyCount = (userDoc.dailyTests || {})[today] || 0;
        if (dailyCount >= DAILY_TEST_LIMIT) {
          res.status(429).json({ error: "Don't stress yourself too much today. Attempt more tests tomorrow.", code: "daily_limit_reached" }); return;
        }
      }
    }

    const usedSetIds = userDoc.usedCacheSetIds || [];
    const cutoff     = new Date(Date.now() - CACHE_TTL_MS);
    functions.logger.info("GENERATION_START", { uid, mode, usedCount: usedSetIds.length });

    let cacheDoc = null;
    try {
      const allSnap   = await db.collection("questionCache").where("mode", "==", mode).get();
      const usedSet   = new Set(usedSetIds);
      // Quality filter — reject any cached set with fewer than expected questions
      const REQUIRED_Q = mode === "Mock" ? 50 : 15;
      const available = allSnap.docs.filter(d => {
        if (usedSet.has(d.id)) return false;
        if (d.data().createdAt?.toDate() <= cutoff) return false;
        const count = d.data().questionCount || (d.data().questions?.length ?? 0);
        if (count !== REQUIRED_Q) {
          functions.logger.warn("CACHE_SET_SUBSTANDARD", { id: d.id, mode, count, required: REQUIRED_Q });
          return false;
        }
        return true;
      });
      if (available.length > 0) cacheDoc = available[Math.floor(Math.random() * available.length)];
    } catch (e) {
      functions.logger.error("CACHE_QUERY_FAILED", { uid, error: e.message });
      res.status(500).json({ error: "Could not load your test. Please try again." }); return;
    }

    if (!cacheDoc) {
      functions.logger.info("CACHE_EXHAUSTED_FOR_USER", { uid, mode });
      res.status(503).json({
        error: mode === "QuickPractice"
          ? "Quick Practice is being refreshed. Please try again in a few minutes."
          : "You have completed all available tests for this mode. More tests are being prepared — please check back later.",
        code: "no_tests_available"
      }); return;
    }

    const questions = cacheDoc.data().questions;
    const setId     = cacheDoc.id;
    const today     = todayIST();

    // Only increment counters for Mock (not QuickPractice)
    // Use set() with merge:true — works even if user doc doesn't exist yet
    try {
      if (mode === "QuickPractice") {
        await db.collection("users").doc(uid).set({
          lastTestAt: admin.firestore.FieldValue.serverTimestamp(),
          usedCacheSetIds: admin.firestore.FieldValue.arrayUnion(setId),
        }, { merge: true });
      } else {
        await db.collection("users").doc(uid).set({
          testsUsed: admin.firestore.FieldValue.increment(1),
          lastTestAt: admin.firestore.FieldValue.serverTimestamp(),
          usedCacheSetIds: admin.firestore.FieldValue.arrayUnion(setId),
          [`dailyTests.${today}`]: admin.firestore.FieldValue.increment(1),
        }, { merge: true });
      }
    } catch (e) { functions.logger.error("COUNTER_UPDATE_FAIL", { uid, error: e.message }); }

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
    const limitLabel      = isUnlocked ? `${testsRemaining} mock tests remaining today` : `${testsRemaining} free mock tests remaining`;
    res.status(200).json({
      allowed, isUnlocked, testsUsed,
      freeLimit: FREE_LIMIT,
      freeRemaining: isUnlocked ? null : Math.max(0, FREE_LIMIT - testsUsed),
      dailyLimit: DAILY_TEST_LIMIT,
      dailyCount,
      dailyRemaining: isUnlocked ? Math.max(0, DAILY_TEST_LIMIT - dailyCount) : null,
      testsRemaining, limitLabel,
      quickPracticeAlwaysFree: true,
    });
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

// ─── 7. generateFeedbackInsights ────────────────────────────────────────────
// Reads all feedback from Firestore, sends to Claude, returns top 3 actionable insights
exports.generateFeedbackInsights = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    setCORS(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }

    const adminKey    = req.body?.adminKey || req.headers["x-admin-key"] || "";
    const cfg         = functions.config();
    const expectedKey = cfg.admin?.key || process.env.ADMIN_KEY || "";

    if (!adminKey || adminKey !== expectedKey) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const KEY = cfg.anthropic?.api_key || process.env.ANTHROPIC_API_KEY;
    if (!KEY) { res.status(500).json({ error: "API key not configured" }); return; }

    try {
      // Fetch all feedback from Firestore
      const snap = await db.collection("feedback").orderBy("createdAt", "desc").limit(100).get();

      if (snap.empty) {
        res.status(200).json({ insights: [], message: "No feedback yet — insights will appear once users submit feedback." });
        return;
      }

      // Build feedback list for prompt
      const feedbackList = snap.docs.map((d, i) => {
        const data = d.data();
        const date = data.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || "unknown date";
        return `[${i + 1}] ${data.email || "anonymous"} (${date}): ${data.text}`;
      }).join("\n");

      const prompt = `You are a product improvement analyst for Vantiq CUET — an NTA-standard mock test platform for Indian 12th-grade students preparing for CUET 2026 (English subject).

Here is ALL user feedback submitted so far:

${feedbackList}

Analyze this feedback and return ONLY a JSON object with exactly 3 actionable insights. Each insight must:
- Be grounded in what multiple users are pointing to (or a critical single-user signal)
- Name the specific problem area
- Give one concrete fix the product team can implement
- Note the tone (frustrated / confused / positive / neutral)

JSON schema (return ONLY this, no markdown, no preamble):
{
  "insights": [
    {
      "rank": 1,
      "title": "Short title (5-7 words)",
      "theme": "What users are pointing to",
      "signal": "Specific quotes or patterns from the feedback",
      "action": "One concrete thing to fix or improve",
      "tone": "frustrated | confused | positive | mixed",
      "frequency": "X of Y users mention this"
    }
  ],
  "summary": "One sentence overall assessment of where the platform stands based on feedback",
  "generatedAt": "${new Date().toISOString()}"
}

Return ONLY the JSON object. Begin with { — nothing before it.`;

      const r = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        },
        {
          headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
          timeout: 50000,
        }
      );

      const result = extractJSON(r.data?.content?.[0]?.text || "");
      functions.logger.info("INSIGHTS_GENERATED", { count: result?.insights?.length });
      res.status(200).json(result);

    } catch (e) {
      functions.logger.error("INSIGHTS_FAILED", { error: e.message });
      res.status(500).json({ error: "Could not generate insights. Try again." });
    }
  });

// ─── 8. getCacheStatus ───────────────────────────────────────────────────────
// Lightweight read-only status check — no generation, responds in < 2s
exports.getCacheStatus = functions
  .runWith({ timeoutSeconds: 10, memory: "128MB" })
  .https.onRequest(async (req, res) => {
    setCORS(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    const adminKey    = req.body?.adminKey || req.headers["x-admin-key"] || "";
    const cfg         = functions.config();
    const expectedKey = cfg.admin?.key || process.env.ADMIN_KEY || "";
    if (!adminKey || adminKey !== expectedKey) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    try {
      const cutoff = new Date(Date.now() - CACHE_TTL_MS);
      const status = {};
      for (const mode of MODES) {
        const snap  = await db.collection("questionCache").where("mode", "==", mode).get();
        const fresh = snap.docs.filter(d => d.data().createdAt?.toDate() > cutoff);
        status[mode] = { current: fresh.length, total: CACHE_SIZE, needed: Math.max(0, CACHE_SIZE - fresh.length) };
      }
      res.status(200).json({ status, checkedAt: new Date().toISOString() });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });
