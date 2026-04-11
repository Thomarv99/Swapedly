/**
 * Transactional email via Resend
 * Set RESEND_API_KEY in environment to enable.
 * Falls back to console logging when key is missing.
 */
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.EMAIL_FROM || "Swapedly <noreply@swapedly.com>";
const BASE_URL = process.env.APP_URL || "https://www.swapedly.com";

async function send(to: string, subject: string, html: string) {
  const r = getResend();
  if (!r) {
    console.log(`[Email] (no key) To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await r.emails.send({ from: FROM, to, subject, html });
    console.log(`[Email] Sent "${subject}" to ${to}`);
  } catch (e: any) {
    console.error(`[Email] Failed to send to ${to}:`, e.message);
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────
const baseStyle = `
  font-family: Inter, -apple-system, sans-serif;
  background: #f8fafc;
  padding: 40px 20px;
`;
const card = `
  max-width: 520px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
`;
const logo = `
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
    <div style="width:36px;height:36px;background:#5A45FF;border-radius:10px;display:flex;align-items:center;justify-content:center;">
      <span style="color:white;font-size:18px;font-weight:900;">⇄</span>
    </div>
    <span style="font-weight:800;font-size:20px;color:#0f172a;">Swapedly</span>
  </div>
`;
const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#5A45FF;color:white;font-weight:600;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;margin:20px 0;">${label}</a>`;
const footer = `<p style="color:#94a3b8;font-size:12px;margin-top:32px;">© ${new Date().getFullYear()} Swapedly · <a href="${BASE_URL}" style="color:#5A45FF;">swapedly.com</a></p>`;

// ─── Email Functions ───────────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, username: string, token: string) {
  const link = `${BASE_URL}/#/verify-email?token=${token}`;
  await send(to, "Verify your Swapedly email", `
    <div style="${baseStyle}">
      <div style="${card}">
        ${logo}
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Verify your email</h1>
        <p style="color:#64748b;margin:0 0 4px;">Hi ${username},</p>
        <p style="color:#64748b;">Click the button below to verify your email and activate your Swapedly account.</p>
        ${btn(link, "Verify Email")}
        <p style="color:#94a3b8;font-size:13px;">This link expires in 24 hours. If you didn't create a Swapedly account, ignore this email.</p>
        ${footer}
      </div>
    </div>
  `);
}

export async function sendWelcomeEmail(to: string, username: string) {
  await send(to, "Welcome to Swapedly! 🎉", `
    <div style="${baseStyle}">
      <div style="${card}">
        ${logo}
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Welcome to Swapedly!</h1>
        <p style="color:#64748b;">Hi ${username}, you're in! Here's how to get started:</p>
        <ol style="color:#475569;padding-left:20px;line-height:2;">
          <li>📸 <strong>List an item</strong> — takes less than 2 minutes</li>
          <li>🎯 <strong>Earn 30 Swap Bucks</strong> to unlock the marketplace</li>
          <li>🛍️ <strong>Browse &amp; buy</strong> items from other swappers</li>
          <li>💰 <strong>Refer friends</strong> — earn 1 SB per signup</li>
        </ol>
        ${btn(`${BASE_URL}/#/create-listing`, "List Your First Item")}
        ${footer}
      </div>
    </div>
  `);
}

export async function sendPasswordResetEmail(to: string, username: string, token: string) {
  const link = `${BASE_URL}/#/reset-password?token=${token}`;
  await send(to, "Reset your Swapedly password", `
    <div style="${baseStyle}">
      <div style="${card}">
        ${logo}
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Reset your password</h1>
        <p style="color:#64748b;">Hi ${username}, we received a request to reset your password.</p>
        ${btn(link, "Reset Password")}
        <p style="color:#94a3b8;font-size:13px;">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
        ${footer}
      </div>
    </div>
  `);
}

export async function sendPurchaseRequestEmail(to: string, sellerName: string, buyerName: string, itemTitle: string, sbAmount: number, txnId: number) {
  const link = `${BASE_URL}/#/transactions/${txnId}`;
  await send(to, `New purchase request for "${itemTitle}"`, `
    <div style="${baseStyle}">
      <div style="${card}">
        ${logo}
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">You have a purchase request!</h1>
        <p style="color:#64748b;">Hi ${sellerName},</p>
        <p style="color:#64748b;"><strong>${buyerName}</strong> wants to buy <strong>"${itemTitle}"</strong> for <strong>${sbAmount} Swap Bucks</strong>.</p>
        <p style="color:#64748b;">Their SB is held in escrow. Accept to proceed with the exchange.</p>
        ${btn(link, "Accept or Decline")}
        ${footer}
      </div>
    </div>
  `);
}

export async function sendPurchaseAcceptedEmail(to: string, buyerName: string, sellerName: string, itemTitle: string, txnId: number) {
  const link = `${BASE_URL}/#/transactions/${txnId}`;
  await send(to, `Your purchase was accepted!`, `
    <div style="${baseStyle}">
      <div style="${card}">
        ${logo}
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Purchase accepted! 🎉</h1>
        <p style="color:#64748b;">Hi ${buyerName},</p>
        <p style="color:#64748b;"><strong>${sellerName}</strong> accepted your purchase of <strong>"${itemTitle}"</strong>.</p>
        <p style="color:#64748b;">Head to the transaction chat to coordinate your exchange.</p>
        ${btn(link, "Go to Transaction Chat")}
        ${footer}
      </div>
    </div>
  `);
}

export async function sendExchangeCompleteEmail(to: string, name: string, itemTitle: string, sbAmount: number) {
  await send(to, `Exchange complete — ${sbAmount} SB transferred`, `
    <div style="${baseStyle}">
      <div style="${card}">
        ${logo}
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Exchange complete! ✅</h1>
        <p style="color:#64748b;">Hi ${name},</p>
        <p style="color:#64748b;">Your exchange for <strong>"${itemTitle}"</strong> is complete. <strong>${sbAmount} Swap Bucks</strong> have been transferred.</p>
        ${btn(`${BASE_URL}/#/wallet`, "View Wallet")}
        ${footer}
      </div>
    </div>
  `);
}
