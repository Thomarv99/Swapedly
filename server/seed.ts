import { db } from "./storage";
import {
  users, wallets, walletLedger, listings, transactions,
  conversations, messages, reviews, questions,
  disputes, disputeMessages, notifications,
  earnTasks, earnCompletions, favorites,
} from "@shared/schema";
import crypto from "crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function seedDatabase() {
  // Check if already seeded
  const existingUsers = db.select().from(users).all();
  if (existingUsers.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database...");

  // ===== USERS =====
  const adminUser = db.insert(users).values({
    username: "admin",
    email: "admin@swapedly.com",
    password: hashPassword("admin123"),
    displayName: "Platform Admin",
    avatarUrl: null,
    bio: "Swapedly platform administrator",
    location: "San Francisco, CA",
    joinedAt: daysAgo(120),
    role: "admin",
    isVerified: true,
    referralCode: "ADMIN001",
    referredBy: null,
  }).returning().get();

  const user1 = db.insert(users).values({
    username: "sarah_trades",
    email: "sarah@example.com",
    password: hashPassword("password123"),
    displayName: "Sarah Johnson",
    avatarUrl: null,
    bio: "Avid trader and collector. Love finding unique items!",
    location: "Austin, TX",
    joinedAt: daysAgo(90),
    role: "user",
    isVerified: true,
    referralCode: generateReferralCode(),
    referredBy: null,
  }).returning().get();

  const user2 = db.insert(users).values({
    username: "mike_swaps",
    email: "mike@example.com",
    password: hashPassword("password123"),
    displayName: "Mike Chen",
    avatarUrl: null,
    bio: "Tech enthusiast. Trading gadgets and gear.",
    location: "Seattle, WA",
    joinedAt: daysAgo(60),
    role: "user",
    isVerified: true,
    referralCode: generateReferralCode(),
    referredBy: user1.id,
  }).returning().get();

  const user3 = db.insert(users).values({
    username: "emma_deals",
    email: "emma@example.com",
    password: hashPassword("password123"),
    displayName: "Emma Rodriguez",
    avatarUrl: null,
    bio: "Fashionista swapping styles. Sustainability matters!",
    location: "Los Angeles, CA",
    joinedAt: daysAgo(30),
    role: "user",
    isVerified: false,
    referralCode: generateReferralCode(),
    referredBy: null,
  }).returning().get();

  // ===== WALLETS =====
  db.insert(wallets).values({ userId: adminUser.id, balance: 10000, totalEarned: 10000, totalSpent: 0 }).run();
  db.insert(wallets).values({ userId: user1.id, balance: 1500, totalEarned: 2010, totalSpent: 510 }).run();
  db.insert(wallets).values({ userId: user2.id, balance: 2000, totalEarned: 2510, totalSpent: 510 }).run();
  db.insert(wallets).values({ userId: user3.id, balance: 750, totalEarned: 1010, totalSpent: 260 }).run();

  // ===== WALLET LEDGER =====
  const ledgerEntries = [
    { userId: user1.id, amount: 10, type: "welcome_bonus", description: "Welcome bonus for joining Swapedly", createdAt: daysAgo(90) },
    { userId: user1.id, amount: 500, type: "referral_bonus", description: "Referral bonus for inviting mike_swaps", createdAt: daysAgo(60) },
    { userId: user1.id, amount: 5, type: "listing_credit", description: "Listing credit for creating a listing", createdAt: daysAgo(85) },
    { userId: user1.id, amount: -510, type: "purchase", description: "Purchased Vintage Camera", createdAt: daysAgo(20) },
    { userId: user1.id, amount: 1500, type: "purchase_sb", description: "Purchased 1500 Swap Bucks", createdAt: daysAgo(10) },
    { userId: user2.id, amount: 10, type: "welcome_bonus", description: "Welcome bonus for joining Swapedly", createdAt: daysAgo(60) },
    { userId: user2.id, amount: 500, type: "referral_bonus", description: "Referral bonus for using a referral code", createdAt: daysAgo(60) },
    { userId: user2.id, amount: 5, type: "listing_credit", description: "Listing credit for creating a listing", createdAt: daysAgo(55) },
    { userId: user2.id, amount: 510, type: "sale", description: "Sale of Vintage Camera", createdAt: daysAgo(15) },
    { userId: user2.id, amount: 2000, type: "purchase_sb", description: "Purchased 2000 Swap Bucks", createdAt: daysAgo(5) },
    { userId: user3.id, amount: 10, type: "welcome_bonus", description: "Welcome bonus for joining Swapedly", createdAt: daysAgo(30) },
    { userId: user3.id, amount: 5, type: "listing_credit", description: "Listing credit for creating a listing", createdAt: daysAgo(25) },
    { userId: user3.id, amount: 1000, type: "purchase_sb", description: "Purchased 1000 Swap Bucks", createdAt: daysAgo(20) },
    { userId: user3.id, amount: -260, type: "purchase", description: "Purchased Running Shoes", createdAt: daysAgo(10) },
  ];
  for (const entry of ledgerEntries) {
    db.insert(walletLedger).values(entry).run();
  }

  // ===== LISTINGS =====
  const listingsData = [
    {
      sellerId: user1.id,
      title: "iPhone 13 Pro - Excellent Condition",
      description: "Barely used iPhone 13 Pro, 256GB, Pacific Blue. Comes with original box, charger, and a protective case. Battery health at 96%. No scratches or dents.",
      price: 450,
      category: "Electronics",
      subcategory: "Phones",
      condition: "like_new",
      tags: JSON.stringify(["iphone", "apple", "smartphone"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: true, shipping: true, shippingCost: 15 }),
      status: "active",
      views: 42,
      createdAt: daysAgo(85),
      updatedAt: daysAgo(85),
    },
    {
      sellerId: user1.id,
      title: "Handmade Ceramic Vase Set",
      description: "Beautiful set of 3 handmade ceramic vases. Perfect for home decor. Various sizes: 8\", 6\", and 4\" tall. Matte finish in earth tones.",
      price: 85,
      category: "Home & Garden",
      subcategory: "Decor",
      condition: "new",
      tags: JSON.stringify(["ceramic", "vase", "handmade", "decor"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: true, shipping: true, shippingCost: 12 }),
      status: "active",
      views: 28,
      createdAt: daysAgo(70),
      updatedAt: daysAgo(70),
    },
    {
      sellerId: user2.id,
      title: "Vintage Canon AE-1 Camera",
      description: "Classic Canon AE-1 film camera from the 1980s. Fully functional with a 50mm f/1.8 lens. Great for photography enthusiasts and collectors. Minor cosmetic wear.",
      price: 510,
      category: "Electronics",
      subcategory: "Cameras",
      condition: "good",
      tags: JSON.stringify(["canon", "vintage", "film", "camera"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: false, shipping: true, shippingCost: 20 }),
      status: "sold",
      views: 156,
      createdAt: daysAgo(55),
      updatedAt: daysAgo(20),
    },
    {
      sellerId: user2.id,
      title: "Mechanical Keyboard - Cherry MX Blue",
      description: "Custom mechanical keyboard with Cherry MX Blue switches. Full-size layout with RGB backlighting. PBT keycaps. USB-C connection.",
      price: 120,
      category: "Electronics",
      subcategory: "Computer Accessories",
      condition: "good",
      tags: JSON.stringify(["keyboard", "mechanical", "gaming", "cherry-mx"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: true, shipping: true, shippingCost: 10 }),
      status: "active",
      views: 67,
      createdAt: daysAgo(45),
      updatedAt: daysAgo(45),
    },
    {
      sellerId: user2.id,
      title: "PlayStation 5 Controller - Black",
      description: "DualSense PS5 controller in Midnight Black. Works perfectly. Used for about 6 months. No drift issues.",
      price: 45,
      category: "Gaming",
      subcategory: "Controllers",
      condition: "good",
      tags: JSON.stringify(["ps5", "playstation", "controller", "gaming"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: true, shipping: true, shippingCost: 8 }),
      status: "active",
      views: 34,
      createdAt: daysAgo(40),
      updatedAt: daysAgo(40),
    },
    {
      sellerId: user3.id,
      title: "Nike Air Max 90 - Size 10",
      description: "Nike Air Max 90 running shoes, size 10 US. Infrared colorway. Worn only a few times, excellent condition. Original box included.",
      price: 260,
      category: "Fashion",
      subcategory: "Shoes",
      condition: "like_new",
      tags: JSON.stringify(["nike", "shoes", "sneakers", "air-max"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: true, shipping: true, shippingCost: 12 }),
      status: "sold",
      views: 89,
      createdAt: daysAgo(25),
      updatedAt: daysAgo(10),
    },
    {
      sellerId: user3.id,
      title: "Patagonia Down Jacket - Medium",
      description: "Patagonia Nano Puff Down Jacket, Men's Medium. Black color. Excellent warmth-to-weight ratio. Used for one season, still in great shape.",
      price: 150,
      category: "Fashion",
      subcategory: "Outerwear",
      condition: "good",
      tags: JSON.stringify(["patagonia", "jacket", "outdoor", "winter"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: false, shipping: true, shippingCost: 10 }),
      status: "active",
      views: 45,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
    },
    {
      sellerId: user1.id,
      title: "Complete Harry Potter Book Set",
      description: "All 7 Harry Potter books, hardcover edition. Very good condition with minor shelf wear. A must-have for any HP fan!",
      price: 95,
      category: "Books & Media",
      subcategory: "Books",
      condition: "good",
      tags: JSON.stringify(["harry-potter", "books", "collection", "fantasy"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: true, shipping: true, shippingCost: 15 }),
      status: "active",
      views: 73,
      createdAt: daysAgo(15),
      updatedAt: daysAgo(15),
    },
    {
      sellerId: user2.id,
      title: "Yamaha Acoustic Guitar",
      description: "Yamaha FG800 acoustic guitar. Solid spruce top, nato back and sides. Rich, full sound. Comes with a padded gig bag, capo, and extra strings.",
      price: 200,
      category: "Musical Instruments",
      subcategory: "Guitars",
      condition: "good",
      tags: JSON.stringify(["yamaha", "guitar", "acoustic", "music"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: true, shipping: false }),
      status: "active",
      views: 51,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
    },
    {
      sellerId: user3.id,
      title: "Dyson V11 Vacuum Cleaner",
      description: "Dyson V11 Absolute cordless vacuum. All attachments included. LCD screen shows real-time run time. Recently replaced battery.",
      price: 350,
      category: "Home & Garden",
      subcategory: "Appliances",
      condition: "good",
      tags: JSON.stringify(["dyson", "vacuum", "home", "cleaning"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: true, shipping: true, shippingCost: 25 }),
      status: "active",
      views: 38,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    },
    {
      sellerId: user1.id,
      title: "Lego Star Wars Millennium Falcon",
      description: "Lego Star Wars Millennium Falcon set #75257. Complete with all minifigures. Built once and displayed. All pieces accounted for, includes instructions.",
      price: 130,
      category: "Toys & Hobbies",
      subcategory: "Building Sets",
      condition: "like_new",
      tags: JSON.stringify(["lego", "star-wars", "millennium-falcon", "collectible"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: true, shipping: true, shippingCost: 15 }),
      status: "active",
      views: 62,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
    {
      sellerId: user2.id,
      title: "Original Oil Painting - Mountain Sunset",
      description: "Original oil painting on 24x36 canvas. Mountain sunset landscape. Signed by the artist. Perfect for living room or office. Framed and ready to hang.",
      price: 180,
      category: "Art & Collectibles",
      subcategory: "Paintings",
      condition: "new",
      tags: JSON.stringify(["painting", "oil", "art", "landscape"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: true, shipping: true, shippingCost: 30 }),
      status: "active",
      views: 29,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      sellerId: user3.id,
      title: "Road Bike - Specialized Allez",
      description: "Specialized Allez Sport road bike, 56cm frame. Shimano Claris groupset. Great entry-level road bike. Some normal wear from use but mechanically perfect.",
      price: 480,
      category: "Sports & Outdoors",
      subcategory: "Cycling",
      condition: "fair",
      tags: JSON.stringify(["bike", "road-bike", "specialized", "cycling"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: true, shipping: false }),
      status: "active",
      views: 44,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      sellerId: user1.id,
      title: "Car Floor Mats - Universal Fit",
      description: "Heavy-duty rubber car floor mats. Universal fit for most sedans and SUVs. Set of 4 (front and rear). Black color, all-weather protection.",
      price: 35,
      category: "Auto & Parts",
      subcategory: "Interior",
      condition: "new",
      tags: JSON.stringify(["car", "floor-mats", "auto", "accessories"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=600"]),
      deliveryOptions: JSON.stringify({ localPickup: true, shipping: true, shippingCost: 10 }),
      status: "active",
      views: 15,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ];

  const insertedListings: any[] = [];
  for (const l of listingsData) {
    const inserted = db.insert(listings).values(l).returning().get();
    insertedListings.push(inserted);
  }

  // ===== TRANSACTIONS =====
  // Transaction 1: user1 bought the Vintage Camera (listing index 2) from user2
  const txn1 = db.insert(transactions).values({
    listingId: insertedListings[2].id,
    buyerId: user1.id,
    sellerId: user2.id,
    amount: 510,
    buyerFeeUsd: 20,
    sellerFeeUsd: 20,
    status: "completed",
    deliveryMethod: "shipping",
    trackingNumber: "1Z999AA10123456784",
    completedAt: daysAgo(15),
    createdAt: daysAgo(20),
  }).returning().get();

  // Transaction 2: user1 bought the Running Shoes (listing index 5) from user3
  const txn2 = db.insert(transactions).values({
    listingId: insertedListings[5].id,
    buyerId: user1.id,
    sellerId: user3.id,
    amount: 260,
    buyerFeeUsd: 20,
    sellerFeeUsd: 20,
    status: "shipped",
    deliveryMethod: "shipping",
    trackingNumber: "9400111899223100001",
    createdAt: daysAgo(10),
  }).returning().get();

  // ===== CONVERSATIONS & MESSAGES =====
  const conv1 = db.insert(conversations).values({
    participant1Id: user1.id,
    participant2Id: user2.id,
    listingId: insertedListings[2].id,
    lastMessageAt: daysAgo(18),
    createdAt: daysAgo(22),
  }).returning().get();

  const conv1Messages = [
    { conversationId: conv1.id, senderId: user1.id, content: "Hi! Is the Canon AE-1 still available?", isRead: true, createdAt: daysAgo(22) },
    { conversationId: conv1.id, senderId: user2.id, content: "Yes it is! It's in great working condition.", isRead: true, createdAt: daysAgo(22) },
    { conversationId: conv1.id, senderId: user1.id, content: "Does it come with any film?", isRead: true, createdAt: daysAgo(21) },
    { conversationId: conv1.id, senderId: user2.id, content: "I can throw in 2 rolls of Kodak Portra 400!", isRead: true, createdAt: daysAgo(21) },
    { conversationId: conv1.id, senderId: user1.id, content: "Perfect! I'll buy it now.", isRead: true, createdAt: daysAgo(20) },
    { conversationId: conv1.id, senderId: user2.id, content: "Great! I'll ship it out tomorrow.", isRead: true, createdAt: daysAgo(18) },
  ];
  for (const m of conv1Messages) {
    db.insert(messages).values(m).run();
  }

  const conv2 = db.insert(conversations).values({
    participant1Id: user1.id,
    participant2Id: user3.id,
    listingId: insertedListings[5].id,
    lastMessageAt: daysAgo(9),
    createdAt: daysAgo(11),
  }).returning().get();

  const conv2Messages = [
    { conversationId: conv2.id, senderId: user1.id, content: "Are these shoes true to size?", isRead: true, createdAt: daysAgo(11) },
    { conversationId: conv2.id, senderId: user3.id, content: "Yes, they fit exactly as expected for size 10.", isRead: true, createdAt: daysAgo(11) },
    { conversationId: conv2.id, senderId: user1.id, content: "How's the shipping coming along?", isRead: false, createdAt: daysAgo(9) },
  ];
  for (const m of conv2Messages) {
    db.insert(messages).values(m).run();
  }

  // ===== REVIEWS =====
  db.insert(reviews).values({
    transactionId: txn1.id,
    reviewerId: user1.id,
    revieweeId: user2.id,
    rating: 5,
    comment: "Amazing camera, exactly as described! Mike was super responsive and shipped quickly. Highly recommend!",
    createdAt: daysAgo(14),
  }).run();

  db.insert(reviews).values({
    transactionId: txn1.id,
    reviewerId: user2.id,
    revieweeId: user1.id,
    rating: 5,
    comment: "Great buyer! Quick payment, smooth transaction.",
    createdAt: daysAgo(13),
  }).run();

  // ===== QUESTIONS =====
  db.insert(questions).values({
    listingId: insertedListings[3].id,
    askerId: user3.id,
    question: "Does this keyboard support Mac layout?",
    answer: "Yes! It works with both Windows and Mac. The keycaps show both layouts.",
    answeredAt: daysAgo(38),
    createdAt: daysAgo(40),
  }).run();

  db.insert(questions).values({
    listingId: insertedListings[0].id,
    askerId: user2.id,
    question: "Is the battery health still above 90%?",
    answer: "Yes, it's currently at 96% battery health!",
    answeredAt: daysAgo(78),
    createdAt: daysAgo(80),
  }).run();

  db.insert(questions).values({
    listingId: insertedListings[8].id,
    askerId: user1.id,
    question: "Would you consider including a guitar strap?",
    answer: null,
    answeredAt: null,
    createdAt: daysAgo(10),
  }).run();

  // ===== EARN TASKS =====
  const earnTasksData = [
    {
      title: "Refer a Friend",
      description: "Share your referral code and earn 500 SB when someone signs up!",
      reward: 500,
      type: "referral",
      icon: "Users",
      externalUrl: null,
      isActive: true,
      maxCompletions: null,
    },
    {
      title: "Complete a Survey",
      description: "Share your opinion on products and earn Swap Bucks. Takes about 5 minutes.",
      reward: 25,
      type: "survey",
      icon: "ClipboardList",
      externalUrl: "https://example.com/survey",
      isActive: true,
      maxCompletions: null,
    },
    {
      title: "Download ShopSmart App",
      description: "Download and sign up for the ShopSmart app to earn Swap Bucks instantly.",
      reward: 50,
      type: "app_download",
      icon: "Download",
      externalUrl: "https://example.com/app",
      isActive: true,
      maxCompletions: 1,
    },
    {
      title: "Share on Social Media",
      description: "Share your Swapedly profile or a listing on social media and earn SB.",
      reward: 10,
      type: "social_share",
      icon: "Share2",
      externalUrl: null,
      isActive: true,
      maxCompletions: null,
    },
    {
      title: "Write a Product Review",
      description: "Write a detailed review for an advertiser's product and earn Swap Bucks.",
      reward: 35,
      type: "review_offer",
      icon: "Star",
      externalUrl: "https://example.com/review",
      isActive: true,
      maxCompletions: null,
    },
    {
      title: "Purchase Swap Bucks",
      description: "Buy Swap Bucks directly with real money. $1 = 1 SB.",
      reward: 0,
      type: "referral",
      icon: "DollarSign",
      externalUrl: null,
      isActive: true,
      maxCompletions: null,
    },
  ];
  for (const task of earnTasksData) {
    db.insert(earnTasks).values(task).run();
  }

  // A few earn completions
  db.insert(earnCompletions).values({ userId: user1.id, taskId: 2, completedAt: daysAgo(50) }).run();
  db.insert(earnCompletions).values({ userId: user2.id, taskId: 3, completedAt: daysAgo(40) }).run();

  // ===== NOTIFICATIONS =====
  const notificationsData = [
    { userId: user1.id, type: "system", title: "Welcome to Swapedly!", body: "You've earned 10 Swap Bucks as a welcome bonus.", link: "/dashboard", isRead: true, createdAt: daysAgo(90) },
    { userId: user1.id, type: "referral", title: "Referral Bonus!", body: "mike_swaps joined using your referral code. You earned 500 SB!", link: "/wallet", isRead: true, createdAt: daysAgo(60) },
    { userId: user1.id, type: "purchase", title: "Purchase Confirmed", body: "You purchased 'Vintage Canon AE-1 Camera' for 510 SB", link: "/transactions", isRead: true, createdAt: daysAgo(20) },
    { userId: user1.id, type: "shipping_update", title: "Item Shipped!", body: "Your Vintage Canon AE-1 Camera has been shipped (Tracking: 1Z999AA10123456784)", link: "/transactions", isRead: true, createdAt: daysAgo(18) },
    { userId: user1.id, type: "review", title: "New Review", body: "mike_swaps left you a 5-star review", link: "/profile", isRead: false, createdAt: daysAgo(13) },
    { userId: user2.id, type: "system", title: "Welcome to Swapedly!", body: "You've earned 10 Swap Bucks as a welcome bonus.", link: "/dashboard", isRead: true, createdAt: daysAgo(60) },
    { userId: user2.id, type: "sale", title: "You made a sale!", body: "sarah_trades purchased 'Vintage Canon AE-1 Camera' for 510 SB", link: "/transactions", isRead: true, createdAt: daysAgo(20) },
    { userId: user2.id, type: "sale", title: "Payment Released!", body: "510 SB has been released to your wallet", link: "/wallet", isRead: false, createdAt: daysAgo(15) },
    { userId: user3.id, type: "system", title: "Welcome to Swapedly!", body: "You've earned 10 Swap Bucks as a welcome bonus.", link: "/dashboard", isRead: true, createdAt: daysAgo(30) },
    { userId: user3.id, type: "sale", title: "You made a sale!", body: "sarah_trades purchased 'Nike Air Max 90' for 260 SB", link: "/transactions", isRead: false, createdAt: daysAgo(10) },
  ];
  for (const n of notificationsData) {
    db.insert(notifications).values(n).run();
  }

  // ===== FAVORITES =====
  db.insert(favorites).values({ userId: user1.id, listingId: insertedListings[3].id, createdAt: daysAgo(30) }).run();
  db.insert(favorites).values({ userId: user1.id, listingId: insertedListings[8].id, createdAt: daysAgo(10) }).run();
  db.insert(favorites).values({ userId: user2.id, listingId: insertedListings[0].id, createdAt: daysAgo(40) }).run();
  db.insert(favorites).values({ userId: user3.id, listingId: insertedListings[7].id, createdAt: daysAgo(5) }).run();
  db.insert(favorites).values({ userId: user3.id, listingId: insertedListings[10].id, createdAt: daysAgo(3) }).run();

  console.log("Database seeded successfully!");
  console.log(`Created ${4} users, ${insertedListings.length} listings, ${2} transactions, ${earnTasksData.length} earn tasks`);
}
