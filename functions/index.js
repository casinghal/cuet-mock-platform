/**
 * Firebase Cloud Functions — Vantiq CUET Platform
 * SKILL-07-V2 — HYBRID CACHE ARCHITECTURE
 *
 * CACHE STRATEGY:
 * - warmQuestionCache: Scheduled 2AM IST daily — pre-generates 20 sets per mode (60 total)
 * - generateQuestions: Serves from Firestore cache instantly (<1s) — falls back to live generation
 * - Cache TTL: 7 days | Cache size: 20 sets per mode | Replacement: background regeneration
 *
 * PERFORMANCE TARGETS:
 * - Cache hit (normal): < 1 second
 * - Cache miss (fallback): 12-18 seconds (batched parallel Haiku)
 * - Cache fill (background): non-blocking, student never waits
 */
const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const axios     = require("axios");
const crypto    = require("crypto");
const Razorpay  = require("razorpay");

admin.initializeApp();
const db            = admin.firestore();
const FREE_LIMIT    = 5;
const UNLOCK_AMOUNT = 19900;
const CACHE_SIZE    = 20;   // sets per mode
const CACHE_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days
const MODES         = ["Practice", "Mock", "SpeedDrill"];

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

// Multi-pass JSON extractor
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

// Anthropic API call helper
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

// Build prompts for batched generation
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

Rules:
1. correct is 0-indexed (0=A,1=B,2=C,3=D)
2. All questions sharing a passage must have identical passage text
3. Explanation: 2-3 sentences only
4. Mode: ${mode} | Difficulty: ${diff}
5. Return ONLY the JSON object. Begin with { — nothing before it.`;

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

Rules:
1. correct is 0-indexed (0=A,1=B,2=C,3=D)
2. All questions sharing a passage must have identical passage text
3. Explanation: 2-3 sentences only
4. Mode: ${mode} | Difficulty: ${diff}
5. Return ONLY the JSON object. Begin with { — nothing before it.`;

  return { promptA, promptB };
}

// Generate one full question set (batched parallel)
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

// ─── SCHEDULED CACHE WARMER — runs 2AM IST (8:30 PM UTC) daily ──────────────
exports.warmQuestionCache = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })  // 9 min budget for 60 sets
  .pubsub.schedule("30 20 * * *")                    // 8:30 PM UTC = 2:00 AM IST
  .timeZone("UTC")
  .onRun(async (context) => {
    const KEY = functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY;
    if (!KEY) { functions.logger.error("CACHE_WARM_FAILED: no API key"); return; }

    functions.logger.info("CACHE_WARM_START", { timestamp: new Date().toISOString() });
    let totalGenerated = 0;
    let totalFailed = 0;

    for (const mode of MODES) {
      // Check how many fresh sets already exist
      const existing = await db.collection("questionCache")
        .where("mode", "==", mode)
        .where("used", "==", false)
        .where("createdAt", ">", new Date(Date.now() - CACHE_TTL_MS))
        .get();

      const needed = Math.max(0, CACHE_SIZE - existing.size);
      functions.logger.info(`CACHE_MODE_${mode}`, { existing: existing.size, needed });

      // Generate needed sets sequentially (avoid rate limits)
      for (let i = 0; i < needed; i++) {
        try {
          const questions = await generateQuestionSet(mode, KEY);
          await db.collection("questionCache").add({
            mode,
            questions,
            used: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            questionCount: questions.length,
          });
          totalGenerated++;
          functions.logger.info(`CACHE_SET_STORED`, { mode, set: i + 1, count: questions.length });
          // Small delay between sets to avoid Anthropic rate limits
          await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
          totalFailed++;
          functions.logger.error(`CACHE_SET_FAILED`, { mode, set: i + 1, error: e.message });
        }
      }
    }

    functions.logger.info("CACHE_WARM_COMPLETE", { totalGenerated, totalFailed, timestamp: new Date().toISOString() });
  });

// ─── MANUAL CACHE TRIGGER — call this via HTTP to fill cache on demand ───────
exports.triggerCacheWarm = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onRequest(async (req, res) => {
    setCORS(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }

    // Simple admin check — only callable with a secret header
    const adminKey = req.headers["x-admin-key"] || "";
    const expectedKey = functions.config().admin?.key || process.env.ADMIN_KEY || "";
    if (!adminKey || adminKey !== expectedKey) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const KEY = functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY;
    if (!KEY) { res.status(500).json({ error: "No API key configured" }); return; }

    // Return immediately — cache fills in background
    res.status(200).json({ message: "Cache warming started in background", modes: MODES, targetPerMode: CACHE_SIZE });

    // Fill cache asynchronously after response sent
    (async () => {
      let totalGenerated = 0;
      functions.logger.info("MANUAL_CACHE_WARM_START", { timestamp: new Date().toISOString() });

      for (const mode of MODES) {
        const existing = await db.collection("questionCache")
          .where("mode", "==", mode)
          .where("used", "==", false)
          .where("createdAt", ">", new Date(Date.now() - CACHE_TTL_MS))
          .get();

        const needed = Math.max(0, CACHE_SIZE - existing.size);

        for (let i = 0; i < needed; i++) {
          try {
            const questions = await generateQuestionSet(mode, KEY);
            await db.collection("questionCache").add({
              mode, questions, used: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              questionCount: questions.length,
            });
            totalGenerated++;
            await new Promise(r => setTimeout(r, 2000));
          } catch (e) {
            functions.logger.error("MANUAL_CACHE_SET_FAILED", { mode, error: e.message });
          }
        }
      }
      functions.logger.info("MANUAL_CACHE_WARM_COMPLETE", { totalGenerated });
    })();
  });

// ─── 1. generateQuestions — HYBRID CACHE + LIVE FALLBACK ─────────────────────
exports.generateQuestions = functions
  .runWith({ timeoutSeconds: 120, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    setCORS(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }

    const startTime = Date.now();
    const decoded = await verifyToken(req, res);
    if (!decoded) return;
    const uid = decoded.uid;

    // Freemium gate
    try {
      const snap = await db.collection("users").doc(uid).get();
      const ud = snap.data() || {};
      if (!ud.unlocked && (ud.testsUsed || 0) >= FREE_LIMIT) {
        res.status(402).json({ error: "free_limit_reached", paywall: true }); return;
      }
    } catch (e) {
      res.status(500).json({ error: "Access check failed. Please try again." }); return;
    }

    const mode = (req.body.config || {}).mode || "Mock";
    const KEY  = functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY;
    if (!KEY) { res.status(500).json({ error: "Generation service not configured. Contact support." }); return; }

    functions.logger.info("GENERATION_START", { uid, mode, timestamp: new Date().toISOString() });

    let questions = null;
    let source = "live";

    // ── STEP 1: Try to serve from cache ──────────────────────────────────────
    try {
      const cacheSnap = await db.collection("questionCache")
        .where("mode", "==", mode)
        .where("used", "==", false)
        .where("createdAt", ">", new Date(Date.now() - CACHE_TTL_MS))
        .limit(1)
        .get();

      if (!cacheSnap.empty) {
        const cacheDoc = cacheSnap.docs[0];
        questions = cacheDoc.data().questions;
        source = "cache";

        // Mark this set as used
        await cacheDoc.ref.update({ used: true, usedAt: admin.firestore.FieldValue.serverTimestamp(), usedBy: uid });

        functions.logger.info("CACHE_HIT", { uid, mode, durationMs: Date.now() - startTime });

        // Trigger background regeneration to refill the slot
        // Fire-and-forget — does not block the response
        generateQuestionSet(mode, KEY)
          .then(async (newQuestions) => {
            await db.collection("questionCache").add({
              mode, questions: newQuestions, used: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              questionCount: newQuestions.length,
            });
            functions.logger.info("CACHE_REFILLED", { mode, count: newQuestions.length });
          })
          .catch((e) => functions.logger.error("CACHE_REFILL_FAILED", { mode, error: e.message }));
      }
    } catch (cacheErr) {
      functions.logger.warn("CACHE_READ_FAILED", { uid, error: cacheErr.message });
      // Fall through to live generation
    }

    // ── STEP 2: Live generation fallback if cache missed ─────────────────────
    if (!questions) {
      functions.logger.info("CACHE_MISS", { uid, mode });
      try {
        questions = await generateQuestionSet(mode, KEY);
        source = "live";
      } catch (e) {
        const durationMs = Date.now() - startTime;
        const status = e.response?.status;
        const errorType = e.message.startsWith("INCOMPLETE_SET") ? "INCOMPLETE_SET"
          : e.message === "TRUNCATION" ? "TRUNCATION"
          : e.message === "JSON extraction failed" ? "PARSE_FAIL"
          : status === 401 ? "AUTH_FAIL"
          : durationMs > 100000 ? "TIMEOUT"
          : "API_ERROR";

        functions.logger.error("GENERATION_FAILED", { uid, errorType, status, durationMs });

        const msg = status === 401 ? "API key error. Contact support."
          : status === 529 ? "Service is busy. Please wait 30 seconds and try again."
          : errorType === "TIMEOUT" ? "Generation timed out. Please try again."
          : "Could not generate your test. Please try again.";

        res.status(500).json({ error: msg }); return;
      }
    }

    // Increment test counter atomically
    try {
      await db.collection("users").doc(uid).update({
        testsUsed: admin.firestore.FieldValue.increment(1),
        lastTestAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      functions.logger.error("COUNTER_UPDATE_FAIL", { uid });
    }

    functions.logger.info("GENERATION_COMPLETE", {
      uid, mode, source,
      questionCount: questions.length,
      durationMs: Date.now() - startTime,
    });

    res.status(200).json({ questions });
  });

// 2. generateAdvisory
exports.generateAdvisory = functions.runWith({ timeoutSeconds: 60, memory: "128MB" }).https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }
  const decoded = await verifyToken(req, res); if (!decoded) return;
  const { prompt } = req.body;
  const KEY = functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY;
  try {
    const r = await axios.post(
      "https://api.anthropic.com/v1/messages",
      { model: "claude-sonnet-4-6", max_tokens: 500, messages: [{ role: "user", content: prompt }] },
      { headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" }, timeout: 55000 }
    );
    res.status(200).json({ text: r.data?.content?.[0]?.text || "Keep practising — consistency is key." });
  } catch (e) {
    res.status(200).json({ text: "Analysis unavailable. Focus on weak topics before next test." });
  }
});

// 3. checkTestLimit
exports.checkTestLimit = functions.runWith({ timeoutSeconds: 20, memory: "256MB" }).https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }
  const decoded = await verifyToken(req, res); if (!decoded) return;
  const uid = decoded.uid;
  try {
    const snap = await db.collection("users").doc(uid).get();
    const ud = snap.data() || {};
    const allowed = !!(ud.unlocked) || (ud.testsUsed || 0) < FREE_LIMIT;
    res.status(200).json({ allowed, testsUsed: ud.testsUsed || 0, unlocked: ud.unlocked || false });
  } catch (e) {
    res.status(500).json({ error: "Limit check failed" });
  }
});

// 4. createOrder
exports.createOrder = functions.runWith({ timeoutSeconds: 30, memory: "128MB" }).https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }
  const decoded = await verifyToken(req, res); if (!decoded) return;
  const KID = functions.config().razorpay?.key_id  || process.env.RAZORPAY_KEY_ID;
  const SEC = functions.config().razorpay?.secret  || process.env.RAZORPAY_SECRET;
  if (!KID || !SEC) { res.status(500).json({ error: "Payment service not configured" }); return; }
  try {
    const rzp = new Razorpay({ key_id: KID, key_secret: SEC });
    const order = await rzp.orders.create({ amount: UNLOCK_AMOUNT, currency: "INR", notes: { uid: decoded.uid, product: "cuet_unlimited" } });
    res.status(200).json({ id: order.id, amount: order.amount, currency: order.currency });
  } catch (e) {
    functions.logger.error("Order fail:", e);
    res.status(500).json({ error: "Could not create order. Try again." });
  }
});

// 5. verifyPayment
exports.verifyPayment = functions.runWith({ timeoutSeconds: 30, memory: "128MB" }).https.onRequest(async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }
  const decoded = await verifyToken(req, res); if (!decoded) return;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: "Missing payment params" }); return;
  }
  const SEC = functions.config().razorpay?.secret || process.env.RAZORPAY_SECRET;
  if (!SEC) { res.status(500).json({ error: "Payment service not configured" }); return; }
  const expected = crypto.createHmac("sha256", SEC).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
  if (expected !== razorpay_signature) {
    functions.logger.warn("Sig mismatch uid:", decoded.uid);
    res.status(400).json({ error: "Signature verification failed", unlocked: false }); return;
  }
  try {
    await db.collection("users").doc(decoded.uid).update({
      unlocked: true, paymentId: razorpay_payment_id, orderId: razorpay_order_id,
      unlockedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await db.collection("payments").add({
      uid: decoded.uid, orderId: razorpay_order_id, paymentId: razorpay_payment_id,
      amount: UNLOCK_AMOUNT, status: "verified", createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    functions.logger.info("Unlocked uid:", decoded.uid);
    res.status(200).json({ unlocked: true });
  } catch (e) {
    functions.logger.error("Firestore unlock fail:", e);
    res.status(500).json({ error: "Unlock failed. Contact support: " + razorpay_payment_id, unlocked: false });
  }
});

// 6. razorpayWebhook
exports.razorpayWebhook = functions.runWith({ timeoutSeconds: 30, memory: "128MB" }).https.onRequest(async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Not allowed"); return; }
  const WS = functions.config().razorpay?.webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!WS) { res.status(500).send("Not configured"); return; }
  const sig = req.headers["x-razorpay-signature"];
  const exp = crypto.createHmac("sha256", WS).update(JSON.stringify(req.body)).digest("hex");
  if (sig !== exp) { functions.logger.warn("Webhook sig mismatch"); res.status(400).send("Invalid signature"); return; }
  const event   = req.body.event;
  const payment = req.body.payload?.payment?.entity;
  if (event === "payment.captured" && payment?.notes?.uid) {
    try {
      await db.collection("users").doc(payment.notes.uid).update({
        unlocked: true, unlockedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) { functions.logger.error("Webhook unlock fail:", e); }
  }
  res.status(200).json({ status: "ok" });
});
