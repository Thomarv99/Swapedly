import {
  type User, type InsertUser, users,
  type Wallet, type InsertWallet, wallets,
  type WalletLedger, type InsertWalletLedger, walletLedger,
  type Listing, type InsertListing, listings,
  type Transaction, type InsertTransaction, transactions,
  type Conversation, type InsertConversation, conversations,
  type Message, type InsertMessage, messages,
  type Review, type InsertReview, reviews,
  type Question, type InsertQuestion, questions,
  type Dispute, type InsertDispute, disputes,
  type DisputeMessage, type InsertDisputeMessage, disputeMessages,
  type Notification, type InsertNotification, notifications,
  type EarnTask, type InsertEarnTask, earnTasks,
  type EarnCompletion, type InsertEarnCompletion, earnCompletions,
  type Favorite, type InsertFavorite, favorites,
  type SocialAccount, type InsertSocialAccount, socialAccounts,
  type SocialShare, type InsertSocialShare, socialShares,
  type ReferralClick, type InsertReferralClick, referralClicks,
  type PageView, type InsertPageView, pageViews,
  authTokens,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, or, ilike, desc, asc, sql, gte, lte, count } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("\n\n❌ DATABASE_URL is not set. Go to Render → Environment and add your PostgreSQL connection string.\n");
  process.exit(1);
}

// Render uses postgresql:// but pg requires postgres://
const dbUrl = process.env.DATABASE_URL?.replace('postgresql://', 'postgres://');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});


export const db = drizzle(pool);

// Raw SQL helpers using pg pool
export const storage_raw = {
  query: (sql_str: string, params: any[] = []) => {
    // Sync wrapper not possible with pg — use async in routes that need raw queries
    return [] as any[];
  },
  run: (sql_str: string, params: any[] = []) => {
    pool.query(sql_str, params).catch(e => console.error("storage_raw.run:", e.message));
  },
  queryAsync: async (sql_str: string, params: any[] = []) => {
    const result = await pool.query(sql_str, params);
    return result.rows;
  },
  runAsync: async (sql_str: string, params: any[] = []) => {
    await pool.query(sql_str, params);
  },
};

// Initialize all tables on startup
export async function initializeDatabase() {
  try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      bio TEXT,
      location TEXT,
      city TEXT,
      phone TEXT,
      joined_at TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      is_verified BOOLEAN NOT NULL DEFAULT false,
      referral_code TEXT NOT NULL UNIQUE,
      referred_by INTEGER,
      oauth_provider TEXT,
      oauth_id TEXT,
      notification_prefs TEXT,
      membership_tier TEXT NOT NULL DEFAULT 'free',
      membership_expires_at TEXT,
      highlights_remaining INTEGER NOT NULL DEFAULT 0,
      purchase_credits INTEGER NOT NULL DEFAULT 0,
      paddle_customer_id TEXT,
      paddle_subscription_id TEXT,
      onboarding_complete BOOLEAN NOT NULL DEFAULT false,
      onboarding_step TEXT NOT NULL DEFAULT 'listings',
      onboarding_listings_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id SERIAL PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS wallets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      balance REAL NOT NULL DEFAULT 0,
      total_earned REAL NOT NULL DEFAULT 0,
      total_spent REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS listings (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      condition TEXT NOT NULL,
      tags TEXT,
      images TEXT,
      video_url TEXT,
      delivery_options TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      is_highlighted BOOLEAN NOT NULL DEFAULT false,
      highlighted_at TEXT,
      views INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      buyer_fee_usd REAL NOT NULL,
      seller_fee_usd REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      delivery_method TEXT NOT NULL,
      tracking_number TEXT,
      meetup_location TEXT,
      meetup_date TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS wallet_ledger (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      related_transaction_id INTEGER,
      related_listing_id INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      participant1_id INTEGER NOT NULL,
      participant2_id INTEGER NOT NULL,
      listing_id INTEGER,
      last_message_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      transaction_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      reviewee_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL,
      asker_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      answered_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS disputes (
      id SERIAL PRIMARY KEY,
      transaction_id INTEGER NOT NULL,
      filed_by_id INTEGER NOT NULL,
      against_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      description TEXT NOT NULL,
      evidence TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      admin_notes TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dispute_messages (
      id SERIAL PRIMARY KEY,
      dispute_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS earn_tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reward REAL NOT NULL,
      type TEXT NOT NULL,
      icon TEXT,
      external_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      max_completions INTEGER
    );
    CREATE TABLE IF NOT EXISTS earn_completions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      completed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      listing_id INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS social_accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      handle TEXT NOT NULL,
      profile_url TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS social_shares (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      listing_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      post_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reward REAL NOT NULL DEFAULT 5,
      reward_paid BOOLEAN NOT NULL DEFAULT false,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS referral_clicks (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER NOT NULL,
      referral_code TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      converted_user_id INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS page_views (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      country TEXT,
      session_id TEXT,
      user_id INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gift_card_invites (
      id SERIAL PRIMARY KEY,
      inviter_id INTEGER NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      click_count INTEGER NOT NULL DEFAULT 0,
      unlocked BOOLEAN NOT NULL DEFAULT false,
      unlocked_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gift_card_redemptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      sb_amount INTEGER NOT NULL DEFAULT 40,
      referred_by INTEGER,
      redeemed_at TEXT NOT NULL
    );
  `);
  console.log("[DB] All tables initialized");
  } catch (err: any) {
    console.error("[DB] Failed to initialize tables:", err.message);
    console.error("[DB] Check that DATABASE_URL is correct and the database is reachable.");
    process.exit(1);
  }
}


export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(page: number, limit: number): Promise<{ users: User[]; total: number }>;

  // Wallets
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  getWalletByUserId(userId: number): Promise<Wallet | undefined>;
  updateWalletBalance(userId: number, balance: number, totalEarned: number, totalSpent: number): Promise<Wallet | undefined>;
  creditWallet(userId: number, amount: number): Promise<Wallet | undefined>;
  debitWallet(userId: number, amount: number): Promise<Wallet | undefined>;

  // Wallet Ledger
  createLedgerEntry(entry: InsertWalletLedger): Promise<WalletLedger>;
  getLedgerByUserId(userId: number, page: number, limit: number): Promise<{ entries: WalletLedger[]; total: number }>;

  // Listings
  createListing(listing: InsertListing): Promise<Listing>;
  getListingById(id: number): Promise<Listing | undefined>;
  getListings(filters: {
    category?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ listings: Listing[]; total: number }>;
  updateListing(id: number, data: Partial<Listing>): Promise<Listing | undefined>;
  getListingsBySellerId(sellerId: number): Promise<Listing[]>;

  // Transactions
  createTransaction(txn: InsertTransaction): Promise<Transaction>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  getConversationByParticipants(userId1: number, userId2: number): Promise<Conversation | undefined>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  updateTransactionStatus(id: number, data: Partial<Transaction>): Promise<Transaction | undefined>;

  // Conversations & Messages
  createConversation(conv: InsertConversation): Promise<Conversation>;
  getConversationById(id: number): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: number): Promise<Conversation[]>;
  findConversation(participant1Id: number, participant2Id: number, listingId?: number): Promise<Conversation | undefined>;
  createMessage(msg: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  markMessagesAsRead(conversationId: number, userId: number): Promise<void>;
  updateConversationLastMessage(conversationId: number, timestamp: string): Promise<void>;

  // Reviews
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByUserId(userId: number): Promise<Review[]>;
  getReviewsByTransactionId(transactionId: number): Promise<Review[]>;

  // Questions
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestionById(id: number): Promise<Question | undefined>;
  getQuestionsByListingId(listingId: number): Promise<Question[]>;
  answerQuestion(id: number, answer: string): Promise<Question | undefined>;

  // Disputes
  createDispute(dispute: InsertDispute): Promise<Dispute>;
  getDisputeById(id: number): Promise<Dispute | undefined>;
  getDisputesByUserId(userId: number): Promise<Dispute[]>;
  getAllDisputes(): Promise<Dispute[]>;
  updateDisputeStatus(id: number, data: Partial<Dispute>): Promise<Dispute | undefined>;
  createDisputeMessage(msg: InsertDisputeMessage): Promise<DisputeMessage>;
  getDisputeMessages(disputeId: number): Promise<DisputeMessage[]>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUserId(userId: number): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: number): Promise<void>;
  getUnreadCount(userId: number): Promise<number>;

  // Earn Tasks
  getActiveTasks(): Promise<EarnTask[]>;
  getAllTasks(): Promise<EarnTask[]>;
  getTaskById(id: number): Promise<EarnTask | undefined>;
  createEarnTask(task: InsertEarnTask): Promise<EarnTask>;
  updateEarnTask(id: number, data: Partial<EarnTask>): Promise<EarnTask | undefined>;
  createEarnCompletion(completion: InsertEarnCompletion): Promise<EarnCompletion>;
  getCompletionsByUserId(userId: number): Promise<EarnCompletion[]>;
  getCompletionByUserAndTask(userId: number, taskId: number): Promise<EarnCompletion | undefined>;

  // Favorites
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, listingId: number): Promise<void>;
  getFavoritesByUserId(userId: number): Promise<Favorite[]>;
  isFavorited(userId: number, listingId: number): Promise<boolean>;

  // Paddle / Stripe
  getUserByPaddleCustomerId(customerId: string): Promise<User | undefined>;

  // Analytics
  trackPageView(data: InsertPageView): Promise<void>;
  getAnalytics(days: number): Promise<{
    totalViews: number;
    uniqueSessions: number;
    topPages: Array<{ path: string; views: number }>;
    viewsByDay: Array<{ date: string; views: number }>;
    topReferrers: Array<{ referrer: string; views: number }>;
    newUsersByDay: Array<{ date: string; signups: number }>;
  }>;

  // Leaderboard
  getLeaderboard(limit: number): Promise<Array<{ userId: number; username: string; displayName: string | null; avatarUrl: string | null; membershipTier: string; totalEarned: number; balance: number }>>;

  // Referral tracking
  trackReferralClick(data: InsertReferralClick): Promise<ReferralClick>;
  markReferralConverted(referralCode: string, convertedUserId: number): Promise<void>;
  getReferralStatsByUserId(userId: number): Promise<{ clicks: number; signups: number; creditsEarned: number }>;
  getAllReferralStats(): Promise<Array<{ userId: number; username: string; clicks: number; signups: number; creditsEarned: number }>>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;

  // Social Accounts
  createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount>;
  getSocialAccountsByUserId(userId: number): Promise<SocialAccount[]>;
  getSocialAccountByPlatform(userId: number, platform: string): Promise<SocialAccount | undefined>;
  deleteSocialAccount(id: number): Promise<void>;
  updateSocialAccount(id: number, data: Partial<SocialAccount>): Promise<SocialAccount | undefined>;

  // Social Shares
  createSocialShare(share: InsertSocialShare): Promise<SocialShare>;
  getSocialSharesByUserId(userId: number): Promise<SocialShare[]>;
  getSocialSharesByListingId(listingId: number): Promise<SocialShare[]>;
  hasUserSharedOnPlatform(userId: number, listingId: number, platform: string): Promise<boolean>;
  updateSocialShareStatus(id: number, data: Partial<SocialShare>): Promise<SocialShare | undefined>;
}

export class DatabaseStorage implements IStorage {
  // ===== USERS =====
  async createUser(insertUser: InsertUser): Promise<User> {
    return (await db.insert(users).values(insertUser).returning())[0];
  }

  async getUserById(id: number): Promise<User | undefined> {
    return (await db.select().from(users).where(eq(users.id, id)))[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return (await db.select().from(users).where(eq(users.email, email)))[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return (await db.select().from(users).where(eq(users.username, username)))[0];
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    return (await db.select().from(users).where(eq(users.referralCode, code)))[0];
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    return (await db.update(users).set(data).where(eq(users.id, id)).returning())[0];
  }

  async getAllUsers(page: number, limit: number): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    const result = db.select().from(users).limit(limit).offset(offset);
    const totalResult = db.select({ count: count() }).from(users);
    return { users: result, total: totalResult?.count ?? 0 };
  }

  // ===== WALLETS =====
  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    return (await db.insert(wallets).values(wallet).returning())[0];
  }

  async getWalletByUserId(userId: number): Promise<Wallet | undefined> {
    return (await db.select().from(wallets).where(eq(wallets.userId, userId)))[0];
  }

  async updateWalletBalance(userId: number, balance: number, totalEarned: number, totalSpent: number): Promise<Wallet | undefined> {
    return await db.update(wallets).set({ balance, totalEarned, totalSpent }).where(eq(wallets.userId, userId)).returning();
  }

  async creditWallet(userId: number, amount: number): Promise<Wallet | undefined> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) return undefined;
    return await db.update(wallets).set({
      balance: wallet.balance + amount,
      totalEarned: wallet.totalEarned + amount,
    }).where(eq(wallets.userId, userId)).returning();
  }

  async debitWallet(userId: number, amount: number): Promise<Wallet | undefined> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) return undefined;
    if (wallet.balance < amount) return undefined;
    return await db.update(wallets).set({
      balance: wallet.balance - amount,
      totalSpent: wallet.totalSpent + amount,
    }).where(eq(wallets.userId, userId)).returning();
  }

  // ===== WALLET LEDGER =====
  async createLedgerEntry(entry: InsertWalletLedger): Promise<WalletLedger> {
    return await db.insert(walletLedger).values({
      ...entry,
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async getLedgerByUserId(userId: number, page: number, limit: number): Promise<{ entries: WalletLedger[]; total: number }> {
    const offset = (page - 1) * limit;
    const entries = db.select().from(walletLedger)
      .where(eq(walletLedger.userId, userId))
      .orderBy(desc(walletLedger.createdAt))
      .limit(limit)
      .offset(offset)
      ;
    const totalResult = db.select({ count: count() }).from(walletLedger)
      .where(eq(walletLedger.userId, userId));
    return { entries, total: totalResult?.count ?? 0 };
  }

  // ===== LISTINGS =====
  async createListing(listing: InsertListing): Promise<Listing> {
    const now = new Date().toISOString();
    return await db.insert(listings).values({
      ...listing,
      status: "active",
      views: 0,
      createdAt: now,
      updatedAt: now,
    }).returning();
  }

  async getListingById(id: number): Promise<Listing | undefined> {
    return (await db.select().from(listings).where(eq(listings.id, id)))[0];
  }

  async getListings(filters: {
    category?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
    status?: string;
    city?: string;
  }): Promise<{ listings: Listing[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (filters.status) {
      conditions.push(eq(listings.status, filters.status));
    } else {
      conditions.push(eq(listings.status, "active"));
    }

    if (filters.category) {
      conditions.push(eq(listings.category, filters.category));
    }
    if (filters.condition) {
      conditions.push(eq(listings.condition, filters.condition));
    }
    if (filters.minPrice !== undefined) {
      conditions.push(gte(listings.price, filters.minPrice));
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(lte(listings.price, filters.maxPrice));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(listings.title, `%${filters.search}%`),
          ilike(listings.description, `%${filters.search}%`)
        )
      );
    }
    if (filters.city) {
      // Filter by seller city — join handled via subquery approach
      conditions.push(
        sql`${listings.sellerId} IN (SELECT id FROM users WHERE city = ${filters.city})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderClause;
    switch (filters.sort) {
      case "price_asc":
        orderClause = asc(listings.price);
        break;
      case "price_desc":
        orderClause = desc(listings.price);
        break;
      case "newest":
      default:
        orderClause = desc(listings.createdAt);
        break;
    }

    const result = db.select().from(listings)
      .where(whereClause)
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset)
      ;

    const totalResult = db.select({ count: count() }).from(listings)
      .where(whereClause);

    return { listings: result, total: totalResult?.count ?? 0 };
  }

  async updateListing(id: number, data: Partial<Listing>): Promise<Listing | undefined> {
    return await db.update(listings).set({
      ...data,
      updatedAt: new Date().toISOString(),
    }).where(eq(listings.id, id)).returning();
  }

  async getListingsBySellerId(sellerId: number): Promise<Listing[]> {
    return await db.select().from(listings).where(eq(listings.sellerId, sellerId)).orderBy(desc(listings.createdAt));
  }

  // ===== TRANSACTIONS =====
  async createTransaction(txn: InsertTransaction): Promise<Transaction> {
    return await db.insert(transactions).values({
      ...txn,
      status: "paid",
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async getTransactionById(id: number): Promise<Transaction | undefined> {
    return (await db.select().from(transactions).where(eq(transactions.id, id)))[0];
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    return (await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning())[0];
  }

  async getConversationByParticipants(userId1: number, userId2: number): Promise<Conversation | undefined> {
    const all = await this.getConversationsByUserId(userId1);
    return all.find(conv => {
      try {
        const ids = JSON.parse(conv.participantIds || "[]");
        return ids.includes(userId1) && ids.includes(userId2);
      } catch { return false; }
    });
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(or(eq(transactions.buyerId, userId), eq(transactions.sellerId, userId)))
      .orderBy(desc(transactions.createdAt))
      ;
  }

  async updateTransactionStatus(id: number, data: Partial<Transaction>): Promise<Transaction | undefined> {
    return await db.update(transactions).set(data).where(eq(transactions.id, id)).returning();
  }

  // ===== CONVERSATIONS & MESSAGES =====
  async createConversation(conv: InsertConversation): Promise<Conversation> {
    return await db.insert(conversations).values({
      ...conv,
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async getConversationById(id: number): Promise<Conversation | undefined> {
    return (await db.select().from(conversations).where(eq(conversations.id, id)))[0];
  }

  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    return await db.select().from(conversations)
      .where(or(eq(conversations.participant1Id, userId), eq(conversations.participant2Id, userId)))
      .orderBy(desc(conversations.lastMessageAt))
      ;
  }

  async findConversation(participant1Id: number, participant2Id: number, listingId?: number): Promise<Conversation | undefined> {
    const conditions = [
      or(
        and(eq(conversations.participant1Id, participant1Id), eq(conversations.participant2Id, participant2Id)),
        and(eq(conversations.participant1Id, participant2Id), eq(conversations.participant2Id, participant1Id))
      ),
    ];
    if (listingId) {
      conditions.push(eq(conversations.listingId, listingId));
    }
    return await db.select().from(conversations).where(and(...conditions));
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    return await db.insert(messages).values({
      ...msg,
      isRead: false,
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      ;
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<void> {
    db.update(messages)
      .set({ isRead: true })
      .where(and(
        eq(messages.conversationId, conversationId),
        sql`${messages.senderId} != ${userId}`,
        eq(messages.isRead, false)
      ))
      .execute();
  }

  async updateConversationLastMessage(conversationId: number, timestamp: string): Promise<void> {
    db.update(conversations).set({ lastMessageAt: timestamp }).where(eq(conversations.id, conversationId)).execute();
  }

  // ===== REVIEWS =====
  async createReview(review: InsertReview): Promise<Review> {
    return await db.insert(reviews).values({
      ...review,
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async getReviewsByUserId(userId: number): Promise<Review[]> {
    return await db.select().from(reviews)
      .where(eq(reviews.revieweeId, userId))
      .orderBy(desc(reviews.createdAt))
      ;
  }

  async getReviewsByTransactionId(transactionId: number): Promise<Review[]> {
    return await db.select().from(reviews)
      .where(eq(reviews.transactionId, transactionId))
      ;
  }

  // ===== QUESTIONS =====
  async getQuestionById(id: number): Promise<Question | undefined> {
    return (await db.select().from(questions).where(eq(questions.id, id)))[0];
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    return await db.insert(questions).values({
      ...question,
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async getQuestionsByListingId(listingId: number): Promise<Question[]> {
    return await db.select().from(questions)
      .where(eq(questions.listingId, listingId))
      .orderBy(desc(questions.createdAt))
      ;
  }

  async answerQuestion(id: number, answer: string): Promise<Question | undefined> {
    return await db.update(questions).set({
      answer,
      answeredAt: new Date().toISOString(),
    }).where(eq(questions.id, id)).returning();
  }

  // ===== DISPUTES =====
  async createDispute(dispute: InsertDispute): Promise<Dispute> {
    return await db.insert(disputes).values({
      ...dispute,
      status: "open",
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async getDisputeById(id: number): Promise<Dispute | undefined> {
    return (await db.select().from(disputes).where(eq(disputes.id, id)))[0];
  }

  async getDisputesByUserId(userId: number): Promise<Dispute[]> {
    return await db.select().from(disputes)
      .where(or(eq(disputes.filedById, userId), eq(disputes.againstId, userId)))
      .orderBy(desc(disputes.createdAt))
      ;
  }

  async getAllDisputes(): Promise<Dispute[]> {
    return await db.select().from(disputes).orderBy(desc(disputes.createdAt));
  }

  async updateDisputeStatus(id: number, data: Partial<Dispute>): Promise<Dispute | undefined> {
    return await db.update(disputes).set(data).where(eq(disputes.id, id)).returning();
  }

  async createDisputeMessage(msg: InsertDisputeMessage): Promise<DisputeMessage> {
    return await db.insert(disputeMessages).values({
      ...msg,
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async getDisputeMessages(disputeId: number): Promise<DisputeMessage[]> {
    return await db.select().from(disputeMessages)
      .where(eq(disputeMessages.disputeId, disputeId))
      .orderBy(asc(disputeMessages.createdAt))
      ;
  }

  // ===== NOTIFICATIONS =====
  async createNotification(notification: InsertNotification): Promise<Notification> {
    return await db.insert(notifications).values({
      ...notification,
      isRead: false,
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      ;
  }

  async markNotificationRead(id: number): Promise<void> {
    db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).execute();
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId)).execute();
  }

  async getUnreadCount(userId: number): Promise<number> {
    const result = db.select({ count: count() }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result?.count ?? 0;
  }

  // ===== EARN TASKS =====
  async getActiveTasks(): Promise<EarnTask[]> {
    return await db.select().from(earnTasks).where(eq(earnTasks.isActive, true));
  }

  async getAllTasks(): Promise<EarnTask[]> {
    return await db.select().from(earnTasks);
  }

  async getTaskById(id: number): Promise<EarnTask | undefined> {
    return (await db.select().from(earnTasks).where(eq(earnTasks.id, id)))[0];
  }

  async createEarnTask(task: InsertEarnTask): Promise<EarnTask> {
    return await db.insert(earnTasks).values(task).returning();
  }

  async updateEarnTask(id: number, data: Partial<EarnTask>): Promise<EarnTask | undefined> {
    return await db.update(earnTasks).set(data).where(eq(earnTasks.id, id)).returning();
  }

  async createEarnCompletion(completion: InsertEarnCompletion): Promise<EarnCompletion> {
    return await db.insert(earnCompletions).values({
      ...completion,
      completedAt: new Date().toISOString(),
    }).returning();
  }

  async getCompletionsByUserId(userId: number): Promise<EarnCompletion[]> {
    return await db.select().from(earnCompletions)
      .where(eq(earnCompletions.userId, userId))
      .orderBy(desc(earnCompletions.completedAt))
      ;
  }

  async getCompletionByUserAndTask(userId: number, taskId: number): Promise<EarnCompletion | undefined> {
    return await db.select().from(earnCompletions)
      .where(and(eq(earnCompletions.userId, userId), eq(earnCompletions.taskId, taskId)))
      ;
  }

  // ===== FAVORITES =====
  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    return await db.insert(favorites).values({
      ...favorite,
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async removeFavorite(userId: number, listingId: number): Promise<void> {
    db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId))).execute();
  }

  async getFavoritesByUserId(userId: number): Promise<Favorite[]> {
    return await db.select().from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt))
      ;
  }

  // ===== ANALYTICS =====
  async trackPageView(data: InsertPageView): Promise<void> {
    db.insert(pageViews).values({
      ...data,
      createdAt: new Date().toISOString(),
    }).execute();
  }

  async getAnalytics(days: number): Promise<{
    totalViews: number;
    uniqueSessions: number;
    topPages: Array<{ path: string; views: number }>;
    viewsByDay: Array<{ date: string; views: number }>;
    topReferrers: Array<{ referrer: string; views: number }>;
    newUsersByDay: Array<{ date: string; signups: number }>;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const all = db.select().from(pageViews).where(gte(pageViews.createdAt, since));

    const totalViews = all.length;
    const uniqueSessions = new Set(all.map(v => v.sessionId).filter(Boolean)).size;

    // Top pages
    const pageCounts: Record<string, number> = {};
    for (const v of all) { pageCounts[v.path] = (pageCounts[v.path] || 0) + 1; }
    const topPages = Object.entries(pageCounts)
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Views by day
    const dayCounts: Record<string, number> = {};
    for (const v of all) {
      const day = v.createdAt.slice(0, 10);
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
    const viewsByDay = Object.entries(dayCounts)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top referrers
    const refCounts: Record<string, number> = {};
    for (const v of all) {
      if (v.referrer) {
        const ref = v.referrer.replace(/^https?:\/\//, "").split("/")[0];
        refCounts[ref] = (refCounts[ref] || 0) + 1;
      }
    }
    const topReferrers = Object.entries(refCounts)
      .map(([referrer, views]) => ({ referrer, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // New users by day
    const allUsers = db.select().from(users).where(gte(users.joinedAt, since));
    const signupCounts: Record<string, number> = {};
    for (const u of allUsers) {
      const day = u.joinedAt.slice(0, 10);
      signupCounts[day] = (signupCounts[day] || 0) + 1;
    }
    const newUsersByDay = Object.entries(signupCounts)
      .map(([date, signups]) => ({ date, signups }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { totalViews, uniqueSessions, topPages, viewsByDay, topReferrers, newUsersByDay };
  }

  // ===== LEADERBOARD =====
  async getLeaderboard(limit: number): Promise<Array<{ userId: number; username: string; displayName: string | null; avatarUrl: string | null; membershipTier: string; totalEarned: number; balance: number }>> {
    return db
      .select({
        userId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        membershipTier: users.membershipTier,
        totalEarned: wallets.totalEarned,
        balance: wallets.balance,
      })
      .from(wallets)
      .innerJoin(users, eq(wallets.userId, users.id))
      .where(eq(users.role, "user"))
      .orderBy(desc(wallets.totalEarned))
      .limit(limit)
      ;
  }

  // ===== PADDLE/STRIPE HELPERS =====
  async getUserByPaddleCustomerId(customerId: string): Promise<User | undefined> {
    return await db.select().from(users).where(eq(users.paddleCustomerId, customerId));
  }

  // ===== REFERRAL TRACKING =====
  async trackReferralClick(data: InsertReferralClick): Promise<ReferralClick> {
    return await db.insert(referralClicks).values({
      ...data,
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async markReferralConverted(referralCode: string, convertedUserId: number): Promise<void> {
    // Find the most recent unconverted click for this referral code
    const click = db.select().from(referralClicks)
      .where(and(
        eq(referralClicks.referralCode, referralCode),
        sql`${referralClicks.convertedUserId} IS NULL`
      ))
      .orderBy(desc(referralClicks.createdAt))
      .limit(1)
      ;
    if (click) {
      db.update(referralClicks)
        .set({ convertedUserId })
        .where(eq(referralClicks.id, click.id))
        .execute();
    }
  }

  async getReferralStatsByUserId(userId: number): Promise<{ clicks: number; signups: number; creditsEarned: number }> {
    const clicks = db.select().from(referralClicks)
      .where(eq(referralClicks.referrerId, userId))
      ;
    const signups = clicks.filter(c => c.convertedUserId !== null).length;
    // Each successful referral earns 1 SB — check ledger
    const ledger = db.select().from(ledgerEntries)
      .where(and(
        eq(ledgerEntries.userId, userId),
        eq(ledgerEntries.type, "referral_bonus")
      ))
      ;
    const creditsEarned = ledger.reduce((sum, e) => sum + e.amount, 0);
    return { clicks: clicks.length, signups, creditsEarned };
  }

  async getAllReferralStats(): Promise<Array<{ userId: number; username: string; clicks: number; signups: number; creditsEarned: number }>> {
    const allUsers = db.select().from(users).orderBy(desc(users.id));
    const allClicks = db.select().from(referralClicks);
    const allLedger = db.select().from(ledgerEntries)
      .where(eq(ledgerEntries.type, "referral_bonus"))
      ;

    return allUsers.map(u => {
      const userClicks = allClicks.filter(c => c.referrerId === u.id);
      const signups = userClicks.filter(c => c.convertedUserId !== null).length;
      const creditsEarned = allLedger
        .filter(e => e.userId === u.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        userId: u.id,
        username: u.username,
        clicks: userClicks.length,
        signups,
        creditsEarned,
      };
    }).filter(r => r.clicks > 0 || r.signups > 0); // only show users with any activity
  }

  async isFavorited(userId: number, listingId: number): Promise<boolean> {
    const result = db.select().from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)))
      ;
    return !!result;
  }

  // ===== SOCIAL ACCOUNTS =====
  async createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount> {
    return await db.insert(socialAccounts).values({
      ...account,
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async getSocialAccountsByUserId(userId: number): Promise<SocialAccount[]> {
    return await db.select().from(socialAccounts)
      .where(eq(socialAccounts.userId, userId))
      .orderBy(asc(socialAccounts.platform))
      ;
  }

  async getSocialAccountByPlatform(userId: number, platform: string): Promise<SocialAccount | undefined> {
    return await db.select().from(socialAccounts)
      .where(and(eq(socialAccounts.userId, userId), eq(socialAccounts.platform, platform)))
      ;
  }

  async deleteSocialAccount(id: number): Promise<void> {
    db.delete(socialAccounts).where(eq(socialAccounts.id, id)).execute();
  }

  async updateSocialAccount(id: number, data: Partial<SocialAccount>): Promise<SocialAccount | undefined> {
    return await db.update(socialAccounts).set(data).where(eq(socialAccounts.id, id)).returning();
  }

  // ===== SOCIAL SHARES =====
  async createSocialShare(share: InsertSocialShare): Promise<SocialShare> {
    return await db.insert(socialShares).values({
      ...share,
      createdAt: new Date().toISOString(),
    }).returning();
  }

  async getSocialSharesByUserId(userId: number): Promise<SocialShare[]> {
    return await db.select().from(socialShares)
      .where(eq(socialShares.userId, userId))
      .orderBy(desc(socialShares.createdAt))
      ;
  }

  async getSocialSharesByListingId(listingId: number): Promise<SocialShare[]> {
    return await db.select().from(socialShares)
      .where(eq(socialShares.listingId, listingId))
      ;
  }

  async hasUserSharedOnPlatform(userId: number, listingId: number, platform: string): Promise<boolean> {
    const result = db.select().from(socialShares)
      .where(and(
        eq(socialShares.userId, userId),
        eq(socialShares.listingId, listingId),
        eq(socialShares.platform, platform)
      ))
      ;
    return !!result;
  }

  async updateSocialShareStatus(id: number, data: Partial<SocialShare>): Promise<SocialShare | undefined> {
    return await db.update(socialShares).set(data).where(eq(socialShares.id, id)).returning();
  }
}

export const storage = new DatabaseStorage();
