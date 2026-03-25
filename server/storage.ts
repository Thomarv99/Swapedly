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
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, or, like, desc, asc, sql, gte, lte, count } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

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
}

export class DatabaseStorage implements IStorage {
  // ===== USERS =====
  async createUser(insertUser: InsertUser): Promise<User> {
    return db.insert(users).values(insertUser).returning().get();
  }

  async getUserById(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.email, email)).get();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.referralCode, code)).get();
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    return db.update(users).set(data).where(eq(users.id, id)).returning().get();
  }

  async getAllUsers(page: number, limit: number): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    const result = db.select().from(users).limit(limit).offset(offset).all();
    const totalResult = db.select({ count: count() }).from(users).get();
    return { users: result, total: totalResult?.count ?? 0 };
  }

  // ===== WALLETS =====
  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    return db.insert(wallets).values(wallet).returning().get();
  }

  async getWalletByUserId(userId: number): Promise<Wallet | undefined> {
    return db.select().from(wallets).where(eq(wallets.userId, userId)).get();
  }

  async updateWalletBalance(userId: number, balance: number, totalEarned: number, totalSpent: number): Promise<Wallet | undefined> {
    return db.update(wallets).set({ balance, totalEarned, totalSpent }).where(eq(wallets.userId, userId)).returning().get();
  }

  async creditWallet(userId: number, amount: number): Promise<Wallet | undefined> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) return undefined;
    return db.update(wallets).set({
      balance: wallet.balance + amount,
      totalEarned: wallet.totalEarned + amount,
    }).where(eq(wallets.userId, userId)).returning().get();
  }

  async debitWallet(userId: number, amount: number): Promise<Wallet | undefined> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) return undefined;
    if (wallet.balance < amount) return undefined;
    return db.update(wallets).set({
      balance: wallet.balance - amount,
      totalSpent: wallet.totalSpent + amount,
    }).where(eq(wallets.userId, userId)).returning().get();
  }

  // ===== WALLET LEDGER =====
  async createLedgerEntry(entry: InsertWalletLedger): Promise<WalletLedger> {
    return db.insert(walletLedger).values({
      ...entry,
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  async getLedgerByUserId(userId: number, page: number, limit: number): Promise<{ entries: WalletLedger[]; total: number }> {
    const offset = (page - 1) * limit;
    const entries = db.select().from(walletLedger)
      .where(eq(walletLedger.userId, userId))
      .orderBy(desc(walletLedger.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
    const totalResult = db.select({ count: count() }).from(walletLedger)
      .where(eq(walletLedger.userId, userId)).get();
    return { entries, total: totalResult?.count ?? 0 };
  }

  // ===== LISTINGS =====
  async createListing(listing: InsertListing): Promise<Listing> {
    const now = new Date().toISOString();
    return db.insert(listings).values({
      ...listing,
      status: "active",
      views: 0,
      createdAt: now,
      updatedAt: now,
    }).returning().get();
  }

  async getListingById(id: number): Promise<Listing | undefined> {
    return db.select().from(listings).where(eq(listings.id, id)).get();
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
          like(listings.title, `%${filters.search}%`),
          like(listings.description, `%${filters.search}%`)
        )
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
      .all();

    const totalResult = db.select({ count: count() }).from(listings)
      .where(whereClause).get();

    return { listings: result, total: totalResult?.count ?? 0 };
  }

  async updateListing(id: number, data: Partial<Listing>): Promise<Listing | undefined> {
    return db.update(listings).set({
      ...data,
      updatedAt: new Date().toISOString(),
    }).where(eq(listings.id, id)).returning().get();
  }

  async getListingsBySellerId(sellerId: number): Promise<Listing[]> {
    return db.select().from(listings).where(eq(listings.sellerId, sellerId)).orderBy(desc(listings.createdAt)).all();
  }

  // ===== TRANSACTIONS =====
  async createTransaction(txn: InsertTransaction): Promise<Transaction> {
    return db.insert(transactions).values({
      ...txn,
      status: "paid",
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  async getTransactionById(id: number): Promise<Transaction | undefined> {
    return db.select().from(transactions).where(eq(transactions.id, id)).get();
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(or(eq(transactions.buyerId, userId), eq(transactions.sellerId, userId)))
      .orderBy(desc(transactions.createdAt))
      .all();
  }

  async updateTransactionStatus(id: number, data: Partial<Transaction>): Promise<Transaction | undefined> {
    return db.update(transactions).set(data).where(eq(transactions.id, id)).returning().get();
  }

  // ===== CONVERSATIONS & MESSAGES =====
  async createConversation(conv: InsertConversation): Promise<Conversation> {
    return db.insert(conversations).values({
      ...conv,
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  async getConversationById(id: number): Promise<Conversation | undefined> {
    return db.select().from(conversations).where(eq(conversations.id, id)).get();
  }

  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    return db.select().from(conversations)
      .where(or(eq(conversations.participant1Id, userId), eq(conversations.participant2Id, userId)))
      .orderBy(desc(conversations.lastMessageAt))
      .all();
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
    return db.select().from(conversations).where(and(...conditions)).get();
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    return db.insert(messages).values({
      ...msg,
      isRead: false,
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .all();
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<void> {
    db.update(messages)
      .set({ isRead: true })
      .where(and(
        eq(messages.conversationId, conversationId),
        sql`${messages.senderId} != ${userId}`,
        eq(messages.isRead, false)
      ))
      .run();
  }

  async updateConversationLastMessage(conversationId: number, timestamp: string): Promise<void> {
    db.update(conversations).set({ lastMessageAt: timestamp }).where(eq(conversations.id, conversationId)).run();
  }

  // ===== REVIEWS =====
  async createReview(review: InsertReview): Promise<Review> {
    return db.insert(reviews).values({
      ...review,
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  async getReviewsByUserId(userId: number): Promise<Review[]> {
    return db.select().from(reviews)
      .where(eq(reviews.revieweeId, userId))
      .orderBy(desc(reviews.createdAt))
      .all();
  }

  async getReviewsByTransactionId(transactionId: number): Promise<Review[]> {
    return db.select().from(reviews)
      .where(eq(reviews.transactionId, transactionId))
      .all();
  }

  // ===== QUESTIONS =====
  async getQuestionById(id: number): Promise<Question | undefined> {
    return db.select().from(questions).where(eq(questions.id, id)).get();
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    return db.insert(questions).values({
      ...question,
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  async getQuestionsByListingId(listingId: number): Promise<Question[]> {
    return db.select().from(questions)
      .where(eq(questions.listingId, listingId))
      .orderBy(desc(questions.createdAt))
      .all();
  }

  async answerQuestion(id: number, answer: string): Promise<Question | undefined> {
    return db.update(questions).set({
      answer,
      answeredAt: new Date().toISOString(),
    }).where(eq(questions.id, id)).returning().get();
  }

  // ===== DISPUTES =====
  async createDispute(dispute: InsertDispute): Promise<Dispute> {
    return db.insert(disputes).values({
      ...dispute,
      status: "open",
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  async getDisputeById(id: number): Promise<Dispute | undefined> {
    return db.select().from(disputes).where(eq(disputes.id, id)).get();
  }

  async getDisputesByUserId(userId: number): Promise<Dispute[]> {
    return db.select().from(disputes)
      .where(or(eq(disputes.filedById, userId), eq(disputes.againstId, userId)))
      .orderBy(desc(disputes.createdAt))
      .all();
  }

  async getAllDisputes(): Promise<Dispute[]> {
    return db.select().from(disputes).orderBy(desc(disputes.createdAt)).all();
  }

  async updateDisputeStatus(id: number, data: Partial<Dispute>): Promise<Dispute | undefined> {
    return db.update(disputes).set(data).where(eq(disputes.id, id)).returning().get();
  }

  async createDisputeMessage(msg: InsertDisputeMessage): Promise<DisputeMessage> {
    return db.insert(disputeMessages).values({
      ...msg,
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  async getDisputeMessages(disputeId: number): Promise<DisputeMessage[]> {
    return db.select().from(disputeMessages)
      .where(eq(disputeMessages.disputeId, disputeId))
      .orderBy(asc(disputeMessages.createdAt))
      .all();
  }

  // ===== NOTIFICATIONS =====
  async createNotification(notification: InsertNotification): Promise<Notification> {
    return db.insert(notifications).values({
      ...notification,
      isRead: false,
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .all();
  }

  async markNotificationRead(id: number): Promise<void> {
    db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).run();
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId)).run();
  }

  async getUnreadCount(userId: number): Promise<number> {
    const result = db.select({ count: count() }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))).get();
    return result?.count ?? 0;
  }

  // ===== EARN TASKS =====
  async getActiveTasks(): Promise<EarnTask[]> {
    return db.select().from(earnTasks).where(eq(earnTasks.isActive, true)).all();
  }

  async getAllTasks(): Promise<EarnTask[]> {
    return db.select().from(earnTasks).all();
  }

  async getTaskById(id: number): Promise<EarnTask | undefined> {
    return db.select().from(earnTasks).where(eq(earnTasks.id, id)).get();
  }

  async createEarnTask(task: InsertEarnTask): Promise<EarnTask> {
    return db.insert(earnTasks).values(task).returning().get();
  }

  async updateEarnTask(id: number, data: Partial<EarnTask>): Promise<EarnTask | undefined> {
    return db.update(earnTasks).set(data).where(eq(earnTasks.id, id)).returning().get();
  }

  async createEarnCompletion(completion: InsertEarnCompletion): Promise<EarnCompletion> {
    return db.insert(earnCompletions).values({
      ...completion,
      completedAt: new Date().toISOString(),
    }).returning().get();
  }

  async getCompletionsByUserId(userId: number): Promise<EarnCompletion[]> {
    return db.select().from(earnCompletions)
      .where(eq(earnCompletions.userId, userId))
      .orderBy(desc(earnCompletions.completedAt))
      .all();
  }

  async getCompletionByUserAndTask(userId: number, taskId: number): Promise<EarnCompletion | undefined> {
    return db.select().from(earnCompletions)
      .where(and(eq(earnCompletions.userId, userId), eq(earnCompletions.taskId, taskId)))
      .get();
  }

  // ===== FAVORITES =====
  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    return db.insert(favorites).values({
      ...favorite,
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  async removeFavorite(userId: number, listingId: number): Promise<void> {
    db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId))).run();
  }

  async getFavoritesByUserId(userId: number): Promise<Favorite[]> {
    return db.select().from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt))
      .all();
  }

  async isFavorited(userId: number, listingId: number): Promise<boolean> {
    const result = db.select().from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)))
      .get();
    return !!result;
  }
}

export const storage = new DatabaseStorage();
