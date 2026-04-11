/**
 * Paddle payment integration
 * Handles webhook events and provides helper functions for the Paddle API
 */
import { createHmac } from "crypto";
import { storage } from "./storage";

// ============================================================
// PADDLE CONFIG
// ============================================================
export const PADDLE_CONFIG = {
  apiKey: process.env.PADDLE_API_KEY || "",
  clientToken: process.env.PADDLE_CLIENT_TOKEN || "",
  webhookSecret: process.env.PADDLE_WEBHOOK_SECRET || "",
  prices: {
    plusMonthly: process.env.PADDLE_PRICE_PLUS_MONTHLY || "",
    credits10: process.env.PADDLE_PRICE_CREDITS_10 || "",
    credits25: process.env.PADDLE_PRICE_CREDITS_25 || "",
    credits50: process.env.PADDLE_PRICE_CREDITS_50 || "",
  },
  // Detect sandbox vs live based on client token prefix
  isSandbox: (process.env.PADDLE_CLIENT_TOKEN || "").startsWith("test_"),
};

// Map price ID to credit quantity
export function creditsForPriceId(priceId: string): number {
  if (priceId === PADDLE_CONFIG.prices.credits10) return 10;
  if (priceId === PADDLE_CONFIG.prices.credits25) return 25;
  if (priceId === PADDLE_CONFIG.prices.credits50) return 50;
  return 0;
}

// ============================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================
export function verifyPaddleWebhook(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  try {
    // Paddle sends: ts=timestamp;h1=signature
    const parts: Record<string, string> = {};
    signatureHeader.split(";").forEach((part) => {
      const [k, v] = part.split("=", 2);
      parts[k] = v;
    });

    const ts = parts["ts"];
    const h1 = parts["h1"];
    if (!ts || !h1) return false;

    const signed = `${ts}:${rawBody}`;
    const expected = createHmac("sha256", secret).update(signed).digest("hex");
    return expected === h1;
  } catch {
    return false;
  }
}

// ============================================================
// WEBHOOK EVENT HANDLERS
// ============================================================
export async function handlePaddleWebhook(eventType: string, data: any): Promise<void> {
  console.log(`[Paddle] Webhook received: ${eventType}`);

  switch (eventType) {
    case "subscription.created":
    case "subscription.activated": {
      // New Plus subscription — activate membership
      const customerId = data.customer_id;
      const subscriptionId = data.id;
      const nextBilledAt = data.next_billed_at || data.current_billing_period?.ends_at;

      // Find user by Paddle customer ID
      const user = await storage.getUserByPaddleCustomerId(customerId);
      if (!user) {
        console.error(`[Paddle] No user found for customer: ${customerId}`);
        return;
      }

      const expiresAt = nextBilledAt
        ? new Date(nextBilledAt).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await storage.updateUser(user.id, {
        membershipTier: "plus",
        membershipExpiresAt: expiresAt,
        highlightsRemaining: 5,
        paddleSubscriptionId: subscriptionId,
      });

      await storage.createNotification({
        userId: user.id,
        type: "system",
        title: "Welcome to Swapedly Plus!",
        body: "You now earn 1.5x SB on all rewards, get 5 highlighted listings/month, and unlimited free listings.",
        link: "/membership",
      });

      console.log(`[Paddle] Plus activated for user ${user.id}`);
      break;
    }

    case "subscription.canceled": {
      // Subscription cancelled — downgrade at period end
      const customerId = data.customer_id;
      const user = await storage.getUserByPaddleCustomerId(customerId);
      if (!user) return;

      // Keep active until current period ends — Paddle sends canceled_at
      await storage.createNotification({
        userId: user.id,
        type: "system",
        title: "Swapedly Plus Cancelled",
        body: "Your Plus membership has been cancelled. You'll keep benefits until the end of your billing period.",
        link: "/membership",
      });

      console.log(`[Paddle] Subscription cancelled for user ${user.id}`);
      break;
    }

    case "subscription.updated": {
      // Renewal — extend expiry date
      const customerId = data.customer_id;
      const nextBilledAt = data.next_billed_at || data.current_billing_period?.ends_at;
      const user = await storage.getUserByPaddleCustomerId(customerId);
      if (!user || !nextBilledAt) return;

      await storage.updateUser(user.id, {
        membershipExpiresAt: new Date(nextBilledAt).toISOString(),
        highlightsRemaining: 5, // Reset monthly highlights on renewal
      });

      console.log(`[Paddle] Subscription renewed for user ${user.id}`);
      break;
    }

    case "transaction.completed": {
      // One-time purchase (listing credits) or subscription payment
      const customerId = data.customer_id;
      const user = await storage.getUserByPaddleCustomerId(customerId);
      if (!user) return;

      // Check line items for credit purchases
      const items = data.details?.line_items || data.items || [];
      for (const item of items) {
        const priceId = item.price?.id || item.price_id;
        const credits = creditsForPriceId(priceId);
        if (credits > 0) {
          const current = await storage.getUserById(user.id);
          const newCredits = (current?.listingCredits || 0) + credits;
          await storage.updateUser(user.id, { listingCredits: newCredits });

          await storage.createNotification({
            userId: user.id,
            type: "system",
            title: "Listing Credits Added",
            body: `${credits} listing credits have been added to your account.`,
            link: "/membership",
          });

          console.log(`[Paddle] Added ${credits} credits to user ${user.id}`);
        }
      }
      break;
    }

    default:
      console.log(`[Paddle] Unhandled event type: ${eventType}`);
  }
}
