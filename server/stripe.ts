/**
 * Stripe payment integration
 * Handles checkout sessions, webhooks, and subscription management
 */
import Stripe from "stripe";
import { storage } from "./storage";

// Lazy init — only create Stripe instance when key is available
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(key, { apiVersion: "2025-01-27.acacia" });
  }
  return _stripe;
}
// Keep named export for backwards compat
export const stripe = { // proxy object
  get customers() { return getStripe().customers; },
  get checkout() { return getStripe().checkout; },
  get subscriptions() { return getStripe().subscriptions; },
  get webhooks() { return getStripe().webhooks; },
};

// ============================================================
// STRIPE CONFIG (sent to frontend)
// ============================================================
export const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  prices: {
    plusMonthly: process.env.STRIPE_PRICE_PLUS_MONTHLY || "",
    credits10: process.env.STRIPE_PRICE_CREDITS_10 || "",
    credits25: process.env.STRIPE_PRICE_CREDITS_25 || "",
    credits50: process.env.STRIPE_PRICE_CREDITS_50 || "",
  },
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
};

export function creditsForPriceId(priceId: string): number {
  if (priceId === STRIPE_CONFIG.prices.credits10) return 10;
  if (priceId === STRIPE_CONFIG.prices.credits25) return 25;
  if (priceId === STRIPE_CONFIG.prices.credits50) return 50;
  return 0;
}

// ============================================================
// CREATE CHECKOUT SESSION
// ============================================================
export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
  mode,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  userId: number;
  userEmail: string;
  mode: "subscription" | "payment";
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  // Get or create Stripe customer
  const s = getStripe();
  const user = await storage.getUserById(userId);
  let customerId = user?.paddleCustomerId; // reusing field for Stripe customer ID

  if (!customerId) {
    const customer = await s.customers.create({
      email: userEmail,
      metadata: { swapelyUserId: String(userId) },
    });
    customerId = customer.id;
    await storage.updateUser(userId, { paddleCustomerId: customerId });
  }

  const session = await s.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: String(userId) },
    allow_promotion_codes: true,
  });

  return session;
}

// ============================================================
// WEBHOOK EVENT HANDLERS
// ============================================================
export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  console.log(`[Stripe] Webhook: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = parseInt(session.metadata?.userId || "0");
      if (!userId) return;

      if (session.mode === "subscription") {
        // Plus subscription activated
        const subscriptionId = session.subscription as string;
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
        const periodEnd = new Date((subscription as any).current_period_end * 1000).toISOString();

        await storage.updateUser(userId, {
          membershipTier: "plus",
          membershipExpiresAt: periodEnd,
          highlightsRemaining: 5,
          paddleSubscriptionId: subscriptionId,
        });

        await storage.createNotification({
          userId,
          type: "system",
          title: "Welcome to Swapedly Plus!",
          body: "You now earn 1.5x SB on all rewards, get 5 highlighted listings/month, and unlimited free listings.",
          link: "/membership",
        });

        console.log(`[Stripe] Plus activated for user ${userId}`);
      } else if (session.mode === "payment") {
        // One-time credit purchase
        const lineItems = await getStripe().checkout.sessions.listLineItems(session.id);
        for (const item of lineItems.data) {
          const priceId = item.price?.id || "";
          const credits = creditsForPriceId(priceId);
          if (credits > 0) {
            const user = await storage.getUserById(userId);
            const newCredits = (user?.purchaseCredits || 0) + credits;
            await storage.updateUser(userId, { purchaseCredits: newCredits });

            await storage.createNotification({
              userId,
              type: "system",
              title: "Listing Credits Added",
              body: `${credits} listing credits have been added to your account.`,
              link: "/membership",
            });

            console.log(`[Stripe] Added ${credits} credits to user ${userId}`);
          }
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const user = await storage.getUserByPaddleCustomerId(customerId);
      if (!user) return;

      const periodEnd = new Date((subscription as any).current_period_end * 1000).toISOString();
      const status = subscription.status;

      if (status === "active") {
        await storage.updateUser(user.id, {
          membershipExpiresAt: periodEnd,
          highlightsRemaining: 5, // Reset on renewal
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const user = await storage.getUserByPaddleCustomerId(customerId);
      if (!user) return;

      await storage.updateUser(user.id, {
        membershipTier: "free",
        membershipExpiresAt: null,
        paddleSubscriptionId: null,
        highlightsRemaining: 0,
      });

      await storage.createNotification({
        userId: user.id,
        type: "system",
        title: "Swapedly Plus Cancelled",
        body: "Your Plus membership has ended. Upgrade again anytime to restore your benefits.",
        link: "/membership",
      });
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event: ${event.type}`);
  }
}
