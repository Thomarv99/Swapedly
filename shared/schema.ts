import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// USERS
// ============================================================
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // hashed
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  location: text("location"),
  joinedAt: text("joined_at").notNull(), // ISO string
  role: text("role").notNull().default("user"), // "user" | "admin"
  isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: integer("referred_by"), // user id who referred them
  oauthProvider: text("oauth_provider"), // "google" | "apple" | "facebook" | null
  oauthId: text("oauth_id"),
  notificationPrefs: text("notification_prefs"), // JSON string
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  joinedAt: true,
  referralCode: true,
  isVerified: true,
  role: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================================
// WALLETS
// ============================================================
export const wallets = sqliteTable("wallets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique(),
  balance: real("balance").notNull().default(0), // Swap Bucks balance
  totalEarned: real("total_earned").notNull().default(0),
  totalSpent: real("total_spent").notNull().default(0),
});

export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

// ============================================================
// LISTINGS
// ============================================================
export const listings = sqliteTable("listings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sellerId: integer("seller_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(), // in Swap Bucks
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  condition: text("condition").notNull(), // "new" | "like_new" | "good" | "fair" | "poor"
  tags: text("tags"), // JSON array string
  images: text("images"), // JSON array of URLs
  videoUrl: text("video_url"),
  deliveryOptions: text("delivery_options").notNull(), // JSON: { localPickup: bool, shipping: bool, shippingCost?: number }
  status: text("status").notNull().default("active"), // "active" | "sold" | "draft" | "removed"
  views: integer("views").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  views: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listings.$inferSelect;

// ============================================================
// TRANSACTIONS (purchases)
// ============================================================
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  amount: real("amount").notNull(), // SB amount
  buyerFeeUsd: real("buyer_fee_usd").notNull(), // 10% capped at $20
  sellerFeeUsd: real("seller_fee_usd").notNull(), // 10% capped at $20
  status: text("status").notNull().default("pending"),
  // "pending" | "paid" | "shipped" | "delivered" | "completed" | "disputed" | "cancelled"
  deliveryMethod: text("delivery_method").notNull(), // "shipping" | "local_pickup"
  trackingNumber: text("tracking_number"),
  meetupLocation: text("meetup_location"),
  meetupDate: text("meetup_date"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  status: true,
  completedAt: true,
  createdAt: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ============================================================
// WALLET LEDGER (all SB movements)
// ============================================================
export const walletLedger = sqliteTable("wallet_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  amount: real("amount").notNull(), // positive = credit, negative = debit
  type: text("type").notNull(),
  // "welcome_bonus" | "listing_credit" | "purchase" | "sale" | "referral_bonus" |
  // "earn_task" | "purchase_sb" | "refund" | "admin_adjustment"
  description: text("description").notNull(),
  relatedTransactionId: integer("related_transaction_id"),
  relatedListingId: integer("related_listing_id"),
  createdAt: text("created_at").notNull(),
});

export const insertWalletLedgerSchema = createInsertSchema(walletLedger).omit({
  id: true,
  createdAt: true,
});
export type InsertWalletLedger = z.infer<typeof insertWalletLedgerSchema>;
export type WalletLedger = typeof walletLedger.$inferSelect;

// ============================================================
// MESSAGES
// ============================================================
export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  participant1Id: integer("participant1_id").notNull(),
  participant2Id: integer("participant2_id").notNull(),
  listingId: integer("listing_id"), // optional context
  lastMessageAt: text("last_message_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ============================================================
// REVIEWS
// ============================================================
export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").notNull(),
  reviewerId: integer("reviewer_id").notNull(),
  revieweeId: integer("reviewee_id").notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: text("created_at").notNull(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// ============================================================
// QUESTIONS & ANSWERS (on listings)
// ============================================================
export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id").notNull(),
  askerId: integer("asker_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer"),
  answeredAt: text("answered_at"),
  createdAt: text("created_at").notNull(),
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  answer: true,
  answeredAt: true,
  createdAt: true,
});
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

// ============================================================
// DISPUTES
// ============================================================
export const disputes = sqliteTable("disputes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").notNull(),
  filedById: integer("filed_by_id").notNull(),
  againstId: integer("against_id").notNull(),
  reason: text("reason").notNull(),
  // "item_not_received" | "item_not_as_described" | "seller_unresponsive" | "other"
  description: text("description").notNull(),
  evidence: text("evidence"), // JSON array of file URLs
  status: text("status").notNull().default("open"),
  // "open" | "under_review" | "resolved_buyer" | "resolved_seller" | "closed"
  adminNotes: text("admin_notes"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull(),
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  status: true,
  adminNotes: true,
  resolvedAt: true,
  createdAt: true,
});
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;

// ============================================================
// DISPUTE MESSAGES (timeline)
// ============================================================
export const disputeMessages = sqliteTable("dispute_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  disputeId: integer("dispute_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content").notNull(),
  attachments: text("attachments"), // JSON array of URLs
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const insertDisputeMessageSchema = createInsertSchema(disputeMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertDisputeMessage = z.infer<typeof insertDisputeMessageSchema>;
export type DisputeMessage = typeof disputeMessages.$inferSelect;

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  // "purchase" | "sale" | "message" | "dispute_update" | "review" | "referral" |
  // "listing_sold" | "shipping_update" | "earn_reward" | "system"
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"), // hash route to navigate to
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============================================================
// EARN TASKS
// ============================================================
export const earnTasks = sqliteTable("earn_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reward: real("reward").notNull(), // SB amount
  type: text("type").notNull(),
  // "survey" | "app_download" | "social_share" | "review_offer" | "referral"
  icon: text("icon"), // lucide icon name
  externalUrl: text("external_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  maxCompletions: integer("max_completions"), // null = unlimited
});

export const insertEarnTaskSchema = createInsertSchema(earnTasks).omit({ id: true });
export type InsertEarnTask = z.infer<typeof insertEarnTaskSchema>;
export type EarnTask = typeof earnTasks.$inferSelect;

// ============================================================
// EARN COMPLETIONS (tracks which user completed which task)
// ============================================================
export const earnCompletions = sqliteTable("earn_completions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  taskId: integer("task_id").notNull(),
  completedAt: text("completed_at").notNull(),
});

export const insertEarnCompletionSchema = createInsertSchema(earnCompletions).omit({
  id: true,
  completedAt: true,
});
export type InsertEarnCompletion = z.infer<typeof insertEarnCompletionSchema>;
export type EarnCompletion = typeof earnCompletions.$inferSelect;

// ============================================================
// FAVORITES (wishlist)
// ============================================================
export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  listingId: integer("listing_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;
