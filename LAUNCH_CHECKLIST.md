# CUET Platform — Launch Checklist & Configuration Guide

## ══════════════════════════════════════
## IMMEDIATE NEXT STEPS (in order)
## ══════════════════════════════════════

### STEP 1 — Provide credentials
Supply these before any deploy:
- [ ] Razorpay Test Key ID (rzp_test_xxx) — client-safe
- [ ] Razorpay Test Key Secret — server only
- [ ] Razorpay Webhook Secret — from Razorpay dashboard
- [ ] GA4 Measurement ID (G-XXXXXXXXXX)
- [ ] Firebase project config (from Firebase console)

### STEP 2 — Firebase setup
```bash
npm install -g firebase-tools
firebase login
firebase init   # select: Hosting, Functions, Firestore
cd functions && npm install
```

### STEP 3 — Set Cloud Function secrets
```bash
firebase functions:config:set \
  razorpay.key_id="rzp_test_xxx" \
  razorpay.key_secret="YOUR_SECRET" \
  razorpay.webhook_secret="YOUR_WEBHOOK_SECRET" \
  anthropic.api_key="sk-ant-xxx" \
  app.free_test_limit="5"
```

### STEP 4 — Configure GA4 conversion event
1. GA4 → Admin → Events → Mark as Conversion: payment_success
2. This tracks revenue. Do NOT mark payment_initiated as conversion.

### STEP 5 — Razorpay webhook
1. Razorpay Dashboard → Settings → Webhooks
2. URL: https://REGION-PROJECT_ID.cloudfunctions.net/razorpayWebhook
3. Events: payment.captured, payment.failed
4. Copy webhook secret → set in Step 3

### STEP 6 — Deploy
```bash
npm run build
firebase deploy
```

### STEP 7 — Toggle to live keys
Replace rzp_test_ with rzp_live_ in config when going live.

---

## ══════════════════════════════════════
## SECURITY CHECKLIST (tick all before launch)
## ══════════════════════════════════════

| Check | Status | Notes |
|-------|--------|-------|
| Can user bypass 5-test limit without paying? | ✅ NO | CF checks on every generation |
| Is Razorpay payment verified server-side before unlock? | ✅ YES | verifyPayment CF uses HMAC |
| Does payment failure leave user locked? | ✅ YES | Unlock only written on verified signature |
| Are all 9 GA4 events firing? | ⚠️ VERIFY | Check DebugView in GA4 |
| Is payment_success marked as GA4 conversion? | ⚠️ MANUAL | Set in GA4 admin |
| Are all secret keys in environment variables only? | ✅ YES | No secrets in App.jsx |
| Does UI handle all failure states? | ✅ YES | Error states on all async flows |
| Does unlock persist after page refresh? | ✅ YES | Stored in Firestore, read on auth |
| Razorpay webhook signature verified? | ✅ YES | razorpayWebhook CF verifies |
| Client cannot write unlocked=true directly? | ✅ YES | Firestore rules block it |

---

## ══════════════════════════════════════
## GA4 EVENTS REFERENCE
## ══════════════════════════════════════

| Event | Trigger | Mark as Conversion? |
|-------|---------|---------------------|
| page_view | Every screen change | No |
| sign_up | New Google/Facebook login | No |
| login | Returning user login | No |
| test_started | Begin Test clicked | No |
| test_completed | Submit button clicked | No |
| paywall_triggered | 5-test limit hit | No |
| payment_initiated | Razorpay modal opens | No |
| payment_success | Server-side verify passes | YES ✅ |
| payment_failed | Razorpay failure / dismiss | No |

---

## ══════════════════════════════════════
## OPEN ITEMS
## ══════════════════════════════════════

1. GitHub deploy — re-toggle Claude in Chrome extension, then `git push`
2. Auth decision — current build is auth-gated. Anonymous flow = different paywall arch.
3. Facebook auth — enabled in UI with tooltip. Activate in Firebase console when ready.
4. Razorpay live keys — switch from test to live before launch.
5. Rate limiting — add Firebase App Check before production launch.
6. Custom domain — configure in Firebase Hosting after deploy.

---

## ══════════════════════════════════════
## FILE STRUCTURE
## ══════════════════════════════════════

cuet-deploy/
├── src/
│   └── App.jsx              ← Complete React monolith (all 6 screens)
├── public/
│   └── index.html           ← GA4 + Razorpay SDK injection
├── functions/
│   ├── index.js             ← Cloud Functions (payment, limit, AI proxy)
│   └── package.json
├── firestore.rules          ← Firestore security rules
├── firebase.json            ← Hosting + Functions config
├── .env.template            ← Environment variable template
└── LAUNCH_CHECKLIST.md      ← This file
