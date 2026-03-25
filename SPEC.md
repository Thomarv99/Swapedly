# Swapedly.com - Full Platform Specification

## Overview
Swapedly is an online barter marketplace where users trade physical goods using a virtual currency called **Swap Bucks (SB)**. Instead of direct item-for-item swaps, sellers list items for a SB price, and buyers purchase using SB from their wallet.

## Brand & Design System
- **Primary color**: #5A45FF (violet-indigo) with scale 50-900
- **Secondary/accent**: #FF4D6D (coral-pink)
- **Background**: #f8fafc (slate-50), white cards
- **Font**: Inter (300-700 weights)
- **Border radius**: rounded-xl, rounded-2xl, rounded-3xl
- **Shadows**: subtle card shadows, glassmorphism on hero sections
- **Logo**: fa-rotate icon in primary-500 square with rounded-xl

## Business Rules

### Swap Bucks Economy
- 1 SB = $1 USD equivalent
- Users CANNOT cash out SB to real money
- Welcome bonus: **10 SB** for new signups
- Listing credit: **5 SB** earned per listing created
- Referral bonus: **500 SB** for both referrer and referee

### Transaction Fees (USD)
- **10% of listing price**, capped at **$20 USD**
- **Both parties pay separately**: seller pays listing/sale fee, buyer pays purchase fee
- Fees are in USD, separate from Swap Bucks

### Ways to Earn SB
1. Sign up (10 SB welcome bonus)
2. Create listings (5 SB per listing)
3. Refer new members (500 SB each)
4. Complete surveys from advertisers
5. Download apps from advertisers
6. Review advertiser offers
7. Review products & post to social media
8. Purchase SB with real money

### Transaction Flow
1. Buyer clicks "Buy Now" on listing
2. SB is deducted from buyer's wallet, held in escrow
3. USD fees charged to both parties
4. Seller receives notification
5. Delivery arranged (seller ships or local pickup meetup)
6. Buyer confirms receipt
7. SB released to seller's wallet
8. Both parties can leave reviews

### Delivery Options
- **Local Pickup**: Seller and buyer arrange meetup location/time via messages
- **Shipping**: Seller ships item, provides tracking number
- Seller chooses which options they support when creating a listing

## User Roles
- **Swapper** (default): Can buy, sell, message, earn, dispute
- **Admin**: Full platform management, dispute resolution, user moderation

## Pages (14 total)

### Public Pages
1. **Welcome / Sign In** - Split layout, login form + value prop
2. **Sign Up** - Username, email, password, referral code, Google/Apple/Facebook OAuth
3. **Marketplace Browse** - Grid of listing cards, sidebar filters (category, price range, condition, tags), search, sort
4. **Listing Detail** - Image gallery, SB price, Buy Now button, seller info, Q&A, reviews, delivery options
5. **User Public Profile** - Dark header, reputation stats, active listings grid, reviews

### Authenticated Pages (with sidebar nav)
6. **Member Dashboard** - Balance widget, stats cards, activity chart, recent transactions, quick actions
7. **Wallet & Transactions** - Balance card, earned/spent chart, full transaction history, earn promo
8. **Create / Edit Listing** - Form: title, description, SB price, category, subcategory, condition, tags, images, video, delivery options
9. **Messages** - Conversation list + threaded chat with listing context
10. **Earn Swap Bucks** - Referral hero, earning options grid, earnings history
11. **Disputes** - File new dispute (transaction selector, reason, evidence), track existing disputes with timeline

### Missing Screens (to build)
12. **Admin Panel** - Platform stats, user management, listing moderation, dispute escalations, earn task management
13. **Settings / Account** - Profile editing, password change, notification preferences, linked accounts
14. **Notifications** - List of all notifications with read/unread state, click to navigate

## Navigation Structure

### Public Nav (not logged in)
- Logo | Marketplace | How it Works | Sign In | Create Account

### Authenticated Nav (top bar)
- Logo | Search bar | Homepage | Marketplace | Messages | Wallet | Dashboard | Avatar

### Dashboard Sidebar
- Dashboard
- Messages (with unread badge)
- Wallet
- My Listings
- Earn Swap Bucks
- Disputes
- Settings (NEW)
- Admin Console (admin only)

## Categories
Electronics, Gaming, Fashion, Home & Garden, Sports & Outdoors, Books & Media, Toys & Hobbies, Auto & Parts, Musical Instruments, Art & Collectibles, Services, Other

## Listing Conditions
New, Like New, Good, Fair, Poor
