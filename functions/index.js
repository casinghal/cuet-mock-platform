/**
 * Firebase Cloud Functions — Vantiq CUET Platform
 * 5 functions: generateQuestions, generateAdvisory, createOrder, verifyPayment, razorpayWebhook
 * All secret keys: server-only via Firebase config / env vars
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

// 1. generateQuestions — builds prompt server-side from config
exports.generateQuestions = functions.runWith({timeoutSeconds:120,memory:"256MB"}).https.onRequest(async(req,res)=>{
  setCORS(res);
  if(req.method==="OPTIONS"){res.status(204).send("");return;}
  if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
  const decoded=await verifyToken(req,res); if(!decoded) return;
  const uid=decoded.uid;
  try {
    const snap=await db.collection("users").doc(uid).get();
    const ud=snap.data()||{};
    if(!ud.unlocked&&(ud.testsUsed||0)>=FREE_LIMIT){ res.status(402).json({error:"free_limit_reached",paywall:true}); return; }
  } catch(e){ res.status(500).json({error:"Access check failed"}); return; }

  const config=req.body.config||{};
  const mode=config.mode||"Mock";
  const diffMap={
    Practice:"medium — concept building, accessible vocabulary",
    Mock:"challenging — full NTA exam standard",
    SpeedDrill:"moderate to hard — speed-optimised, clear answers",
  };
  const prompt=`Generate a CUET English (Code 101) question paper for NTA UG 2026 standard.
Generate exactly 50 MCQ questions with this topic distribution:
- Reading Comprehension: 22 questions (use 3 separate passages, each 250-300 words; one factual, one narrative, one literary)
- Synonyms and Antonyms: 9 questions
- Sentence Rearrangement: 7 questions
- Choosing Correct Word: 7 questions
- Match the Following: 3 questions
- Grammar and Vocabulary: 2 questions
Mode: ${mode} | Difficulty: ${diffMap[mode]||"challenging — full NTA exam standard"}
Rules: every question has exactly 4 options; correct field is 0-indexed int (0=A,1=B,2=C,3=D); passage field is the full passage text for RC questions, null for all others; every question needs a clear 2-3 sentence explanation.
Return ONLY a valid JSON object with no markdown fences and no preamble:
{"questions":[{"question":"...","options":["...","...","...","..."],"correct":0,"topic":"Reading Comprehension","passage":"...or null...","explanation":"..."}]}`;

  const KEY=functions.config().anthropic?.api_key||process.env.ANTHROPIC_API_KEY;
  if(!KEY){res.status(500).json({error:"Generation service not configured"});return;}
  try {
    const r=await axios.post("https://api.anthropic.com/v1/messages",
      {model:"claude-sonnet-4-6",max_tokens:16000,messages:[{role:"user",content:prompt}]},
      {headers:{"Content-Type":"application/json","x-api-key":KEY,"anthropic-version":"2023-06-01"},timeout:110000}
    );
    if(r.data?.stop_reason==="max_tokens"){res.status(500).json({error:"Response cut off. Please try again."});return;}
    const raw=r.data?.content?.[0]?.text||"";
    const cleaned=raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
    let parsed;
    try{parsed=JSON.parse(cleaned);}catch(e){functions.logger.error("Parse fail:",raw.substring(0,300));res.status(500).json({error:"Failed to parse questions. Try again."});return;}
    if(!parsed.questions||!Array.isArray(parsed.questions)){res.status(500).json({error:"Invalid question format"});return;}
    res.status(200).json({questions:parsed.questions});
  } catch(e){
    const s=e.response?.status;
    const detail=e.response?.data||e.message||"unknown";
    functions.logger.error("Anthropic error: status=",s,"detail=",JSON.stringify(detail));
    const msg=s===529?"Service busy. Wait 30s and retry.":
              s===401?"API key error. Contact support.":
              s===404?"Model not found. Contact support.":
              s===400?"Bad request: "+(e.response?.data?.error?.message||"unknown"):
              s===413?"Request too large. Contact support.":
              s===422?"Invalid request: "+(e.response?.data?.error?.message||"unknown"):
              !s?"Network/timeout error: "+String(e.message).substring(0,80):
              "API error "+s+": "+String(detail).substring(0,80);
    res.status(500).json({error:msg,debug_status:s||"no_response"});
  }
});

// 2. generateAdvisory
exports.generateAdvisory = functions.runWith({timeoutSeconds:60,memory:"128MB"}).https.onRequest(async(req,res)=>{
  setCORS(res);
  if(req.method==="OPTIONS"){res.status(204).send("");return;}
  if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
  const decoded=await verifyToken(req,res); if(!decoded) return;
  const {prompt}=req.body;
  const KEY=functions.config().anthropic?.api_key||process.env.ANTHROPIC_API_KEY;
  try {
    const r=await axios.post("https://api.anthropic.com/v1/messages",
      {model:"claude-sonnet-4-6",max_tokens:500,messages:[{role:"user",content:prompt}]},
      {headers:{"Content-Type":"application/json","x-api-key":KEY,"anthropic-version":"2023-06-01"},timeout:55000}
    );
    res.status(200).json({text:r.data?.content?.[0]?.text||"Keep practising — consistency is key."});
  } catch(e){ res.status(200).json({text:"Analysis unavailable. Focus on weak topics before next test."}); }
});

// 3. checkTestLimit — used by Dashboard before showing Begin Test
exports.checkTestLimit = functions.runWith({timeoutSeconds:10,memory:"128MB"}).https.onRequest(async(req,res)=>{
  setCORS(res);
  if(req.method==="OPTIONS"){res.status(204).send("");return;}
  if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
  const decoded=await verifyToken(req,res); if(!decoded) return;
  const uid=decoded.uid;
  try {
    const snap=await db.collection("users").doc(uid).get();
    const ud=snap.data()||{};
    const allowed=!!(ud.unlocked)||(ud.testsUsed||0)<FREE_LIMIT;
    res.status(200).json({allowed,testsUsed:ud.testsUsed||0,unlocked:ud.unlocked||false});
  } catch(e){ res.status(500).json({error:"Limit check failed"}); }
});

// 4. createOrder
exports.createOrder = functions.runWith({timeoutSeconds:30,memory:"128MB"}).https.onRequest(async(req,res)=>{
  setCORS(res);
  if(req.method==="OPTIONS"){res.status(204).send("");return;}
  if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
  const decoded=await verifyToken(req,res); if(!decoded) return;
  const KID=functions.config().razorpay?.key_id||process.env.RAZORPAY_KEY_ID;
  const SEC=functions.config().razorpay?.secret||process.env.RAZORPAY_SECRET;
  if(!KID||!SEC){res.status(500).json({error:"Payment service not configured"});return;}
  try {
    const rzp=new Razorpay({key_id:KID,key_secret:SEC});
    const order=await rzp.orders.create({amount:UNLOCK_AMOUNT,currency:"INR",notes:{uid:decoded.uid,product:"cuet_unlimited"}});
    res.status(200).json({id:order.id,amount:order.amount,currency:order.currency});
  } catch(e){ functions.logger.error("Order fail:",e); res.status(500).json({error:"Could not create order. Try again."}); }
});

// 4. verifyPayment — server-side HMAC signature check + Firestore unlock
exports.verifyPayment = functions.runWith({timeoutSeconds:30,memory:"128MB"}).https.onRequest(async(req,res)=>{
  setCORS(res);
  if(req.method==="OPTIONS"){res.status(204).send("");return;}
  if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
  const decoded=await verifyToken(req,res); if(!decoded) return;
  const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body;
  if(!razorpay_order_id||!razorpay_payment_id||!razorpay_signature){res.status(400).json({error:"Missing payment params"});return;}
  const SEC=functions.config().razorpay?.secret||process.env.RAZORPAY_SECRET;
  if(!SEC){res.status(500).json({error:"Payment service not configured"});return;}
  const expected=crypto.createHmac("sha256",SEC).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
  if(expected!==razorpay_signature){ functions.logger.warn("Sig mismatch uid:",decoded.uid); res.status(400).json({error:"Signature verification failed",unlocked:false}); return; }
  try {
    await db.collection("users").doc(decoded.uid).update({unlocked:true,paymentId:razorpay_payment_id,orderId:razorpay_order_id,unlockedAt:admin.firestore.FieldValue.serverTimestamp()});
    await db.collection("payments").add({uid:decoded.uid,orderId:razorpay_order_id,paymentId:razorpay_payment_id,amount:UNLOCK_AMOUNT,status:"verified",createdAt:admin.firestore.FieldValue.serverTimestamp()});
    functions.logger.info("Unlocked uid:",decoded.uid);
    res.status(200).json({unlocked:true});
  } catch(e){ functions.logger.error("Firestore unlock fail:",e); res.status(500).json({error:"Unlock failed. Contact support: "+razorpay_payment_id,unlocked:false}); }
});

// 5. razorpayWebhook
exports.razorpayWebhook = functions.runWith({timeoutSeconds:30,memory:"128MB"}).https.onRequest(async(req,res)=>{
  if(req.method!=="POST"){res.status(405).send("Not allowed");return;}
  const WS=functions.config().razorpay?.webhook_secret||process.env.RAZORPAY_WEBHOOK_SECRET;
  if(!WS){res.status(500).send("Not configured");return;}
  const sig=req.headers["x-razorpay-signature"];
  const exp=crypto.createHmac("sha256",WS).update(JSON.stringify(req.body)).digest("hex");
  if(sig!==exp){functions.logger.warn("Webhook sig mismatch");res.status(400).send("Invalid signature");return;}
  const event=req.body.event; const payment=req.body.payload?.payment?.entity;
  if(event==="payment.captured"&&payment?.notes?.uid){
    try{ await db.collection("users").doc(payment.notes.uid).update({unlocked:true,unlockedAt:admin.firestore.FieldValue.serverTimestamp()}); }
    catch(e){ functions.logger.error("Webhook unlock fail:",e); }
  }
  res.status(200).json({status:"ok"});
});
