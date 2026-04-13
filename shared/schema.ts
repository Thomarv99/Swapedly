import { pgTable, text, integer, real, boolean, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Helper: ISO timestamp default
const now = () => new Date().toISOString();

// ============================================================
// USERS
// ============================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  location: text("location"),
  city: text("city"),
  phone: text("phone"),
  joinedAt: text("joined_at").notNull(),
  role: text("role").notNull().default("user"),
  isVerified: boolean("is_verified").notNull().default(false),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: integer("referred_by"),
  oauthProvider: text("oauth_provider"),
  oauthId: text("oauth_id"),
  notificationPrefs: text("notification_prefs"),
  membershipTier: text("membership_tier").notNull().default("free"),
  membershipExpiresAt: text("membership_expires_at"),
  highlightsRemaining: integer("highlights_remaining").notNull().default(0),
  purchaseCredits: integer("purchase_credits").notNull().default(0),
  paddleCustomerId: text("paddle_customer_id"),
  paddleSubscriptionId: text("paddle_subscription_id"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  onboardingStep: text("onboarding_step").notNull().default("listings"),
  onboardingListingsCount: integer("onboarding_listings_count").notNull().default(0),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true, joinedAt: true, referralCode: true, isVerified: true, role: true,
  membershipTier: true, membershipExpiresAt: true, highlightsRemaining: true,
  purchaseCredits: true, paddleCustomerId: true, paddleSubscriptionId: true,
  onboardingComplete: true, onboardingStep: true, onboardingListingsCount: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================================
// AUTH TOKENS (replaces in-memory Map)
// ============================================================
export const authTokens = pgTable("auth_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});
export type AuthToken = typeof authTokens.$inferSelect;

// ============================================================
// WALLETS
// ============================================================
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  balance: real("balance").notNull().default(0),
  totalEarned: real("total_earned").notNull().default(0),
  totalSpent: real("total_spent").notNull().default(0),
});
export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

// ============================================================
// LISTINGS
// ============================================================
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  condition: text("condition").notNull(),
  tags: text("tags"),
  images: text("images"),
  videoUrl: text("video_url"),
  deliveryOptions: text("delivery_options").notNull(),
  status: text("status").notNull().default("active"),
  isHighlighted: boolean("is_highlighted").notNull().default(false),
  highlightedAt: text("highlighted_at"),
  views: integer("views").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const insertListingSchema = createInsertSchema(listings).omit({
  id: true, views: true, status: true, createdAt: true, updatedAt: true,
});
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listings.$inferSelect;

// ============================================================
// TRANSACTIONS
// ============================================================
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  amount: real("amount").notNull(),
  buyerFeeUsd: real("buyer_fee_usd").notNull(),
  sellerFeeUsd: real("seller_fee_usd").notNull(),
  status: text("status").notNull().default("pending"),
  deliveryMethod: text("delivery_method").notNull(),
  trackingNumber: text("tracking_number"),
  meetupLocation: text("meetup_location"),
  meetupDate: text("meetup_date"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
});
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true, status: true, completedAt: true, createdAt: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ============================================================
// WALLET LEDGER
// ============================================================
export const walletLedger = pgTable("wallet_ledger", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: real("amount").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  relatedTransactionId: integer("related_transaction_id"),
  relatedListingId: integer("related_listing_id"),
  createdAt: text("created_at").notNull(),
});
export const insertWalletLedgerSchema = createInsertSchema(walletLedger).omit({ id: true, createdAt: true });
export type InsertWalletLedger = z.infer<typeof insertWalletLedgerSchema>;
export type WalletLedger = typeof walletLedger.$inferSelect;

// ============================================================
// MESSAGES
// ============================================================
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1Id: integer("participant1_id").notNull(),
  participant2Id: integer("participant2_id").notNull(),
  listingId: integer("listing_id"),
  lastMessageAt: text("last_message_at").notNull(),
  createdAt: text("created_at").notNull(),
});
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: text("created_at").notNull(),
});
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, isRead: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ============================================================
// REVIEWS
// ============================================================
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  reviewerId: integer("reviewer_id").notNull(),
  revieweeId: integer("reviewee_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: text("created_at").notNull(),
});
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// ============================================================
// QUESTIONS & ANSWERS
// ============================================================
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull(),
  askerId: integer("asker_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer"),
  answeredAt: text("answered_at"),
  createdAt: text("created_at").notNull(),
});
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true, answer: true, answeredAt: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

// ============================================================
// DISPUTES
// ============================================================
export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  filedById: integer("filed_by_id").notNull(),
  againstId: integer("against_id").notNull(),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  evidence: text("evidence"),
  status: text("status").notNull().default("open"),
  adminNotes: text("admin_notes"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull(),
});
export const insertDisputeSchema = createInsertSchema(disputes).omit({ id: true, status: true, adminNotes: true, resolvedAt: true, createdAt: true });
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;

export const disputeMessages = pgTable("dispute_messages", {
  id: serial("id").primaryKey(),
  disputeId: integer("dispute_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content").notNull(),
  attachments: text("attachments"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: text("created_at").notNull(),
});
export const insertDisputeMessageSchema = createInsertSchema(disputeMessages).omit({ id: true, createdAt: true });
export type InsertDisputeMessage = z.infer<typeof insertDisputeMessageSchema>;
export type DisputeMessage = typeof disputeMessages.$inferSelect;

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: text("created_at").notNull(),
});
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, isRead: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============================================================
// EARN TASKS
// ============================================================
export const earnTasks = pgTable("earn_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reward: real("reward").notNull(),
  type: text("type").notNull(),
  icon: text("icon"),
  externalUrl: text("external_url"),
  isActive: boolean("is_active").notNull().default(true),
  maxCompletions: integer("max_completions"),
});
export const insertEarnTaskSchema = createInsertSchema(earnTasks).omit({ id: true });
export type InsertEarnTask = z.infer<typeof insertEarnTaskSchema>;
export type EarnTask = typeof earnTasks.$inferSelect;

export const earnCompletions = pgTable("earn_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  taskId: integer("task_id").notNull(),
  completedAt: text("completed_at").notNull(),
});
export const insertEarnCompletionSchema = createInsertSchema(earnCompletions).omit({ id: true, completedAt: true });
export type InsertEarnCompletion = z.infer<typeof insertEarnCompletionSchema>;
export type EarnCompletion = typeof earnCompletions.$inferSelect;

// ============================================================
// FAVORITES
// ============================================================
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  listingId: integer("listing_id").notNull(),
  createdAt: text("created_at").notNull(),
});
export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

// ============================================================
// SOCIAL ACCOUNTS
// ============================================================
export const socialAccounts = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  platform: text("platform").notNull(),
  handle: text("handle").notNull(),
  profileUrl: text("profile_url"),
  createdAt: text("created_at").notNull(),
});
export const insertSocialAccountSchema = createInsertSchema(socialAccounts).omit({ id: true, createdAt: true });
export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;
export type SocialAccount = typeof socialAccounts.$inferSelect;

// ============================================================
// SOCIAL SHARES
// ============================================================
export const socialShares = pgTable("social_shares", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  listingId: integer("listing_id").notNull(),
  platform: text("platform").notNull(),
  postUrl: text("post_url").notNull(),
  status: text("status").notNull().default("pending"),
  reward: real("reward").notNull().default(5),
  rewardPaid: boolean("reward_paid").notNull().default(false),
  createdAt: text("created_at").notNull(),
});
export const insertSocialShareSchema = createInsertSchema(socialShares).omit({ id: true, status: true, rewardPaid: true, createdAt: true });
export type InsertSocialShare = z.infer<typeof insertSocialShareSchema>;
export type SocialShare = typeof socialShares.$inferSelect;

// ============================================================
// REFERRAL CLICKS
// ============================================================
export const referralClicks = pgTable("referral_clicks", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referralCode: text("referral_code").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  convertedUserId: integer("converted_user_id"),
  createdAt: text("created_at").notNull(),
});
export const insertReferralClickSchema = createInsertSchema(referralClicks).omit({ id: true, createdAt: true });
export type InsertReferralClick = z.infer<typeof insertReferralClickSchema>;
export type ReferralClick = typeof referralClicks.$inferSelect;

// ============================================================
// PAGE VIEWS
// ============================================================
export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  path: text("path").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  country: text("country"),
  sessionId: text("session_id"),
  userId: integer("user_id"),
  createdAt: text("created_at").notNull(),
});
export const insertPageViewSchema = createInsertSchema(pageViews).omit({ id: true, createdAt: true });
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type PageView = typeof pageViews.$inferSelect;

// ============================================================
// GIFT CARD INVITES
// ============================================================
export const giftCardInvites = pgTable("gift_card_invites", {
  id: serial("id").primaryKey(),
  inviterId: integer("inviter_id").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  clickCount: integer("click_count").notNull().default(0),
  unlocked: boolean("unlocked").notNull().default(false),
  unlockedAt: text("unlocked_at"),
  createdAt: text("created_at").notNull(),
});
export type GiftCardInvite = typeof giftCardInvites.$inferSelect;

// ============================================================
// GIFT CARD REDEMPTIONS
// ============================================================
export const giftCardRedemptions = pgTable("gift_card_redemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  code: text("code").notNull(),
  sbAmount: integer("sb_amount").notNull().default(40),
  referredBy: integer("referred_by"),
  redeemedAt: text("redeemed_at").notNull(),
});
export const insertGiftCardRedemptionSchema = createInsertSchema(giftCardRedemptions).omit({ id: true });
export type InsertGiftCardRedemption = z.infer<typeof insertGiftCardRedemptionSchema>;
export type GiftCardRedemption = typeof giftCardRedemptions.$inferSelect;

// ============================================================
// AFFILIATES
// ============================================================
export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  code: text("code").notNull().unique(),           // vanity code e.g. "johndoe"
  name: text("name").notNull(),
  email: text("email").notNull(),
  platform: text("platform").notNull(),            // youtube | tiktok | instagram | twitter | blog | other
  platformUrl: text("platform_url"),
  audienceSize: text("audience_size"),             // "1k-10k" | "10k-100k" | "100k+"
  niche: text("niche"),                            // "tech" | "fashion" | "gaming" | "lifestyle" | "other"
  status: text("status").notNull().default("active"), // active | suspended | pending
  pendingBalance: real("pending_balance").notNull().default(0),
  paidBalance: real("paid_balance").notNull().default(0),
  paypalEmail: text("paypal_email"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});
export const insertAffiliateSchema = createInsertSchema(affiliates).omit({ id: true, createdAt: true, pendingBalance: true, paidBalance: true, status: true });
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type Affiliate = typeof affiliates.$inferSelect;

// ============================================================
// AFFILIATE CONVERSIONS
// ============================================================
export const affiliateConversions = pgTable("affiliate_conversions", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull(),
  referredUserId: integer("referred_user_id").notNull(),
  type: text("type").notNull(),                   // "sb_purchase" | "plus_subscription" | "purchase_credits"
  revenueUsd: real("revenue_usd").notNull(),      // gross revenue of the event
  commissionUsd: real("commission_usd").notNull(), // affiliate's cut
  commissionRate: real("commission_rate").notNull(), // 0.25 | 0.15 | 0.10
  stripePaymentId: text("stripe_payment_id"),
  paid: boolean("paid").notNull().default(false),
  createdAt: text("created_at").notNull(),
});
export const insertAffiliateConversionSchema = createInsertSchema(affiliateConversions).omit({ id: true, createdAt: true, paid: true });
export type InsertAffiliateConversion = z.infer<typeof insertAffiliateConversionSchema>;
export type AffiliateConversion = typeof affiliateConversions.$inferSelect;

// ============================================================
// AFFILIATE PAYOUTS
// ============================================================
export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull(),
  amountUsd: real("amount_usd").notNull(),
  method: text("method").notNull().default("paypal"),
  reference: text("reference"),                   // PayPal transaction ID or note
  note: text("note"),
  createdAt: text("created_at").notNull(),
});
export type AffiliatePayout = typeof affiliatePayouts.$inferSelect;
