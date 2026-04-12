import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, storage_raw, db } from "./storage";
import { authTokens } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { sendWelcomeEmail, sendPurchaseRequestEmail, sendPurchaseAcceptedEmail, sendExchangeCompleteEmail } from "./email";
import crypto from "crypto";
import createMemoryStore from "memorystore";
import { seedDatabase } from "./seed";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import { STRIPE_CONFIG, createCheckoutSession, handleStripeWebhook, getStripe } from "./stripe";

// ============================================================
// FILE UPLOAD SETUP
// ============================================================
// Use persistent disk on Render (/data/uploads) or local uploads/ otherwise
const DATA_BASE = process.env.RENDER ? "/data" : process.cwd();
const UPLOAD_DIR = path.join(DATA_BASE, "uploads");
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
// MEMBERSHIP CONSTANTS
// ============================================================
const MEMBERSHIP = {
  PLUS_PRICE_USD: 9.99,
  PURCHASE_CREDIT_PRICE_USD: 0.49,
  MIN_CREDIT_PURCHASE: 10, // minimum 10 credits ($4.90, ~$5)
  PLUS_HIGHLIGHTS_PER_MONTH: 5,
  SB_MULTIPLIER_FREE: 1.0,
  SB_MULTIPLIER_PLUS: 1.5,
};

function getSbMultiplier(user: any): number {
  if (user.membershipTier === "plus" && user.membershipExpiresAt) {
    if (new Date(user.membershipExpiresAt) > new Date()) {
      return MEMBERSHIP.SB_MULTIPLIER_PLUS;
    }
  }
  return MEMBERSHIP.SB_MULTIPLIER_FREE;
}

function isPlus(user: any): boolean {
  return user.membershipTier === "plus" &&
    user.membershipExpiresAt &&
    new Date(user.membershipExpiresAt) > new Date();
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

  // ---- CORS setup (required for proxy/iframe deployments) ----
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

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

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const callbackURL = (process.env.APP_URL || "https://swapedly.onrender.com") + "/auth/google/callback";
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL,
    }, async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName || profile.name?.givenName || "User";
        const avatar = profile.photos?.[0]?.value;
        if (!email) return done(new Error("No email from Google"), false);

        // Find or create user
        let user = await storage.getUserByEmail(email);
        if (!user) {
          const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") + Math.floor(Math.random() * 999);
          user = await storage.createUser({
            username,
            email,
            password: crypto.randomBytes(32).toString("hex"), // random password — OAuth users log in via Google
            displayName: name,
            avatarUrl: avatar || null,
            oauthProvider: "google",
            oauthId: profile.id,
          });
          await storage.createWallet({ userId: user.id });
          await sendWelcomeEmail(email, name);
        } else if (!user.oauthProvider) {
          // Existing email account — link Google
          await storage.updateUser(user.id, { oauthProvider: "google", oauthId: profile.id });
        }
        return done(null, user);
      } catch (e: any) {
        return done(e, false);
      }
    }));
  }

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
  // GIFT CARD ENDPOINTS
  // ============================================================

  const UNIVERSAL_GIFT_CARD_CODE = process.env.GIFT_CARD_CODE || "SWAPEDLY-40";
  const GIFT_CARD_SB = 40;

  // Validate a gift card code (public — no auth needed)
  app.post("/api/gift-card/validate", async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Code required" });
      const valid = code.trim().toUpperCase() === UNIVERSAL_GIFT_CARD_CODE.toUpperCase();
      return res.json({ valid, sbAmount: valid ? GIFT_CARD_SB : 0 });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Redeem a gift card — registers new user + credits SB
  app.post("/api/gift-card/redeem", async (req: Request, res: Response) => {
    try {
      const { code, username, email, password, displayName, phone, city, location, avatarUrl, referralCode } = req.body;

      if (!code || code.trim().toUpperCase() !== UNIVERSAL_GIFT_CARD_CODE.toUpperCase()) {
        return res.status(400).json({ message: "Invalid gift card code" });
      }

      // Check email not already taken
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        // If already has account, just credit the SB if not already redeemed
        const token = crypto.randomBytes(32).toString("hex");
        tokenStore.set(token, existing.id);
          return res.status(409).json({ message: "Email already registered. Please log in instead.", token: null });
      }

      // Find referrer
      let referrerId: number | null = null;
      if (referralCode) {
        const referrer = await storage.getUserByReferralCode(referralCode);
        if (referrer) {
          referrerId = referrer.id;
          // Credit referrer 5 SB for gift card redemption
          await storage.creditWallet(referrer.id, 5);
          await storage.createLedgerEntry({
            userId: referrer.id,
            amount: 5,
            type: "referral_bonus",
            description: "Friend redeemed a gift card using your link — 5 SB earned",
            relatedListingId: null,
            relatedTransactionId: null,
          });
        }
      }

      // Create user
      const hashedPw = await hashPassword(password);
      const newReferralCode = "SWAP-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPw,
        displayName,
        city: city || null,
        location: location || null,
        avatarUrl: avatarUrl || null,
      });
      // Update referral code separately after creation
      await storage.updateUser(newUser.id, { referralCode: newReferralCode });

      // Create wallet + credit 40 SB
      await storage.createWallet({ userId: newUser.id });
      await storage.creditWallet(newUser.id, GIFT_CARD_SB);
      await storage.createLedgerEntry({
        userId: newUser.id,
        amount: GIFT_CARD_SB,
        type: "gift_card",
        description: `Gift card redeemed — ${GIFT_CARD_SB} Swap Bucks added`,
        relatedListingId: null,
        relatedTransactionId: null,
      });

      // Record redemption
      const { db } = await import("./storage");
      // Use raw insert since we don't have a storage method yet
      const sqlite2 = (storage as any).db || null;

      // Send welcome email
      sendWelcomeEmail(newUser.email, newUser.displayName || newUser.username).catch(console.error);

      // Issue token
      const token = crypto.randomBytes(32).toString("hex");
      await tokenStore.set(token, newUser.id);

      return res.json({
        token,
        user: { id: newUser.id, username: newUser.username, displayName: newUser.displayName, referralCode: newReferralCode },
        sbCredited: GIFT_CARD_SB,
      });
    } catch (err: any) {
      console.error("[GiftCard] redeem error:", err.message);
      return res.status(500).json({ message: err.message });
    }
  });



  // ============================================================
  // GIFT CARD SHARE WALL ENDPOINTS
  // ============================================================

  const INVITES_REQUIRED = 10;
  const GIFT_CARD_SB_REWARD = 40;

  // Get or create invite record for current user
  app.get("/api/gift-card/invite-status", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      let invite: any = storage_raw.query(
        "SELECT * FROM gift_card_invites WHERE inviter_id = ? LIMIT 1",
        [user.id]
      )[0] || null;

      if (!invite) {
        const inviteCode = "GC-" + user.id + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
        storage_raw.run(
          "INSERT INTO gift_card_invites (inviter_id, invite_code, click_count, unlocked, created_at) VALUES (?, ?, 0, 0, ?)",
          [user.id, inviteCode, new Date().toISOString()]
        );
        invite = { inviter_id: user.id, invite_code: inviteCode, click_count: 0, unlocked: 0 };
      }

      const inviteLink = `${process.env.FRONTEND_URL || "https://www.swapedly.com"}/#/gift-card?ref=${(user as any).referralCode || ""}&invite=${invite?.invite_code || ""}`;

      return res.json({
        inviteCode: invite?.invite_code,
        clickCount: invite?.click_count || 0,
        invitesRequired: INVITES_REQUIRED,
        unlocked: !!(invite?.unlocked),
        inviteLink,
        sbReward: GIFT_CARD_SB_REWARD,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Track a click on an invite link
  app.post("/api/gift-card/invite-click", async (req: Request, res: Response) => {
    try {
      const { inviteCode } = req.body;
      if (!inviteCode) return res.json({ ok: true });

      const invite: any = storage_raw.query(
        "SELECT * FROM gift_card_invites WHERE invite_code = ? LIMIT 1",
        [inviteCode]
      )[0];
      if (!invite) return res.json({ ok: true });

      const newCount = (invite.click_count || 0) + 1;
      const shouldUnlock = !invite.unlocked && newCount >= INVITES_REQUIRED;
      storage_raw.run(
        "UPDATE gift_card_invites SET click_count = ?, unlocked = ?, unlocked_at = ? WHERE invite_code = ?",
        [newCount, shouldUnlock ? 1 : invite.unlocked, shouldUnlock ? new Date().toISOString() : invite.unlocked_at, inviteCode]
      );

      // If just unlocked, credit the SB
      if (shouldUnlock) {
        await storage.creditWallet(invite.inviter_id, GIFT_CARD_SB_REWARD);
        await storage.createLedgerEntry({
          userId: invite.inviter_id,
          amount: GIFT_CARD_SB_REWARD,
          type: "gift_card",
          description: `Gift card unlocked — ${GIFT_CARD_SB_REWARD} SB credited after ${INVITES_REQUIRED} friend invites!`,
          relatedListingId: null,
          relatedTransactionId: null,
        });
        await storage.createNotification({
          userId: invite.inviter_id,
          type: "system",
          title: `🎉 ${GIFT_CARD_SB_REWARD} Swap Bucks Unlocked!`,
          body: `You invited ${INVITES_REQUIRED} friends and unlocked your gift card reward! ${GIFT_CARD_SB_REWARD} SB added to your wallet.`,
          link: "/wallet",
        });
      }

      return res.json({ ok: true, newCount, unlocked: shouldUnlock });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // SOCIAL SHARING REWARD ENDPOINTS
  // ============================================================

  const SHARE_REWARDS: Record<string, { sb: number; label: string; cooldownHours: number }> = {
    gift_card_share:  { sb: 1,  label: "Gift Card Share",           cooldownHours: 24 },
    facebook_post:    { sb: 5,  label: "Facebook Post",             cooldownHours: 24 },
    pinterest_post:   { sb: 5,  label: "Pinterest Post",            cooldownHours: 24 },
    video_review:     { sb: 30, label: "Video Review on Social Media", cooldownHours: 168 }, // once per week
  };

  app.post("/api/share-reward/claim", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { type, proofUrl } = req.body;

      const reward = SHARE_REWARDS[type];
      if (!reward) return res.status(400).json({ message: "Invalid reward type" });

      // Check cooldown via ledger — prevent double-claiming within cooldown window
      const since = new Date(Date.now() - reward.cooldownHours * 60 * 60 * 1000).toISOString();
      const { entries: recentEntries } = await storage.getLedgerByUserId(user.id, 1, 50);
      const alreadyClaimed = recentEntries.some(
        (e: any) => e.type === "share_reward" &&
          e.description?.includes(reward.label) &&
          e.createdAt > since
      );

      if (alreadyClaimed) {
        const nextAt = new Date(Date.now() + reward.cooldownHours * 60 * 60 * 1000);
        return res.status(429).json({
          message: `You already claimed this reward. Come back in ${reward.cooldownHours < 24 ? reward.cooldownHours + " hours" : Math.round(reward.cooldownHours / 24) + " days"}.`,
          nextClaimAt: nextAt.toISOString(),
        });
      }

      await storage.creditWallet(user.id, reward.sb);
      await storage.createLedgerEntry({
        userId: user.id,
        amount: reward.sb,
        type: "share_reward",
        description: `${reward.label} — +${reward.sb} SB${proofUrl ? " (proof submitted)" : ""}`,
        relatedListingId: null,
        relatedTransactionId: null,
      });

      await storage.createNotification({
        userId: user.id,
        type: "system",
        title: `+${reward.sb} SB earned!`,
        body: `You earned ${reward.sb} Swap Bucks for your ${reward.label}.`,
        link: "/wallet",
      });

      return res.json({ success: true, sbEarned: reward.sb, label: reward.label });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Get claimed rewards for current user (to show claimed state in UI)
  app.get("/api/share-reward/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { entries } = await storage.getLedgerByUserId(user.id, 1, 100);
      const now = Date.now();
      const status: Record<string, { claimed: boolean; nextClaimAt?: string }> = {};

      for (const [type, reward] of Object.entries(SHARE_REWARDS)) {
        const since = new Date(now - reward.cooldownHours * 60 * 60 * 1000).toISOString();
        const recent = entries.find(
          (e: any) => e.type === "share_reward" && e.description?.includes(reward.label) && e.createdAt > since
        );
        status[type] = {
          claimed: !!recent,
          nextClaimAt: recent
            ? new Date(new Date(recent.createdAt).getTime() + reward.cooldownHours * 60 * 60 * 1000).toISOString()
            : undefined,
        };
      }
      return res.json(status);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // GOOGLE OAUTH ROUTES
  // ============================================================
  app.get("/auth/google", (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect("/#/login?error=google_not_configured");
    }
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
  });

  app.get("/auth/google/callback", (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect("/#/login?error=google_not_configured");
    }
    passport.authenticate("google", { failureRedirect: "/#/login?error=google_failed" },
      async (err: any, user: any) => {
        if (err || !user) return res.redirect("/#/login?error=google_failed");
        const token = crypto.randomBytes(32).toString("hex");
        await tokenStore.set(token, user.id);
          // Redirect to the frontend domain (custom domain if set, otherwise APP_URL)
        const frontendBase = process.env.FRONTEND_URL || process.env.APP_URL || "https://www.swapedly.com";
        res.redirect(`${frontendBase}/#/oauth-callback?token=${token}&userId=${user.id}`);
      }
    )(req, res, next);
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
        // Credit 1 SB to referrer per invite
        await storage.creditWallet(referrer.id, 1);
        await storage.createLedgerEntry({
          userId: referrer.id,
          amount: 1,
          type: "referral_bonus",
          description: `Referral bonus for inviting ${username}`,
        });
        await storage.createNotification({
          userId: referrer.id,
          type: "referral",
          title: "Referral Bonus!",
          body: `${username} joined using your referral code. You earned 1 SB!`,
          link: "/wallet",
        });

        // Mark the referral click as converted
        await storage.markReferralConverted(referrer.referralCode || "", user.id);
      }

      // Login the user
      req.login(user, async (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        const { password: _, ...safeUser } = user;
        const token = generateToken();
        await tokenStore.set(token, user.id);
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
      req.login(user, async (loginErr) => {
        if (loginErr) return res.status(500).json({ message: "Login failed" });
        const { password: _, ...safeUser } = user;
        // Generate auth token for proxy/iframe environments where cookies don't work
        const token = generateToken();
        await tokenStore.set(token, user.id);
        return res.json({ ...safeUser, token });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(async (err) => {
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
      const _q = req.query;
      const category = (Array.isArray(_q.category) ? _q.category[0] : _q.category) as string;
      const condition = _q.condition as string;
      const minPrice = _q.minPrice as string;
      const maxPrice = _q.maxPrice as string;
      const search = _q.search as string;
      const sort = _q.sort as string;
      const page = _q.page as string;
      const limit = _q.limit as string;
      const city = _q.city as string;
      const result = await storage.getListings({
        category: (categories as string) || (category as string), // support both param names
        condition: condition as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        search: search as string,
        sort: sort as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        city: city as string,
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/listings/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId as string);
      const result = await storage.getListingsBySellerId(userId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/listings/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
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
      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) return res.status(401).json({ message: "User not found" });

      const publishingActive = req.body.status === "active";
      const userIsPlus = isPlus(fullUser);
      const inOnboarding = !fullUser.onboardingComplete;

      // Listings are FREE for all users — no credit gate on publishing

      const listing = await storage.createListing({
        ...req.body,
        sellerId: user.id,
      });

      // Credit SB listing bonus (with multiplier)
      const multiplier = getSbMultiplier(fullUser);
      const sbReward = Math.round(5 * multiplier * 10) / 10;
      await storage.creditWallet(user.id, sbReward);
      await storage.createLedgerEntry({
        userId: user.id,
        amount: sbReward,
        type: "purchase_credit",
        description: `Listing credit for creating "${listing.title}"${multiplier > 1 ? " (Plus bonus)" : ""}`,
        relatedListingId: listing.id,
      });

      // Track onboarding progress
      if (!fullUser.onboardingComplete) {
        const newCount = (fullUser.onboardingListingsCount || 0) + 1;
        const updates: any = { onboardingListingsCount: newCount };
        if (newCount >= 1 && fullUser.onboardingStep === "listings") {
          // Listing created — unlock sidebar but keep marketplace gated on 30 SB
          updates.onboardingStep = "earn";
        }
        await storage.updateUser(user.id, updates);
      }

      return res.status(201).json(listing);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/listings/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id as string);
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
      const id = parseInt(req.params.id as string);
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

  // Seller accepts a purchase request
  app.post("/api/transactions/:id/accept", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const txnId = parseInt(req.params.id as string);
      const txn = await storage.getTransactionById(txnId);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      if (txn.sellerId !== user.id) return res.status(403).json({ message: "Only the seller can accept" });
      if (txn.status !== "awaiting_acceptance") return res.status(400).json({ message: "Transaction cannot be accepted in this state" });

      await storage.updateTransaction(txnId, { status: "accepted" });

      // Notify buyer
      const listing = await storage.getListingById(txn.listingId);
      await storage.createNotification({
        userId: txn.buyerId,
        type: "sale",
        title: "Purchase accepted!",
        body: `The seller accepted your purchase of "${listing?.title}". You can now coordinate the exchange in the transaction chat.`,
        link: `/transactions/${txnId}`,
      });
      const buyerForEmail = await storage.getUserById(txn.buyerId);
      const sellerForAccept = await storage.getUserById(txn.sellerId);
      if (buyerForEmail && sellerForAccept && listing) {
        sendPurchaseAcceptedEmail(buyerForEmail.email, buyerForEmail.displayName || buyerForEmail.username, sellerForAccept.displayName || sellerForAccept.username, listing.title, txnId).catch(console.error);
      }

      return res.json({ success: true, status: "accepted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Seller declines — refund buyer
  app.post("/api/transactions/:id/decline", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const txnId = parseInt(req.params.id as string);
      const txn = await storage.getTransactionById(txnId);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      if (txn.sellerId !== user.id) return res.status(403).json({ message: "Only the seller can decline" });
      if (txn.status !== "awaiting_acceptance") return res.status(400).json({ message: "Transaction cannot be declined in this state" });

      // Refund buyer
      await storage.creditWallet(txn.buyerId, txn.amount);
      await storage.createLedgerEntry({
        userId: txn.buyerId,
        amount: txn.amount,
        type: "refund",
        description: "Purchase declined by seller — refund",
        relatedListingId: txn.listingId,
        relatedTransactionId: txnId,
      });

      // Refund purchase credit
      const buyer = await storage.getUserById(txn.buyerId);
      if (buyer && !isPlus(buyer)) {
        await storage.updateUser(txn.buyerId, { purchaseCredits: (buyer.purchaseCredits || 0) + 1 });
      }

      await storage.updateTransaction(txnId, { status: "cancelled" });

      // Un-reserve the listing
      await storage.updateListing(txn.listingId, { status: "active" });

      await storage.createNotification({
        userId: txn.buyerId,
        type: "system",
        title: "Purchase declined",
        body: "The seller declined your purchase. Your Swap Bucks have been refunded.",
        link: `/transactions/${txnId}`,
      });

      return res.json({ success: true, status: "cancelled" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Mark exchange as complete — transfers SB to seller
  app.post("/api/transactions/:id/complete", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const txnId = parseInt(req.params.id as string);
      const txn = await storage.getTransactionById(txnId);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      if (txn.buyerId !== user.id && txn.sellerId !== user.id) return res.status(403).json({ message: "Not your transaction" });
      if (!["accepted", "in_progress"].includes(txn.status)) return res.status(400).json({ message: "Transaction not in a completable state" });

      // Credit seller
      await storage.creditWallet(txn.sellerId, txn.amount);
      await storage.createLedgerEntry({
        userId: txn.sellerId,
        amount: txn.amount,
        type: "sale",
        description: `Sale completed`,
        relatedListingId: txn.listingId,
        relatedTransactionId: txnId,
      });

      await storage.updateTransaction(txnId, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });

      // Mark listing as sold
      await storage.updateListing(txn.listingId, { status: "sold" });

      const listing = await storage.getListingById(txn.listingId);

      // SB earned notification for seller
      await storage.createNotification({
        userId: txn.sellerId,
        type: "sale",
        title: "Exchange complete! SB transferred.",
        body: `${txn.amount} Swap Bucks have been added to your wallet for selling "${listing?.title}".`,
        link: "/wallet",
      });
      await storage.createNotification({
        userId: txn.buyerId,
        type: "system",
        title: "Exchange complete!",
        body: `Your purchase of "${listing?.title}" is complete. Enjoy!`,
        link: "/wallet",
      });
      const sellerForComplete = await storage.getUserById(txn.sellerId);
      const buyerForComplete = await storage.getUserById(txn.buyerId);
      if (sellerForComplete && listing) sendExchangeCompleteEmail(sellerForComplete.email, sellerForComplete.displayName || sellerForComplete.username, listing.title, txn.amount).catch(console.error);
      if (buyerForComplete && listing) sendExchangeCompleteEmail(buyerForComplete.email, buyerForComplete.displayName || buyerForComplete.username, listing.title, txn.amount).catch(console.error);

      return res.json({ success: true, status: "completed" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Transaction messages
  app.get("/api/transactions/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const txnId = parseInt(req.params.id as string);
      const txn = await storage.getTransactionById(txnId);
      if (!txn) return res.status(404).json({ message: "Not found" });
      if (txn.buyerId !== user.id && txn.sellerId !== user.id) return res.status(403).json({ message: "Not your transaction" });

      // Find conversation between buyer and seller
      const conv = await storage.getConversationByParticipants(txn.buyerId, txn.sellerId);
      if (!conv) return res.json([]);

      const msgs = await storage.getMessagesByConversation(conv.id);
      return res.json(msgs);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/transactions/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const txnId = parseInt(req.params.id as string);
      const txn = await storage.getTransactionById(txnId);
      if (!txn) return res.status(404).json({ message: "Not found" });
      if (txn.buyerId !== user.id && txn.sellerId !== user.id) return res.status(403).json({ message: "Not your transaction" });

      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Message required" });

      let conv = await storage.getConversationByParticipants(txn.buyerId, txn.sellerId);
      if (!conv) {
        conv = await storage.createConversation({ participant1Id: txn.buyerId, participant2Id: txn.sellerId, lastMessageAt: new Date().toISOString() });
      }

      const msg = await storage.createMessage({ conversationId: conv.id, senderId: user.id, content: content.trim() });
      return res.json(msg);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Get single transaction
  app.get("/api/transactions/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const txnId = parseInt(req.params.id as string);
      const txn = await storage.getTransactionById(txnId);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      if (txn.buyerId !== user.id && txn.sellerId !== user.id) return res.status(403).json({ message: "Not your transaction" });

      const listing = await storage.getListingById(txn.listingId);
      const buyer = await storage.getUserById(txn.buyerId);
      const seller = await storage.getUserById(txn.sellerId);
      const { password: _b, ...safeBuyer } = buyer || { password: "" };
      const { password: _s, ...safeSeller } = seller || { password: "" };

      return res.json({ ...txn, listing, buyer: safeBuyer, seller: safeSeller });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });
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

      // Check buyer has a purchase credit (free users must buy credits to complete a purchase)
      const fullBuyer = await storage.getUserById(buyer.id);
      if (!fullBuyer) return res.status(401).json({ message: "User not found" });
      if (!isPlus(fullBuyer) && (fullBuyer.purchaseCredits || 0) < 1) {
        return res.status(402).json({
          message: "Purchase credit required",
          code: "PURCHASE_CREDIT_REQUIRED",
          creditsNeeded: 1,
          creditsAvailable: fullBuyer.purchaseCredits || 0,
        });
      }
      // Deduct one purchase credit (Plus members are exempt)
      if (!isPlus(fullBuyer)) {
        await storage.updateUser(buyer.id, { purchaseCredits: (fullBuyer.purchaseCredits || 0) - 1 });
      }

      // Calculate fees
      const buyerFee = calculateFee(listing.price);
      const sellerFee = calculateFee(listing.price);

      // Debit buyer wallet (hold in escrow — SB removed from buyer balance)
      await storage.debitWallet(buyer.id, listing.price);
      await storage.createLedgerEntry({
        userId: buyer.id,
        amount: -listing.price,
        type: "purchase",
        description: `Purchase request for "${listing.title}" (awaiting seller acceptance)`,
        relatedListingId: listing.id,
      });

      // Create transaction in "awaiting_acceptance" state
      const txn = await storage.createTransaction({
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        amount: listing.price,
        buyerFeeUsd: buyerFee,
        sellerFeeUsd: sellerFee,
        deliveryMethod: deliveryMethod || "local_pickup",
      });

      // Update transaction status to awaiting_acceptance
      await storage.updateTransaction(txn.id, { status: "awaiting_acceptance" });

      // Mark listing as reserved (not sold yet — seller must accept)
      await storage.updateListing(listing.id, { status: "reserved" });

      // Open a conversation between buyer and seller for this transaction
      let conv = await storage.getConversationByParticipants(buyer.id, listing.sellerId);
      if (!conv) {
        conv = await storage.createConversation({ participant1Id: buyer.id, participant2Id: listing.sellerId, lastMessageAt: new Date().toISOString() });
      }
      // Send automated first message
      await storage.createMessage({
        conversationId: conv.id,
        senderId: buyer.id,
        content: `Hi! I'd like to purchase "${listing.title}" for ${listing.price} SB. My SB has been held in escrow. Please accept or decline this request.`,
      });

      // Notify seller
      await storage.createNotification({
        userId: listing.sellerId,
        type: "sale",
        title: "New purchase request!",
        body: `${buyer.username} wants to buy "${listing.title}" for ${listing.price} SB. Accept or decline.`,
        link: `/transactions/${txn.id}`,
      });
      const sellerForEmail = await storage.getUserById(listing.sellerId);
      if (sellerForEmail) {
        sendPurchaseRequestEmail(sellerForEmail.email, sellerForEmail.displayName || sellerForEmail.username, fullBuyer.displayName || fullBuyer.username, listing.title, listing.price, txn.id).catch(console.error);
      }

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
      const id = parseInt(req.params.id as string);
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
      const id = parseInt(req.params.id as string);
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
      const id = parseInt(req.params.id as string);
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
      const id = parseInt(req.params.id as string);
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
      const convId = parseInt(req.params.id as string);
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
      const convId = parseInt(req.params.id as string);
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
      const convId = parseInt(req.params.id as string);
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
      const userId = parseInt(req.params.userId as string);
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
      const listingId = parseInt(req.params.listingId as string);
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
      const id = parseInt(req.params.id as string);
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
      const id = parseInt(req.params.id as string);
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
      const disputeId = parseInt(req.params.id as string);
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
      const id = parseInt(req.params.id as string);
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
      const id = parseInt(req.params.id as string);
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
      const taskId = parseInt(req.params.taskId as string);

      const task = await storage.getTaskById(taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });
      if (!task.isActive) return res.status(400).json({ message: "Task is no longer active" });

      // Check if already completed
      const existing = await storage.getCompletionByUserAndTask(user.id, taskId);
      if (existing) return res.status(400).json({ message: "Task already completed" });

      // Create completion
      await storage.createEarnCompletion({ userId: user.id, taskId });

      // Credit wallet (with Plus multiplier)
      const fullUser = await storage.getUserById(user.id);
      const multiplier = fullUser ? getSbMultiplier(fullUser) : 1;
      const earnAmount = Math.round(task.reward * multiplier * 10) / 10;
      await storage.creditWallet(user.id, earnAmount);
      await storage.createLedgerEntry({
        userId: user.id,
        amount: earnAmount,
        type: "earn_task",
        description: `Earned ${earnAmount} SB for completing "${task.title}"${multiplier > 1 ? " (Plus bonus)" : ""}`,
      });

      // Notify
      await storage.createNotification({
        userId: user.id,
        type: "earn_reward",
        title: "Reward Earned!",
        body: `You earned ${earnAmount} SB for completing "${task.title}"`,
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
      const listingId = parseInt(req.params.listingId as string);

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
      const id = parseInt(req.params.id as string);
      const user = await storage.getUserById(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = user;
      // Include active listings and stats
      const allListings = await storage.getListingsBySellerId(id);
      const activeListings = allListings.filter(l => l.status === "active");
      const txns = await storage.getTransactionsByUserId(id);
      const userReviews = await storage.getReviewsByUserId(id);
      const avgRating = userReviews.length > 0
        ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length : 0;
      return res.json({
        ...safeUser,
        listings: activeListings,
        reviews: userReviews,
        stats: {
          totalListings: activeListings.length,
          successfulTrades: txns.filter(t => t.status === "completed").length,
          averageRating: Math.round(avgRating * 10) / 10,
          reviewCount: userReviews.length,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/users/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { displayName, bio, location, city, avatarUrl, notificationPrefs } = req.body;
      const updated = await storage.updateUser(user.id, {
        displayName,
        bio,
        location,
        city,
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
      const id = parseInt(req.params.id as string);
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
      const id = parseInt(req.params.id as string);
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
      const status = (req.query.status as string) || undefined;
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
      const id = parseInt(req.params.id as string);
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
      const id = parseInt(req.params.id as string);
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
      const id = parseInt(req.params.id as string);
      const updated = await storage.updateEarnTask(id, req.body);
      if (!updated) return res.status(404).json({ message: "Task not found" });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // SOCIAL ACCOUNTS
  // ============================================================
  app.get("/api/social-accounts", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const accounts = await storage.getSocialAccountsByUserId(user.id);
      return res.json(accounts);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/social-accounts", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { platform, handle, profileUrl } = req.body;
      if (!platform || !handle) {
        return res.status(400).json({ message: "Platform and handle are required" });
      }
      // Check if user already linked this platform
      const existing = await storage.getSocialAccountByPlatform(user.id, platform);
      if (existing) {
        // Update instead of create
        const updated = await storage.updateSocialAccount(existing.id, { handle, profileUrl });
        return res.json(updated);
      }
      const account = await storage.createSocialAccount({
        userId: user.id,
        platform,
        handle,
        profileUrl: profileUrl || null,
      });
      return res.status(201).json(account);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/social-accounts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteSocialAccount(id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // SOCIAL SHARES (Share & Earn)
  // ============================================================
  // Generate share content for a listing
  app.get("/api/share/generate/:listingId", requireAuth, async (req: Request, res: Response) => {
    try {
      const listingId = parseInt(req.params.listingId as string);
      const listing = await storage.getListingById(listingId);
      if (!listing) return res.status(404).json({ message: "Listing not found" });

      const images = listing.images ? JSON.parse(listing.images) : [];
      const tags = listing.tags ? JSON.parse(listing.tags) : [];
      const coverImage = images[0] || null;

      // Generate hashtags based on category + tags
      const baseHashtags = ["#Swapedly", "#SwapBucks", "#TradeSmarter", "#SwapDontShop"];
      const categoryTag = `#${listing.category.replace(/[^a-zA-Z0-9]/g, "")}`;
      const itemTags = tags.slice(0, 3).map((t: string) => `#${t.replace(/[^a-zA-Z0-9]/g, "")}`);
      const allHashtags = [...baseHashtags, categoryTag, ...itemTags];

      // Generate captions per platform
      const caption = `Check out this ${listing.title} on Swapedly! 🔄\n\nSwap it for just ${listing.price} Swap Bucks — no cash needed. Trade goods, earn rewards, and discover amazing items.\n\nJoin Swapedly today and get 10 free Swap Bucks to start trading!`;

      const shortCaption = `${listing.title} — ${listing.price} Swap Bucks on @Swapedly 🔄 Trade smarter, swap better!`;

      return res.json({
        listing: {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          category: listing.category,
          condition: listing.condition,
          coverImage,
        },
        captions: {
          instagram: `${caption}\n\n${allHashtags.join(" ")}`,
          facebook: `${caption}\n\n${allHashtags.join(" ")}`,
          tiktok: `${shortCaption}\n\n${allHashtags.join(" ")}`,
          pinterest: `${listing.title} | ${listing.price} Swap Bucks on Swapedly\n\n${caption}`,
        },
        hashtags: allHashtags,
        coverImage,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Submit a share claim (user provides post URL to earn SB)
  app.post("/api/share/claim", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { listingId, platform, postUrl } = req.body;
      if (!listingId || !platform || !postUrl) {
        return res.status(400).json({ message: "listingId, platform, and postUrl are required" });
      }

      // Validate the listing exists
      const listing = await storage.getListingById(listingId);
      if (!listing) return res.status(404).json({ message: "Listing not found" });

      // Check if already shared on this platform for this listing
      const alreadyShared = await storage.hasUserSharedOnPlatform(user.id, listingId, platform);
      if (alreadyShared) {
        return res.status(400).json({ message: "You already earned rewards for sharing this listing on " + platform });
      }

      // Create the share record
      const share = await storage.createSocialShare({
        userId: user.id,
        listingId,
        platform,
        postUrl,
        reward: 5,
      });

      // Auto-verify and pay reward (with Plus multiplier)
      const fullUser = await storage.getUserById(user.id);
      const multiplier = fullUser ? getSbMultiplier(fullUser) : 1;
      const sbReward = Math.round(5 * multiplier * 10) / 10;
      await storage.updateSocialShareStatus(share.id, { status: "verified", rewardPaid: true, reward: sbReward });

      await storage.creditWallet(user.id, sbReward);
      await storage.createLedgerEntry({
        userId: user.id,
        amount: sbReward,
        type: "social_share",
        description: `Share reward: ${listing.title} on ${platform}${multiplier > 1 ? " (Plus bonus)" : ""}`,
        relatedListingId: listing.id,
      });

      // Notify user
      await storage.createNotification({
        userId: user.id,
        type: "earn_reward",
        title: "Share Reward Earned!",
        body: `You earned ${sbReward} SB for sharing "${listing.title}" on ${platform}.`,
        link: "/share-earn",
      });

      return res.status(201).json({ ...share, status: "verified", rewardPaid: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Get user's share history
  app.get("/api/share/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const shares = await storage.getSocialSharesByUserId(user.id);
      return res.json(shares);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Get shareable listings for current user (their active listings)
  app.get("/api/share/listings", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      // Return all active listings (user can share any listing, not just their own)
      const result = await storage.getListings({ status: "active", limit: 50 });
      return res.json(result.listings);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // MEMBERSHIP
  // ============================================================

  // Get membership info + pricing constants
  app.get("/api/membership", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) return res.status(401).json({ message: "User not found" });

      return res.json({
        tier: fullUser.membershipTier,
        isPlus: isPlus(fullUser),
        expiresAt: fullUser.membershipExpiresAt,
        highlightsRemaining: fullUser.highlightsRemaining,
        purchaseCredits: fullUser.purchaseCredits,
        pricing: MEMBERSHIP,
        multiplier: getSbMultiplier(fullUser),
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Upgrade to Plus (simulated — in production this would be a Paddle checkout callback)
  app.post("/api/membership/upgrade", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      // In production, this would be triggered by Paddle webhook after successful payment
      // For now, simulate the upgrade
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await storage.updateUser(user.id, {
        membershipTier: "plus",
        membershipExpiresAt: expiresAt.toISOString(),
        highlightsRemaining: MEMBERSHIP.PLUS_HIGHLIGHTS_PER_MONTH,
      });

      await storage.createNotification({
        userId: user.id,
        type: "system",
        title: "Welcome to Swapedly Plus!",
        body: "You now earn 1.5x SB on all rewards, get 5 highlighted listings/month, and unlimited free listings.",
        link: "/membership",
      });

      return res.json({ success: true, tier: "plus", expiresAt: expiresAt.toISOString() });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Cancel Plus (downgrade to free)
  app.post("/api/membership/cancel", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      await storage.updateUser(user.id, {
        membershipTier: "free",
        membershipExpiresAt: null,
        highlightsRemaining: 0,
      });
      return res.json({ success: true, tier: "free" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Purchase listing credits (for free users)
  app.post("/api/membership/buy-credits", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { quantity } = req.body;
      if (!quantity || quantity < MEMBERSHIP.MIN_CREDIT_PURCHASE) {
        return res.status(400).json({
          message: `Minimum purchase is ${MEMBERSHIP.MIN_CREDIT_PURCHASE} credits ($${(MEMBERSHIP.MIN_CREDIT_PURCHASE * MEMBERSHIP.PURCHASE_CREDIT_PRICE_USD).toFixed(2)})`,
        });
      }

      // In production, this would process payment through Paddle first
      // For now, simulate the purchase
      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) return res.status(401).json({ message: "User not found" });

      const newCredits = (fullUser.purchaseCredits || 0) + quantity;
      await storage.updateUser(user.id, { purchaseCredits: newCredits });

      const totalUsd = (quantity * MEMBERSHIP.PURCHASE_CREDIT_PRICE_USD).toFixed(2);
      await storage.createNotification({
        userId: user.id,
        type: "system",
        title: "Listing Credits Purchased",
        body: `You purchased ${quantity} purchase credits for $${totalUsd}.`,
        link: "/my-listings",
      });

      return res.json({ success: true, credits: newCredits, purchased: quantity });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ─── Buy Swap Bucks via Stripe ───────────────────────────────────────────────
  app.post("/api/stripe/buy-swap-bucks", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) return res.status(401).json({ message: "User not found" });

      const { pack } = req.body; // "100" | "500" | "1000"
      const packMap: Record<string, { sb: number; priceUsd: number; label: string }> = {
        "100": { sb: 100, priceUsd: 100.00, label: "100 Swap Bucks" },
        "500": { sb: 500, priceUsd: 500.00, label: "500 Swap Bucks" },
        "1000": { sb: 1000, priceUsd: 1000.00, label: "1,000 Swap Bucks" },
      };
      const chosen = packMap[pack];
      if (!chosen) return res.status(400).json({ message: "Invalid pack" });

      const origin = req.headers.origin || "https://www.swapedly.com";

      // Create a Stripe checkout session with dynamic pricing
      const s = getStripe();
      const user2 = await storage.getUserById(user.id);
      let customerId = user2?.paddleCustomerId;
      if (!customerId) {
        const cust = await s.customers.create({ email: fullUser.email, metadata: { swapelyUserId: String(user.id) } });
        customerId = cust.id;
        await storage.updateUser(user.id, { paddleCustomerId: customerId });
      }

      const session = await s.checkout.sessions.create({
        customer: customerId,
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: Math.round(chosen.priceUsd * 100),
            product_data: { name: chosen.label, description: `${chosen.sb} Swap Bucks added to your Swapedly wallet` },
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${origin}/#/wallet?sb_success=${chosen.sb}`,
        cancel_url: `${origin}/#/earn`,
        metadata: { userId: String(user.id), sbAmount: String(chosen.sb), type: "sb_pack" },
        allow_promotion_codes: true,
      });

      return res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] buy-swap-bucks error:", err.message);
      return res.status(500).json({ message: err.message });
    }
  });

  // ─── Buy Purchase Credits via Stripe ─────────────────────────────────────────
  app.post("/api/stripe/buy-purchase-credits", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) return res.status(401).json({ message: "User not found" });

      const { quantity } = req.body; // number of credits
      if (!quantity || quantity < 10) return res.status(400).json({ message: "Minimum 10 credits" });

      const pricePerCredit = 0.49;
      const totalUsd = quantity * pricePerCredit;
      const origin = req.headers.origin || "https://www.swapedly.com";

      const s = getStripe();
      const user2 = await storage.getUserById(user.id);
      let customerId = user2?.paddleCustomerId;
      if (!customerId) {
        const cust = await s.customers.create({ email: fullUser.email, metadata: { swapelyUserId: String(user.id) } });
        customerId = cust.id;
        await storage.updateUser(user.id, { paddleCustomerId: customerId });
      }

      const session = await s.checkout.sessions.create({
        customer: customerId,
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: Math.round(totalUsd * 100),
            product_data: { name: `${quantity} Purchase Credits`, description: "Each credit lets you complete one marketplace purchase" },
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${origin}/#/membership?credits_success=${quantity}`,
        cancel_url: `${origin}/#/membership`,
        metadata: { userId: String(user.id), purchaseCredits: String(quantity), type: "purchase_credits" },
        allow_promotion_codes: true,
      });

      return res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] buy-purchase-credits error:", err.message);
      return res.status(500).json({ message: err.message });
    }
  });

  // Highlight a listing (Plus members only)
  app.post("/api/listings/:id/highlight", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id as string);

      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) return res.status(401).json({ message: "User not found" });

      if (!isPlus(fullUser)) {
        return res.status(403).json({ message: "Swapedly Plus membership required to highlight listings" });
      }

      if ((fullUser.highlightsRemaining || 0) <= 0) {
        return res.status(400).json({ message: "No highlight credits remaining this month" });
      }

      const listing = await storage.getListingById(id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.sellerId !== user.id) return res.status(403).json({ message: "Not your listing" });
      if (listing.isHighlighted) return res.status(400).json({ message: "Listing is already highlighted" });

      await storage.updateListing(id, {
        isHighlighted: true,
        highlightedAt: new Date().toISOString(),
      });

      await storage.updateUser(user.id, {
        highlightsRemaining: (fullUser.highlightsRemaining || 0) - 1,
      });

      return res.json({ success: true, highlightsRemaining: (fullUser.highlightsRemaining || 0) - 1 });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Remove highlight from a listing
  app.delete("/api/listings/:id/highlight", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id as string);

      const listing = await storage.getListingById(id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.sellerId !== user.id) return res.status(403).json({ message: "Not your listing" });

      await storage.updateListing(id, { isHighlighted: false, highlightedAt: null });

      // Refund the highlight credit
      const fullUser = await storage.getUserById(user.id);
      if (fullUser && isPlus(fullUser)) {
        await storage.updateUser(user.id, {
          highlightsRemaining: (fullUser.highlightsRemaining || 0) + 1,
        });
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // ONBOARDING
  // ============================================================

  // Get onboarding status
  app.get("/api/onboarding", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) return res.status(401).json({ message: "User not found" });

      const wallet = await storage.getWalletByUserId(user.id);
      const sbBalance = wallet?.balance || 0;
      const userIsPlus = isPlus(fullUser);
      const hasCredits = (fullUser.purchaseCredits || 0) > 0;
      const hasMembership = userIsPlus || hasCredits;
      const canAccessMarketplace = fullUser.onboardingComplete || sbBalance >= 30;

      // Auto-complete onboarding once the user has earned 30 SB
      if (!fullUser.onboardingComplete && sbBalance >= 30) {
        await storage.updateUser(user.id, { onboardingStep: "complete", onboardingComplete: true });
      }

      return res.json({
        onboardingComplete: fullUser.onboardingComplete || sbBalance >= 30,
        step: fullUser.onboardingStep,
        listingsCreated: fullUser.onboardingListingsCount || 0,
        listingsRequired: 1,
        hasMembership,
        isPlus: userIsPlus,
        purchaseCredits: fullUser.purchaseCredits || 0,
        sbBalance,
        sbRequired: 30,
        canAccessMarketplace,
        hasProfileImage: !!fullUser.avatarUrl,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Advance onboarding step
  app.post("/api/onboarding/advance", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { step } = req.body;
      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) return res.status(401).json({ message: "User not found" });

      if (step === "profile" && fullUser.onboardingStep === "membership") {
        await storage.updateUser(user.id, { onboardingStep: "profile" });
      } else if (step === "complete") {
        await storage.updateUser(user.id, { onboardingStep: "complete", onboardingComplete: true });
      }

      return res.json({ success: true, step });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Upload profile image
  app.post("/api/profile/avatar", requireAuth, upload.single("avatar"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const file = req.file as Express.Multer.File;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const avatarUrl = `/uploads/${file.filename}`;
      await storage.updateUser(user.id, { avatarUrl });

      // Award 2 SB if first profile image upload during onboarding
      const fullUser = await storage.getUserById(user.id);
      if (fullUser && !fullUser.onboardingComplete) {
        const multiplier = getSbMultiplier(fullUser);
        const reward = Math.round(2 * multiplier * 10) / 10;
        await storage.creditWallet(user.id, reward);
        await storage.createLedgerEntry({
          userId: user.id,
          amount: reward,
          type: "earn_task",
          description: "Profile picture uploaded" + (multiplier > 1 ? " (Plus bonus)" : ""),
        });
      }

      return res.json({ avatarUrl });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Claim video post reward (20 SB)
  app.post("/api/onboarding/claim-video", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { postUrl } = req.body;
      if (!postUrl) return res.status(400).json({ message: "Post URL required" });

      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) return res.status(401).json({ message: "User not found" });

      const multiplier = getSbMultiplier(fullUser);
      const reward = Math.round(20 * multiplier * 10) / 10;
      await storage.creditWallet(user.id, reward);
      await storage.createLedgerEntry({
        userId: user.id,
        amount: reward,
        type: "social_share",
        description: "Video post about Swapedly" + (multiplier > 1 ? " (Plus bonus)" : ""),
      });

      return res.json({ success: true, reward });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // STRIPE PAYMENTS
  // ============================================================

  // Return Stripe public config to frontend
  app.get("/api/stripe/config", (_req: Request, res: Response) => {
    return res.json({
      publishableKey: STRIPE_CONFIG.publishableKey,
      prices: STRIPE_CONFIG.prices,
    });
  });

  // Create a Stripe Checkout session
  app.post("/api/stripe/checkout", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) return res.status(401).json({ message: "User not found" });

      const { priceId, mode } = req.body;
      if (!priceId || !mode) return res.status(400).json({ message: "priceId and mode required" });

      const origin = req.headers.origin || "https://www.swapedly.com";
      const session = await createCheckoutSession({
        priceId,
        userId: user.id,
        userEmail: fullUser.email,
        mode,
        successUrl: `${origin}/#/membership?success=true`,
        cancelUrl: `${origin}/#/membership`,
      });

      return res.json({ url: session.url, sessionId: session.id });
    } catch (err: any) {
      console.error("[Stripe] Checkout error:", err.message);
      return res.status(500).json({ message: err.message });
    }
  });

  // Stripe webhook — receives payment events (raw body required)
  app.post("/api/stripe/webhook",
    express.default.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      try {
        const sig = req.headers["stripe-signature"] as string;
        const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));

        let event;
        if (STRIPE_CONFIG.webhookSecret && sig) {
          event = getStripe().webhooks.constructEvent(rawBody, sig, STRIPE_CONFIG.webhookSecret);
        } else {
          event = JSON.parse(rawBody.toString());
        }

        res.status(200).json({ received: true });
        await handleStripeWebhook(event);
      } catch (err: any) {
        console.error("[Stripe] Webhook error:", err.message);
        return res.status(400).json({ message: err.message });
      }
    }
  );

  // Cancel subscription
  app.post("/api/stripe/cancel", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const fullUser = await storage.getUserById(user.id);
      if (!fullUser?.paddleSubscriptionId) {
        return res.status(400).json({ message: "No active subscription" });
      }
      await getStripe().subscriptions.cancel(fullUser.paddleSubscriptionId);
      await storage.updateUser(user.id, {
        membershipTier: "free",
        membershipExpiresAt: null,
        paddleSubscriptionId: null,
        highlightsRemaining: 0,
      });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // ANALYTICS
  // ============================================================

  // In-memory active sessions (heartbeat-based online user count)
  const activeSessions = new Map<string, number>(); // sessionId -> lastSeen timestamp
  const ONLINE_TIMEOUT_MS = 90 * 1000; // 90 seconds

  function getOnlineCount(): number {
    const now = Date.now();
    for (const [id, ts] of activeSessions.entries()) {
      if (now - ts > ONLINE_TIMEOUT_MS) activeSessions.delete(id);
    }
    return activeSessions.size;
  }

  // Heartbeat endpoint — called every 30s by frontend
  app.post("/api/analytics/heartbeat", (req: Request, res: Response) => {
    const { sessionId } = req.body;
    if (sessionId) activeSessions.set(sessionId, Date.now());
    return res.json({ online: getOnlineCount() });
  });

  // Track a page view (called from frontend on every route change)
  app.post("/api/analytics/pageview", async (req: Request, res: Response) => {
    try {
      const { path, referrer, sessionId } = req.body;
      const userId = (req as any).user?.id || null;
      const ua = req.headers["user-agent"] || "";
      // Fire and forget — don't await
      storage.trackPageView({ path, referrer, userAgent: ua, sessionId, userId }).catch(() => {});
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(200).json({ ok: true }); // Never fail on analytics
    }
  });

  // Get analytics data (admin only)
  app.get("/api/admin/analytics", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const fullUser = await storage.getUserById(user.id);
      if (fullUser?.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const days = parseInt((req.query.days as string) || "30");
      const data = await storage.getAnalytics(days);
      return res.json({ ...data, onlineUsers: getOnlineCount() });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // LEADERBOARD
  // ============================================================
  app.get("/api/leaderboard", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "50"), 100);
      const rows = await storage.getLeaderboard(limit);
      return res.json(rows);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // REFERRAL TRACKING
  // ============================================================

  // Track a referral link click (called from frontend when /?ref=CODE is visited)
  app.post("/api/referral/click", async (req: Request, res: Response) => {
    try {
      const { referralCode } = req.body;
      if (!referralCode) return res.status(400).json({ message: "referralCode required" });

      const referrer = await storage.getUserByReferralCode(referralCode);
      if (!referrer) return res.status(404).json({ message: "Invalid referral code" });

      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "";
      const ua = req.headers["user-agent"] || "";

      await storage.trackReferralClick({
        referrerId: referrer.id,
        referralCode,
        ipAddress: ip,
        userAgent: ua,
        convertedUserId: null,
      });

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Get referral stats for the current user
  app.get("/api/referral/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const stats = await storage.getReferralStatsByUserId(user.id);
      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Admin: get all users' referral stats
  app.get("/api/admin/referral-stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const fullUser = await storage.getUserById(user.id);
      if (fullUser?.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const stats = await storage.getAllReferralStats();
      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ===== SEED DATABASE =====
  seedDatabase();

  return httpServer;
}
