/**
 * Firebase Cloud Functions — Vantiq CUET Platform
 * 5 functions: generateQuestions, generateAdvisory, createOrder, verifyPayment, razorpayWebhook
 * All secret keys: server-only via Firebase config / env vars
 *
 * SKILL-07 APPLIED:
 * - generateQuestions: switched to claude-haiku-4-5-20251001 (8-15s vs 25-55s on Sonnet)
 * - max_tokens: 8000 (safe buffer for 50q + 3 RC passages + explanations)
 * - axios timeout: 105000 (15s buffer before CF's 120s limit)
 * - memory: 512MB (up from 256MB for reliability under load)
 * - multi-pass JSON extractor (handles fences, preamble, trailing commas)
 * - structured logging: GENERATION_START / GENERATION_COMPLETE / GENERATION_FAILED
 * - generateAdvisory: stays on claude-sonnet-4-6 (short output, quality matters)
 */
const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const axios     = require("axios");
const crypto    = require("crypto");
const Razorpay  = require("razorpay");

admin.initializeApp();
const db = admin.firestore();
const FREE_LIMIT    = 5;
const UNLOCK_AMOUNT = 19900;

function setCORS(res) {
  res.set("Access-Control-Allow-Origin",  "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function verifyToken(req, res) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) { res.status(401).json({error:"Unauthorized"}); return null; }
  try { return await admin.auth().verifyIdToken(h.split("Bearer ")[1]); }
  catch(e) { res.status(401).json({error:"Invalid token"}); return null; }
}

// SKILL-07 LAYER 3 — Multi-pass JSON extractor
// Handles: markdown fences, preamble text, trailing commas, partial wrapping
function extractJSON(rawText) {
  // Pass 1: strip markdown fences
  let cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  // Pass 2: find outermost { ... } or [ ... ]
  const firstBrace   = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const end = cleaned.lastIndexOf("}");
    if (end > firstBrace) cleaned = cleaned.substring(firstBrace, end + 1);
  } else if (firstBracket !== -1) {
    const end = cleaned.lastIndexOf("]");
    if (end > firstBracket) cleaned = cleaned.substring(firstBracket, end + 1);
  }

  // Pass 3: direct parse
  try { return JSON.parse(cleaned); } catch (e1) {}

  // Pass 4: fix trailing comma before } or ]
  const fixed = cleaned.replace(/,\s*([}\]])/g, "$1");
  try { return JSON.parse(fixed); } catch (e2) {}

  // Pass 5: log and throw — caller handles
  functions.logger.error("JSON_EXTRACT_FAILED", { raw_preview: rawText.substring(0, 500) });
  throw new Error("JSON extraction failed after all passes");
}

// 1. generateQuestions — SKILL-07 hardened
exports.generateQuestions = functions
  .runWith({ timeoutSeconds: 120, memory: "512MB" })  // 512MB up from 256MB
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
        res.status(402).json({ error: "free_limit_reached", paywall: true });
        return;
      }
    } catch (e) {
      res.status(500).json({ error: "Access check failed. Please try again." });
      return;
    }

    const config = req.body.config || {};
    const mode   = config.mode || "Mock";
    const diffMap = {
      Practice:   "medium — concept building, accessible vocabulary",
      Mock:       "challenging — full NTA exam standard",
      SpeedDrill: "moderate to hard — speed-optimised, clear answers",
    };
    const difficultyLabel = diffMap[mode] || "challenging — full NTA exam standard";

    // TRUNCATION FIX: passages stored once, questions reference by passageId (0/1/2)
    // Server reconstructs full format before returning to client
    // This reduces output from ~14000 tokens to ~5500 tokens — well within 8000 limit
    const prompt = `You are an NTA CUET English (101) question paper generator.
Return ONLY a JSON object — no markdown, no preamble, no text outside JSON.

JSON schema:
{
  "passages": [
    {"id": 0, "text": "250-300 word passage 1 — factual topic"},
    {"id": 1, "text": "250-300 word passage 2 — narrative topic"},
    {"id": 2, "text": "250-300 word passage 3 — literary topic"}
  ],
  "questions": [
    {"question":"...","options":["A","B","C","D"],"correct":0,"topic":"Reading Comprehension","passageId":0,"explanation":"2-3 sentence explanation"},
    {"question":"...","options":["A","B","C","D"],"correct":1,"topic":"Synonyms and Antonyms","passageId":null,"explanation":"..."}
  ]
}

Topic distribution (MANDATORY — exactly these counts):
- Reading Comprehension: 22 questions — passageId 0 (8 questions), passageId 1 (7 questions), passageId 2 (7 questions)
- Synonyms and Antonyms: 9 questions — passageId null
- Sentence Rearrangement: 7 questions — passageId null
- Choosing Correct Word: 7 questions — passageId null
- Match the Following: 3 questions — passageId null
- Grammar and Vocabulary: 2 questions — passageId null

Rules:
1. "correct" is 0-indexed (0=A, 1=B, 2=C, 3=D)
2. Every question has exactly 4 options
3. Each passage must be 250-300 words — factual, narrative, literary genres
4. Explanation: 2 sentences only — why correct answer is right
5. Mode: ${mode} | Difficulty: ${difficultyLabel}
6. Total questions: exactly 50

Return ONLY the JSON object. Begin with { — nothing before it.`;

    const KEY = functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY;
    if (!KEY) {
      res.status(500).json({ error: "Generation service not configured. Contact support." });
      return;
    }

    functions.logger.info("GENERATION_START", { uid, mode, timestamp: new Date().toISOString() });

    try {
      const r = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: "claude-haiku-4-5-20251001",  // SKILL-07 FIX: Haiku = 8-15s vs Sonnet 25-55s
          max_tokens: 8000,                     // SKILL-07 FIX: 50q + passages needs ~5500-7000 tokens
          messages: [{ role: "user", content: prompt }]
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": KEY,
            "anthropic-version": "2023-06-01"
          },
          timeout: 105000  // SKILL-07 FIX: 15s buffer before CF 120s hard limit
        }
      );

      // Truncation check
      if (r.data?.stop_reason === "max_tokens") {
        functions.logger.error("GENERATION_FAILED", { uid, errorType: "TRUNCATION", durationMs: Date.now() - startTime });
        res.status(500).json({ error: "Test generation was cut short. Please try again." });
        return;
      }

      const raw = r.data?.content?.[0]?.text || "";

      // SKILL-07 FIX: multi-pass extractor replaces fragile direct JSON.parse
      let parsed;
      try {
        parsed = extractJSON(raw);
      } catch (parseErr) {
        functions.logger.error("GENERATION_FAILED", { uid, errorType: "PARSE_FAIL", durationMs: Date.now() - startTime });
        res.status(500).json({ error: "Failed to parse questions. Please try again." });
        return;
      }

      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length < 48) {
        functions.logger.error("GENERATION_FAILED", { uid, errorType: "INCOMPLETE_SET", count: parsed.questions?.length, durationMs: Date.now() - startTime });
        res.status(500).json({ error: "Incomplete question set. Please try again." });
        return;
      }

      // Reconstruct full format: inject passage text into each RC question
      // Client receives the same format as before — no App.jsx changes needed
      const passages = parsed.passages || [];
      const questions = parsed.questions.map(q => ({
        question:    q.question,
        options:     q.options,
        correct:     q.correct,
        topic:       q.topic,
        explanation: q.explanation,
        passage:     q.passageId != null && passages[q.passageId]
                       ? passages[q.passageId].text
                       : (q.passage || null)
      }));

      functions.logger.info("GENERATION_COMPLETE", {
        uid, mode,
        questionCount: questions.length,
        passageCount: passages.length,
        durationMs: Date.now() - startTime,
        model: "claude-haiku-4-5-20251001"
      });

      res.status(200).json({ questions });

    } catch (e) {
      const durationMs = Date.now() - startTime;
      const s = e.response?.status;
      const errorType = s === 401 ? "AUTH_FAIL"
        : s === 529 ? "OVERLOADED"
        : durationMs > 100000 ? "TIMEOUT"
        : "API_ERROR";

      functions.logger.error("GENERATION_FAILED", {
        uid, errorType, statusCode: s, durationMs,
        detail: String(e.response?.data?.error?.message || e.message || "").substring(0, 200)
      });

      const msg = s === 529 ? "Service is busy. Please wait 30 seconds and try again."
        : s === 401 ? "API key error. Contact support."
        : errorType === "TIMEOUT" ? "Generation timed out. Please try again."
        : "Could not generate your test. Please try again.";

      res.status(500).json({ error: msg });
    }
  });

// 2. generateAdvisory — stays on Sonnet (short output, quality matters here)
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
exports.checkTestLimit = functions.runWith({ timeoutSeconds: 10, memory: "128MB" }).https.onRequest(async (req, res) => {
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
    res.status(400).json({ error: "Signature verification failed", unlocked: false });
    return;
  }
  try {
    await db.collection("users").doc(decoded.uid).update({
      unlocked: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      unlockedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await db.collection("payments").add({
      uid: decoded.uid, orderId: razorpay_order_id, paymentId: razorpay_payment_id,
      amount: UNLOCK_AMOUNT, status: "verified",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
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
        unlocked: true,
        unlockedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) { functions.logger.error("Webhook unlock fail:", e); }
  }
  res.status(200).json({ status: "ok" });
});
// SKILL-07 verified 2026-04-09T14:08:52Z
