import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import crypto from "crypto";
import createMemoryStore from "memorystore";
import { seedDatabase } from "./seed";
import multer from "multer";
import path from "path";
import fs from "fs";

// ============================================================
// FILE UPLOAD SETUP
// ============================================================
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp|avif)$/;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"));
    }
  },
});

// ============================================================
// PASSWORD HASHING
// ============================================================
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const newHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === newHash;
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function calculateFee(price: number): number {
  const fee = price * 0.1;
  return Math.min(fee, 20);
}

// ============================================================
// TOKEN-BASED AUTH (works in proxy/iframe environments where cookies are stripped)
// ============================================================
const tokenStore = new Map<string, number>(); // token -> userId

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Middleware: check Bearer token first, fall back to session
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const userId = tokenStore.get(token);
    if (userId) {
      // Attach user to request
      storage.getUserById(userId).then(user => {
        if (user) {
          (req as any).user = user;
          return next();
        }
        res.status(401).json({ message: "Authentication required" });
      }).catch(() => {
        res.status(401).json({ message: "Authentication required" });
      });
      return;
    }
  }
  // Fall back to session
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const user = req.user as any;
    if (user.role !== "admin") {
      res.status(403).json({ message: "Admin access required" });
      return;
    }
    next();
  });
}

// ============================================================
// REGISTER ROUTES
// ============================================================
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Trust proxy in production (deployed behind proxy)
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // ---- Session setup ----
  const MemoryStore = createMemoryStore(session);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "swapedly-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 86400000 }),
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" as const : "lax" as const,
      },
      proxy: process.env.NODE_ENV === "production",
    })
  );

  // ---- Passport setup ----
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) return done(null, false, { message: "Invalid email or password" });
          if (!verifyPassword(password, user.password)) return done(null, false, { message: "Invalid email or password" });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  // ============================================================
  // FILE UPLOAD / STATIC SERVING
  // ============================================================
  // Serve uploaded files statically
  const express = await import("express");
  app.use("/uploads", express.default.static(UPLOAD_DIR));

  // Upload endpoint (up to 5 images)
  app.post("/api/upload", requireAuth, upload.array("images", 5), (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      const urls = files.map((f) => `/uploads/${f.filename}`);
      return res.json({ urls });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // AUTH ENDPOINTS
  // ============================================================
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password, referralCode } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      // Check existing
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash password and generate referral code
      const hashedPassword = hashPassword(password);
      let uniqueReferralCode = generateReferralCode();
      // Ensure unique
      while (await storage.getUserByReferralCode(uniqueReferralCode)) {
        uniqueReferralCode = generateReferralCode();
      }

      // Check referral code if provided
      let referrer: any = null;
      if (referralCode) {
        referrer = await storage.getUserByReferralCode(referralCode);
      }

      // Create user
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        referralCode: uniqueReferralCode,
        referredBy: referrer ? referrer.id : undefined,
        joinedAt: new Date().toISOString(),
      } as any);

      // Create wallet with 10 SB welcome bonus
      await storage.createWallet({
        userId: user.id,
        balance: 10,
        totalEarned: 10,
        totalSpent: 0,
      });

      // Create ledger entry for welcome bonus
      await storage.createLedgerEntry({
        userId: user.id,
        amount: 10,
        type: "welcome_bonus",
        description: "Welcome bonus for joining Swapedly",
      });

      // Create welcome notification
      await storage.createNotification({
        userId: user.id,
        type: "system",
        title: "Welcome to Swapedly!",
        body: "You've earned 10 Swap Bucks as a welcome bonus. Start trading!",
        link: "/dashboard",
      });

      // Handle referral bonus
      if (referrer) {
        // Credit 500 SB to referrer
        await storage.creditWallet(referrer.id, 500);
        await storage.createLedgerEntry({
          userId: referrer.id,
          amount: 500,
          type: "referral_bonus",
          description: `Referral bonus for inviting ${username}`,
        });
        await storage.createNotification({
          userId: referrer.id,
          type: "referral",
          title: "Referral Bonus!",
          body: `${username} joined using your referral code. You earned 500 SB!`,
          link: "/wallet",
        });

        // Credit 500 SB to new user
        await storage.creditWallet(user.id, 500);
        await storage.createLedgerEntry({
          userId: user.id,
          amount: 500,
          type: "referral_bonus",
          description: "Referral bonus for joining with a referral code",
        });
      }

      // Login the user
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        const { password: _, ...safeUser } = user;
        const token = generateToken();
        tokenStore.set(token, user.id);
        return res.status(201).json({ ...safeUser, token });
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      return res.status(500).json({ message: err.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return res.status(500).json({ message: "Login failed" });
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (loginErr) => {
        if (loginErr) return res.status(500).json({ message: "Login failed" });
        const { password: _, ...safeUser } = user;
        // Generate auth token for proxy/iframe environments where cookies don't work
        const token = generateToken();
        tokenStore.set(token, user.id);
        return res.json({ ...safeUser, token });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      return res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    // Check Bearer token first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const userId = tokenStore.get(token);
      if (userId) {
        return storage.getUserById(userId).then(user => {
          if (user) {
            const { password: _, ...safeUser } = user as any;
            return res.json(safeUser);
          }
          return res.status(401).json({ message: "Not authenticated" });
        }).catch(() => res.status(401).json({ message: "Not authenticated" }));
      }
    }
    // Fall back to session
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as any;
    const { password: _, ...safeUser } = user;
    return res.json(safeUser);
  });

  // Change password
  app.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { currentPassword, newPassword } = req.body;
      const fullUser = await storage.getUserByEmail(user.email);
      if (!fullUser) return res.status(404).json({ message: "User not found" });

      if (!verifyPassword(currentPassword, fullUser.password)) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashed = hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashed });
      return res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const wallet = await storage.getWalletByUserId(user.id);
      const userListings = await storage.getListingsBySellerId(user.id);
      const activeListings = userListings.filter(l => l.status === "active").length;
      const txns = await storage.getTransactionsByUserId(user.id);
      const conversations = await storage.getConversationsByUserId(user.id);
      const unreadMessages = 0; // Simplified for now
      const disputes = await storage.getDisputesByUserId(user.id);
      const openDisputes = disputes.filter(d => d.status === "open" || d.status === "under_review").length;

      return res.json({
        balance: wallet?.balance ?? 0,
        activeListings,
        unreadMessages,
        openDisputes,
        recentTransactions: txns.slice(0, 5),
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // LISTING ENDPOINTS
  // ============================================================
  app.get("/api/listings", async (req: Request, res: Response) => {
    try {
      const { category, condition, minPrice, maxPrice, search, sort, page, limit } = req.query;
      const result = await storage.getListings({
        category: category as string,
        condition: condition as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        search: search as string,
        sort: sort as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/listings/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const result = await storage.getListingsBySellerId(userId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/listings/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const listing = await storage.getListingById(id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      // Increment views
      await storage.updateListing(id, { views: listing.views + 1 });
      return res.json({ ...listing, views: listing.views + 1 });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/listings", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const listing = await storage.createListing({
        ...req.body,
        sellerId: user.id,
      });

      // Credit 5 SB listing bonus
      await storage.creditWallet(user.id, 5);
      await storage.createLedgerEntry({
        userId: user.id,
        amount: 5,
        type: "listing_credit",
        description: `Listing credit for creating "${listing.title}"`,
        relatedListingId: listing.id,
      });

      return res.status(201).json(listing);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/listings/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const listing = await storage.getListingById(id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.sellerId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const updated = await storage.updateListing(id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/listings/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const listing = await storage.getListingById(id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.sellerId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const updated = await storage.updateListing(id, { status: "removed" });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // TRANSACTION ENDPOINTS
  // ============================================================
  app.post("/api/transactions/buy", requireAuth, async (req: Request, res: Response) => {
    try {
      const buyer = req.user as any;
      const { listingId, deliveryMethod } = req.body;

      const listing = await storage.getListingById(listingId);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.status !== "active") return res.status(400).json({ message: "Listing is not available" });
      if (listing.sellerId === buyer.id) return res.status(400).json({ message: "Cannot buy your own listing" });

      // Check buyer wallet
      const buyerWallet = await storage.getWalletByUserId(buyer.id);
      if (!buyerWallet || buyerWallet.balance < listing.price) {
        return res.status(400).json({ message: "Insufficient Swap Bucks" });
      }

      // Calculate fees
      const buyerFee = calculateFee(listing.price);
      const sellerFee = calculateFee(listing.price);

      // Debit buyer wallet (escrow)
      await storage.debitWallet(buyer.id, listing.price);
      await storage.createLedgerEntry({
        userId: buyer.id,
        amount: -listing.price,
        type: "purchase",
        description: `Purchased "${listing.title}"`,
        relatedListingId: listing.id,
      });

      // Create transaction
      const txn = await storage.createTransaction({
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        amount: listing.price,
        buyerFeeUsd: buyerFee,
        sellerFeeUsd: sellerFee,
        deliveryMethod: deliveryMethod || "shipping",
      });

      // Mark listing as sold
      await storage.updateListing(listing.id, { status: "sold" });

      // Update ledger entry with transaction id
      // Notify seller
      await storage.createNotification({
        userId: listing.sellerId,
        type: "sale",
        title: "You made a sale!",
        body: `${buyer.username} purchased "${listing.title}" for ${listing.price} SB`,
        link: `/transactions/${txn.id}`,
      });

      // Notify buyer
      await storage.createNotification({
        userId: buyer.id,
        type: "purchase",
        title: "Purchase Confirmed",
        body: `You purchased "${listing.title}" for ${listing.price} SB`,
        link: `/transactions/${txn.id}`,
      });

      return res.status(201).json(txn);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/transactions/:id/ship", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const txn = await storage.getTransactionById(id);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      if (txn.sellerId !== user.id) return res.status(403).json({ message: "Not authorized" });
      if (txn.status !== "paid") return res.status(400).json({ message: "Transaction is not in paid status" });

      const updated = await storage.updateTransactionStatus(id, {
        status: "shipped",
        trackingNumber: req.body.trackingNumber || null,
      });

      // Notify buyer
      await storage.createNotification({
        userId: txn.buyerId,
        type: "shipping_update",
        title: "Item Shipped!",
        body: `Your item has been shipped${req.body.trackingNumber ? ` (Tracking: ${req.body.trackingNumber})` : ""}`,
        link: `/transactions/${txn.id}`,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/transactions/:id/meetup", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const txn = await storage.getTransactionById(id);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      if (txn.sellerId !== user.id && txn.buyerId !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const updated = await storage.updateTransactionStatus(id, {
        meetupLocation: req.body.meetupLocation,
        meetupDate: req.body.meetupDate,
      });

      // Notify the other party
      const otherUserId = txn.sellerId === user.id ? txn.buyerId : txn.sellerId;
      await storage.createNotification({
        userId: otherUserId,
        type: "shipping_update",
        title: "Meetup Details Set",
        body: `Meetup arranged at ${req.body.meetupLocation} on ${req.body.meetupDate}`,
        link: `/transactions/${txn.id}`,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/transactions/:id/confirm", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const txn = await storage.getTransactionById(id);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      if (txn.buyerId !== user.id) return res.status(403).json({ message: "Only buyer can confirm receipt" });
      if (txn.status === "completed") return res.status(400).json({ message: "Transaction already completed" });

      // Release SB to seller
      await storage.creditWallet(txn.sellerId, txn.amount);
      await storage.createLedgerEntry({
        userId: txn.sellerId,
        amount: txn.amount,
        type: "sale",
        description: `Payment received for sale`,
        relatedTransactionId: txn.id,
      });

      const updated = await storage.updateTransactionStatus(id, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });

      // Notify seller
      await storage.createNotification({
        userId: txn.sellerId,
        type: "sale",
        title: "Payment Released!",
        body: `${txn.amount} SB has been released to your wallet`,
        link: `/wallet`,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/transactions", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const txns = await storage.getTransactionsByUserId(user.id);
      return res.json(txns);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/transactions/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const txn = await storage.getTransactionById(id);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      if (txn.buyerId !== user.id && txn.sellerId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      return res.json(txn);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // WALLET ENDPOINTS
  // ============================================================
  app.get("/api/wallet", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const wallet = await storage.getWalletByUserId(user.id);
      if (!wallet) return res.status(404).json({ message: "Wallet not found" });
      return res.json(wallet);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/wallet/ledger", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await storage.getLedgerByUserId(user.id, page, limit);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/wallet/purchase-sb", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      await storage.creditWallet(user.id, amount);
      await storage.createLedgerEntry({
        userId: user.id,
        amount,
        type: "purchase_sb",
        description: `Purchased ${amount} Swap Bucks`,
      });

      const wallet = await storage.getWalletByUserId(user.id);
      return res.json(wallet);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // MESSAGE ENDPOINTS
  // ============================================================
  app.get("/api/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const convos = await storage.getConversationsByUserId(user.id);

      // Enrich conversations with participant info and last message
      const enriched = await Promise.all(convos.map(async (conv) => {
        const otherUserId = conv.participant1Id === user.id ? conv.participant2Id : conv.participant1Id;
        const otherUser = await storage.getUserById(otherUserId);
        const msgs = await storage.getMessagesByConversation(conv.id);
        const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const listing = conv.listingId ? await storage.getListingById(conv.listingId) : null;
        return {
          ...conv,
          otherUser: otherUser ? { id: otherUser.id, username: otherUser.username, avatarUrl: otherUser.avatarUrl, displayName: otherUser.displayName } : null,
          lastMessage,
          listing: listing ? { id: listing.id, title: listing.title, images: listing.images } : null,
        };
      }));

      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { participantId, listingId } = req.body;

      if (!participantId) return res.status(400).json({ message: "participantId is required" });
      if (participantId === user.id) return res.status(400).json({ message: "Cannot message yourself" });

      // Check if conversation exists
      let conv = await storage.findConversation(user.id, participantId, listingId);
      if (conv) return res.json(conv);

      conv = await storage.createConversation({
        participant1Id: user.id,
        participant2Id: participantId,
        listingId: listingId || null,
        lastMessageAt: new Date().toISOString(),
      });

      return res.status(201).json(conv);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const convId = parseInt(req.params.id);
      const conv = await storage.getConversationById(convId);
      if (!conv) return res.status(404).json({ message: "Conversation not found" });
      if (conv.participant1Id !== user.id && conv.participant2Id !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const msgs = await storage.getMessagesByConversation(convId);
      return res.json(msgs);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const convId = parseInt(req.params.id);
      const conv = await storage.getConversationById(convId);
      if (!conv) return res.status(404).json({ message: "Conversation not found" });
      if (conv.participant1Id !== user.id && conv.participant2Id !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const msg = await storage.createMessage({
        conversationId: convId,
        senderId: user.id,
        content: req.body.content,
      });

      // Update conversation last message time
      await storage.updateConversationLastMessage(convId, msg.createdAt);

      // Notify recipient
      const recipientId = conv.participant1Id === user.id ? conv.participant2Id : conv.participant1Id;
      await storage.createNotification({
        userId: recipientId,
        type: "message",
        title: "New Message",
        body: `${user.username}: ${req.body.content.substring(0, 100)}`,
        link: `/messages/${convId}`,
      });

      return res.status(201).json(msg);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/conversations/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const convId = parseInt(req.params.id);
      await storage.markMessagesAsRead(convId, user.id);
      return res.json({ message: "Messages marked as read" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // REVIEW ENDPOINTS
  // ============================================================
  app.post("/api/reviews", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { transactionId, rating, comment } = req.body;

      const txn = await storage.getTransactionById(transactionId);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      if (txn.status !== "completed") return res.status(400).json({ message: "Transaction must be completed to review" });
      if (txn.buyerId !== user.id && txn.sellerId !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Check if already reviewed
      const existingReviews = await storage.getReviewsByTransactionId(transactionId);
      const alreadyReviewed = existingReviews.find(r => r.reviewerId === user.id);
      if (alreadyReviewed) {
        return res.status(400).json({ message: "You already reviewed this transaction" });
      }

      const revieweeId = txn.buyerId === user.id ? txn.sellerId : txn.buyerId;

      const review = await storage.createReview({
        transactionId,
        reviewerId: user.id,
        revieweeId,
        rating,
        comment,
      });

      // Notify the reviewee
      await storage.createNotification({
        userId: revieweeId,
        type: "review",
        title: "New Review",
        body: `${user.username} left you a ${rating}-star review`,
        link: `/profile/${revieweeId}`,
      });

      return res.status(201).json(review);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reviews/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const userReviews = await storage.getReviewsByUserId(userId);

      // Enrich with reviewer info
      const enriched = await Promise.all(userReviews.map(async (review) => {
        const reviewer = await storage.getUserById(review.reviewerId);
        return {
          ...review,
          reviewer: reviewer ? { id: reviewer.id, username: reviewer.username, avatarUrl: reviewer.avatarUrl } : null,
        };
      }));

      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // QUESTION ENDPOINTS
  // ============================================================
  app.get("/api/questions/listing/:listingId", async (req: Request, res: Response) => {
    try {
      const listingId = parseInt(req.params.listingId);
      const qs = await storage.getQuestionsByListingId(listingId);

      // Enrich with asker info
      const enriched = await Promise.all(qs.map(async (q) => {
        const asker = await storage.getUserById(q.askerId);
        return {
          ...q,
          asker: asker ? { id: asker.id, username: asker.username, avatarUrl: asker.avatarUrl } : null,
        };
      }));

      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/questions", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { listingId, question } = req.body;

      const listing = await storage.getListingById(listingId);
      if (!listing) return res.status(404).json({ message: "Listing not found" });

      const q = await storage.createQuestion({
        listingId,
        askerId: user.id,
        question,
      });

      // Notify listing owner
      await storage.createNotification({
        userId: listing.sellerId,
        type: "system",
        title: "New Question",
        body: `${user.username} asked a question on "${listing.title}"`,
        link: `/listings/${listing.id}`,
      });

      return res.status(201).json(q);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/questions/:id/answer", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const { answer } = req.body;

      const question = await storage.getQuestionById(id);
      if (!question) return res.status(404).json({ message: "Question not found" });

      const listing = await storage.getListingById(question.listingId);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.sellerId !== user.id) return res.status(403).json({ message: "Only listing owner can answer" });

      const updated = await storage.answerQuestion(id, answer);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // DISPUTE ENDPOINTS
  // ============================================================
  app.post("/api/disputes", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { transactionId, reason, description, evidence } = req.body;

      const txn = await storage.getTransactionById(transactionId);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      if (txn.buyerId !== user.id && txn.sellerId !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const againstId = txn.buyerId === user.id ? txn.sellerId : txn.buyerId;

      const dispute = await storage.createDispute({
        transactionId,
        filedById: user.id,
        againstId,
        reason,
        description,
        evidence: evidence ? JSON.stringify(evidence) : null,
      });

      // Update transaction status
      await storage.updateTransactionStatus(transactionId, { status: "disputed" });

      // Notify the other party
      await storage.createNotification({
        userId: againstId,
        type: "dispute_update",
        title: "Dispute Filed",
        body: `A dispute has been filed regarding your transaction`,
        link: `/disputes/${dispute.id}`,
      });

      return res.status(201).json(dispute);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/disputes", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const userDisputes = await storage.getDisputesByUserId(user.id);
      return res.json(userDisputes);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/disputes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const dispute = await storage.getDisputeById(id);
      if (!dispute) return res.status(404).json({ message: "Dispute not found" });
      if (dispute.filedById !== user.id && dispute.againstId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const msgs = await storage.getDisputeMessages(id);
      return res.json({ ...dispute, messages: msgs });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/disputes/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const disputeId = parseInt(req.params.id);
      const dispute = await storage.getDisputeById(disputeId);
      if (!dispute) return res.status(404).json({ message: "Dispute not found" });
      if (dispute.filedById !== user.id && dispute.againstId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      const msg = await storage.createDisputeMessage({
        disputeId,
        senderId: user.id,
        content: req.body.content,
        attachments: req.body.attachments ? JSON.stringify(req.body.attachments) : null,
        isAdmin: user.role === "admin",
      });

      return res.status(201).json(msg);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/disputes/:id/status", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, adminNotes } = req.body;
      const updated = await storage.updateDisputeStatus(id, {
        status,
        adminNotes,
        resolvedAt: (status === "resolved_buyer" || status === "resolved_seller" || status === "closed")
          ? new Date().toISOString()
          : undefined,
      });
      if (!updated) return res.status(404).json({ message: "Dispute not found" });

      // Notify both parties
      const dispute = await storage.getDisputeById(id);
      if (dispute) {
        for (const userId of [dispute.filedById, dispute.againstId]) {
          await storage.createNotification({
            userId,
            type: "dispute_update",
            title: "Dispute Updated",
            body: `Dispute status changed to ${status}`,
            link: `/disputes/${id}`,
          });
        }
      }

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // NOTIFICATION ENDPOINTS
  // ============================================================
  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const notifs = await storage.getNotificationsByUserId(user.id);
      return res.json(notifs);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationRead(id);
      return res.json({ message: "Notification marked as read" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/notifications/read-all", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      await storage.markAllNotificationsRead(user.id);
      return res.json({ message: "All notifications marked as read" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const unreadCount = await storage.getUnreadCount(user.id);
      return res.json({ count: unreadCount });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // EARN ENDPOINTS
  // ============================================================
  app.get("/api/earn/tasks", async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getActiveTasks();
      return res.json(tasks);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/earn/complete/:taskId", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const taskId = parseInt(req.params.taskId);

      const task = await storage.getTaskById(taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });
      if (!task.isActive) return res.status(400).json({ message: "Task is no longer active" });

      // Check if already completed
      const existing = await storage.getCompletionByUserAndTask(user.id, taskId);
      if (existing) return res.status(400).json({ message: "Task already completed" });

      // Create completion
      await storage.createEarnCompletion({ userId: user.id, taskId });

      // Credit wallet
      await storage.creditWallet(user.id, task.reward);
      await storage.createLedgerEntry({
        userId: user.id,
        amount: task.reward,
        type: "earn_task",
        description: `Earned ${task.reward} SB for completing "${task.title}"`,
      });

      // Notify
      await storage.createNotification({
        userId: user.id,
        type: "earn_reward",
        title: "Reward Earned!",
        body: `You earned ${task.reward} SB for completing "${task.title}"`,
        link: "/earn",
      });

      const wallet = await storage.getWalletByUserId(user.id);
      return res.json({ completion: existing, wallet });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // FAVORITES
  // ============================================================
  app.post("/api/favorites/:listingId", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const listingId = parseInt(req.params.listingId);

      const existing = await storage.isFavorited(user.id, listingId);
      if (existing) {
        await storage.removeFavorite(user.id, listingId);
        return res.json({ favorited: false });
      } else {
        await storage.addFavorite({ userId: user.id, listingId });
        return res.json({ favorited: true });
      }
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/favorites", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const favs = await storage.getFavoritesByUserId(user.id);

      // Enrich with listing data
      const enriched = await Promise.all(favs.map(async (fav) => {
        const listing = await storage.getListingById(fav.listingId);
        return { ...fav, listing };
      }));

      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // USER PROFILE ENDPOINTS
  // ============================================================
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUserById(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = user;
      return res.json(safeUser);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/users/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { displayName, bio, location, avatarUrl, notificationPrefs } = req.body;
      const updated = await storage.updateUser(user.id, {
        displayName,
        bio,
        location,
        avatarUrl,
        notificationPrefs: notificationPrefs ? JSON.stringify(notificationPrefs) : undefined,
      });
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = updated;
      return res.json(safeUser);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/users/:id/stats", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUserById(id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const txns = await storage.getTransactionsByUserId(id);
      const completedTrades = txns.filter(t => t.status === "completed").length;
      const userReviews = await storage.getReviewsByUserId(id);
      const avgRating = userReviews.length > 0
        ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
        : 0;
      const userListings = await storage.getListingsBySellerId(id);
      const activeListings = userListings.filter(l => l.status === "active").length;

      return res.json({
        totalTrades: completedTrades,
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: userReviews.length,
        activeListings,
        memberSince: user.joinedAt,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // ADMIN ENDPOINTS
  // ============================================================
  app.get("/api/admin/stats", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { users: allUsers, total: totalUsers } = await storage.getAllUsers(1, 999999);
      const { listings: allListings, total: totalListings } = await storage.getListings({ status: "active", page: 1, limit: 999999 });

      // Count all transactions
      let totalTransactions = 0;
      let totalSBInCirculation = 0;
      for (const u of allUsers) {
        const wallet = await storage.getWalletByUserId(u.id);
        if (wallet) totalSBInCirculation += wallet.balance;
        const txns = await storage.getTransactionsByUserId(u.id);
        // Avoid double-counting: only count where user is buyer
        totalTransactions += txns.filter(t => t.buyerId === u.id).length;
      }

      return res.json({
        totalUsers,
        totalListings,
        totalTransactions,
        sbInCirculation: totalSBInCirculation,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await storage.getAllUsers(page, limit);
      // Remove passwords
      const safeUsers = result.users.map(u => {
        const { password: _, ...safe } = u;
        return safe;
      });
      return res.json({ users: safeUsers, total: result.total });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { role, isVerified } = req.body;
      const updated = await storage.updateUser(id, { role, isVerified });
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = updated;
      return res.json(safeUser);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/listings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string || undefined;
      // Get all listings regardless of status for admin
      const result = await storage.getListings({
        page,
        limit,
        status: status || "active",
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/listings/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateListing(id, req.body);
      if (!updated) return res.status(404).json({ message: "Listing not found" });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/disputes", requireAdmin, async (req: Request, res: Response) => {
    try {
      const allDisputes = await storage.getAllDisputes();
      return res.json(allDisputes);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/disputes/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, adminNotes } = req.body;
      const updated = await storage.updateDisputeStatus(id, {
        status,
        adminNotes,
        resolvedAt: (status === "resolved_buyer" || status === "resolved_seller" || status === "closed")
          ? new Date().toISOString()
          : undefined,
      });
      if (!updated) return res.status(404).json({ message: "Dispute not found" });

      // Notify both parties
      const dispute = await storage.getDisputeById(id);
      if (dispute) {
        for (const userId of [dispute.filedById, dispute.againstId]) {
          await storage.createNotification({
            userId,
            type: "dispute_update",
            title: "Dispute Resolved",
            body: `Your dispute has been resolved: ${status}`,
            link: `/disputes/${id}`,
          });
        }
      }

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/earn-tasks", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getAllTasks();
      return res.json(tasks);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/earn-tasks", requireAdmin, async (req: Request, res: Response) => {
    try {
      const task = await storage.createEarnTask(req.body);
      return res.status(201).json(task);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/earn-tasks/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateEarnTask(id, req.body);
      if (!updated) return res.status(404).json({ message: "Task not found" });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ===== SEED DATABASE =====
  seedDatabase();

  return httpServer;
}
