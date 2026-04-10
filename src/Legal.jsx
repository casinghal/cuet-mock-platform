/**
 * Vantiq CUET — Legal Pages
 * Routes: /privacy, /terms, /refunds
 */

import React from "react";

const EFFECTIVE_DATE = "10 April 2026";
const COMPANY       = "Vantiq Education";
const PLATFORM      = "Vantiq CUET Mock Test Platform";
const URL           = "https://vantiq-cuetmock.netlify.app";

// Email is never rendered in HTML — opened via JS only so it can't be scraped or indexed
const openSupport = () => {
  const u = atob("c2luZ2hhbC5hY2N1cm9uQGdtYWlsLmNvbQ=="); // base64 encoded
  window.location.href = "mailto:" + u;
};
const ContactLink = ({ text = "Contact Support" }) => (
  <span
    onClick={openSupport}
    style={{ color: "#4338CA", textDecoration: "underline", cursor: "pointer" }}
  >
    {text}
  </span>
);

const S = {
  page: {
    minHeight: "100vh",
    background: "#F8FAFC",
    fontFamily: "'Sora', sans-serif",
    color: "#1E293B",
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
  },
  logo: {
    color: "#fff",
    fontWeight: 700,
    fontSize: 16,
    textDecoration: "none",
    cursor: "pointer",
  },
  body: {
    maxWidth: 780,
    margin: "0 auto",
    padding: "48px 24px 80px",
  },
  h1: {
    fontSize: 28,
    fontWeight: 700,
    color: "#0F2747",
    marginBottom: 8,
    fontFamily: "'DM Serif Display', serif",
  },
  meta: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 40,
    paddingBottom: 24,
    borderBottom: "1px solid #E2E8F0",
  },
  h2: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0F2747",
    marginTop: 36,
    marginBottom: 10,
  },
  p: {
    fontSize: 14,
    lineHeight: 1.8,
    color: "#334155",
    marginBottom: 14,
  },
  ul: {
    paddingLeft: 20,
    marginBottom: 14,
  },
  li: {
    fontSize: 14,
    lineHeight: 1.8,
    color: "#334155",
    marginBottom: 6,
  },
  highlight: {
    background: "#FEF3C7",
    border: "1px solid #FCD34D",
    borderRadius: 8,
    padding: "14px 18px",
    fontSize: 14,
    color: "#92400E",
    marginBottom: 20,
    lineHeight: 1.7,
  },
  navLinks: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 40,
  },
  navLink: {
    fontSize: 13,
    color: "#4338CA",
    textDecoration: "underline",
    cursor: "pointer",
    background: "none",
    border: "none",
    fontFamily: "'Sora', sans-serif",
    padding: 0,
  },
  footer: {
    borderTop: "1px solid #E2E8F0",
    marginTop: 60,
    paddingTop: 24,
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
};

// ── Privacy Policy ────────────────────────────────────────────────────────────
function PrivacyPolicy() {
  return (
    <>
      <h1 style={S.h1}>Privacy Policy</h1>
      <p style={S.meta}>Effective Date: {EFFECTIVE_DATE} · {COMPANY} · <ContactLink /></p>

      <div style={S.highlight}>
        We do not sell, rent, or share your personal data with advertisers or third parties for marketing purposes. Your data is used solely to operate this platform.
      </div>

      <h2 style={S.h2}>1. Who We Are</h2>
      <p style={S.p}>{PLATFORM} is operated by {COMPANY}. This Privacy Policy explains how we collect, use, and protect information when you use our platform at {URL}.</p>

      <h2 style={S.h2}>2. Information We Collect</h2>
      <p style={S.p}>We collect the following information when you register or use the platform:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Account information:</strong> Your name and email address, collected via Google Sign-In.</li>
        <li style={S.li}><strong>Usage data:</strong> Tests taken, scores, topic performance, and timestamps.</li>
        <li style={S.li}><strong>Payment information:</strong> If you purchase access, your payment is processed by Razorpay. We receive only a confirmation of payment — we never see or store your card details.</li>
        <li style={S.li}><strong>Device data:</strong> Browser type and approximate location (country/region) collected automatically via Google Analytics.</li>
      </ul>

      <h2 style={S.h2}>3. How We Use Your Information</h2>
      <ul style={S.ul}>
        <li style={S.li}>To create and manage your account</li>
        <li style={S.li}>To track your test history and performance</li>
        <li style={S.li}>To process and verify payments</li>
        <li style={S.li}>To improve the platform based on usage patterns</li>
        <li style={S.li}>To send important service communications (not marketing)</li>
      </ul>

      <h2 style={S.h2}>4. Data Storage and Security</h2>
      <p style={S.p}>Your data is stored on Google Firebase (Firestore), which is hosted on Google Cloud Platform with industry-standard encryption. Payment transactions are processed and secured by Razorpay, which is PCI DSS compliant.</p>

      <h2 style={S.h2}>5. Third-Party Services</h2>
      <p style={S.p}>We use the following third-party services to operate the platform:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Google Firebase</strong> — Authentication and database</li>
        <li style={S.li}><strong>Razorpay</strong> — Payment processing</li>
        <li style={S.li}><strong>Google Analytics (GA4)</strong> — Usage analytics</li>
        <li style={S.li}><strong>Netlify</strong> — Website hosting</li>
      </ul>
      <p style={S.p}>Each of these services has its own privacy policy governing their use of your data.</p>

      <h2 style={S.h2}>6. Your Rights</h2>
      <p style={S.p}>You have the right to request access to your personal data, request deletion of your account and data, or raise a concern about how we handle your information. Contact us at <ContactLink />.</p>

      <h2 style={S.h2}>7. Children's Privacy</h2>
      <p style={S.p}>This platform is intended for students aged 17 and above (Class 12 / CUET aspirants). We do not knowingly collect data from children under 13. If you believe a child has registered, contact us immediately.</p>

      <h2 style={S.h2}>8. Changes to This Policy</h2>
      <p style={S.p}>We may update this Privacy Policy periodically. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>

      <h2 style={S.h2}>9. Contact</h2>
      <p style={S.p}>For privacy-related queries, email us at <ContactLink />.</p>
    </>
  );
}

// ── Terms & Conditions ────────────────────────────────────────────────────────
function TermsAndConditions() {
  return (
    <>
      <h1 style={S.h1}>Terms & Conditions</h1>
      <p style={S.meta}>Effective Date: {EFFECTIVE_DATE} · {COMPANY} · <ContactLink /></p>

      <div style={S.highlight}>
        By using this platform, you agree to these terms. Please read them carefully before registering or making a payment.
      </div>

      <h2 style={S.h2}>1. Acceptance of Terms</h2>
      <p style={S.p}>By accessing or using the {PLATFORM}, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the platform.</p>

      <h2 style={S.h2}>2. About the Service</h2>
      <p style={S.p}>{PLATFORM} provides NTA-pattern mock test papers for CUET UG aspirants. The platform is an independent preparation tool and is not affiliated with, endorsed by, or officially associated with the National Testing Agency (NTA) or any government body.</p>

      <h2 style={S.h2}>3. Account Registration</h2>
      <ul style={S.ul}>
        <li style={S.li}>You must register using a valid Google account.</li>
        <li style={S.li}>You are responsible for maintaining the security of your account.</li>
        <li style={S.li}>One account per person. Creating multiple accounts to circumvent free test limits is prohibited and may result in account termination.</li>
      </ul>

      <h2 style={S.h2}>4. Free and Paid Access</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>Free tier:</strong> Quick Practice (15 questions) is free forever with no limits. 4 full Mock Exams are provided free upon registration.</li>
        <li style={S.li}><strong>Paid tier:</strong> Unlimited Mock Exams are available for a one-time payment of ₹199, valid until 30 June 2026 or until the CUET UG 2026 examination cycle concludes.</li>
        <li style={S.li}>Pricing is subject to change. Existing paid users will not be affected by price changes during their paid period.</li>
      </ul>

      <h2 style={S.h2}>5. Content Accuracy</h2>
      <p style={S.p}>We make every effort to ensure our mock test questions follow the NTA CUET pattern and marking scheme. However:</p>
      <ul style={S.ul}>
        <li style={S.li}>We do not guarantee that questions will appear in the actual CUET examination.</li>
        <li style={S.li}>Scores on this platform are indicative only and do not predict actual exam performance.</li>
        <li style={S.li}>We are not responsible for any errors, omissions, or inaccuracies in the question content.</li>
      </ul>

      <h2 style={S.h2}>6. Prohibited Conduct</h2>
      <p style={S.p}>You agree not to:</p>
      <ul style={S.ul}>
        <li style={S.li}>Copy, reproduce, or distribute question content from the platform</li>
        <li style={S.li}>Attempt to bypass payment gates or free test limits</li>
        <li style={S.li}>Use automated tools or bots to access the platform</li>
        <li style={S.li}>Share your account credentials with others</li>
        <li style={S.li}>Reverse-engineer or interfere with the platform's functionality</li>
      </ul>

      <h2 style={S.h2}>7. Intellectual Property</h2>
      <p style={S.p}>All content on this platform — including question papers, explanations, analytics, and design — is the property of {COMPANY}. Unauthorised reproduction or distribution is prohibited.</p>

      <h2 style={S.h2}>8. Limitation of Liability</h2>
      <p style={S.p}>{COMPANY} shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to exam performance outcomes, data loss, or technical failures.</p>

      <h2 style={S.h2}>9. Termination</h2>
      <p style={S.p}>We reserve the right to suspend or terminate accounts that violate these terms without prior notice.</p>

      <h2 style={S.h2}>10. Governing Law</h2>
      <p style={S.p}>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in New Delhi, India.</p>

      <h2 style={S.h2}>11. Contact</h2>
      <p style={S.p}>For terms-related queries, contact us at <ContactLink />.</p>
    </>
  );
}

// ── Refund Policy ─────────────────────────────────────────────────────────────
function RefundPolicy() {
  return (
    <>
      <h1 style={S.h1}>Refund Policy</h1>
      <p style={S.meta}>Effective Date: {EFFECTIVE_DATE} · {COMPANY} · <ContactLink /></p>

      <div style={S.highlight}>
        <strong>Summary:</strong> All payments are non-refundable once platform access has been granted. Please read the full policy below.
      </div>

      <h2 style={S.h2}>1. Nature of the Product</h2>
      <p style={S.p}>{PLATFORM} provides a digital service — access to online mock test papers and analytics. Upon successful payment of ₹199, unlimited access is granted immediately and automatically.</p>

      <h2 style={S.h2}>2. No Refund Policy</h2>
      <p style={S.p}>Because our product is a digital service with immediate delivery, <strong>all payments are non-refundable</strong> once access has been granted to your account. This is consistent with Section 13(1)(a) of the Consumer Protection (E-Commerce) Rules, 2020, which permits exclusion of refunds for digital goods that are immediately consumed or delivered.</p>

      <h2 style={S.h2}>3. Exceptions — When We Will Refund</h2>
      <p style={S.p}>We will issue a full refund in the following situations only:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Duplicate payment:</strong> You were charged twice for the same order.</li>
        <li style={S.li}><strong>Payment deducted but access not granted:</strong> Your account was not unlocked within 24 hours of a confirmed payment.</li>
        <li style={S.li}><strong>Technical failure at our end:</strong> A verified platform outage prevented you from using the service for more than 72 continuous hours after payment.</li>
      </ul>

      <h2 style={S.h2}>4. How to Request a Refund</h2>
      <p style={S.p}>To request a refund under the above exceptions, email us at <ContactLink /> within 7 days of the payment date with:</p>
      <ul style={S.ul}>
        <li style={S.li}>Your registered email address</li>
        <li style={S.li}>Razorpay payment ID or transaction reference</li>
        <li style={S.li}>Description of the issue</li>
      </ul>
      <p style={S.p}>Valid refund requests will be processed within 7 working days to the original payment method.</p>

      <h2 style={S.h2}>5. Contact</h2>
      <p style={S.p}>For payment or refund queries, contact us at <ContactLink />.</p>
    </>
  );
}

// ── Main Legal Router ─────────────────────────────────────────────────────────
export default function LegalPage() {
  const path = window.location.pathname;
  const page = path.includes("privacy") ? "privacy"
             : path.includes("terms")   ? "terms"
             : path.includes("refund")  ? "refunds"
             : "privacy";

  const [current, setCurrent] = React.useState(page);

  const titles = {
    privacy:  "Privacy Policy",
    terms:    "Terms & Conditions",
    refunds:  "Refund Policy",
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.logo} onClick={() => window.location.href = "/"}>Vantiq CUET</span>
        <a href="/" style={{ ...S.logo, fontSize: 13, opacity: 0.7, textDecoration: "none", fontWeight: 400 }}>
          ← Back to platform
        </a>
      </div>

      <div style={S.body}>
        {/* Nav between legal pages */}
        <div style={S.navLinks}>
          {Object.entries(titles).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCurrent(key)}
              style={{
                ...S.navLink,
                fontWeight: current === key ? 700 : 400,
                color: current === key ? "#0F2747" : "#4338CA",
                textDecoration: current === key ? "none" : "underline",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {current === "privacy"  && <PrivacyPolicy />}
        {current === "terms"    && <TermsAndConditions />}
        {current === "refunds"  && <RefundPolicy />}

        <div style={S.footer}>
          © {new Date().getFullYear()} {COMPANY} · All rights reserved ·{" "}
          <button onClick={() => setCurrent("privacy")}  style={S.navLink}>Privacy Policy</button> ·{" "}
          <button onClick={() => setCurrent("terms")}    style={S.navLink}>Terms & Conditions</button> ·{" "}
          <button onClick={() => setCurrent("refunds")}  style={S.navLink}>Refund Policy</button>
        </div>
      </div>
    </div>
  );
}
