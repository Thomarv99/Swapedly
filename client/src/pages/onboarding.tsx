/**
 * Post-signup onboarding cards — teaches new users how Swapedly works
 * Shown after registration (both regular and gift card)
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/layouts";
import {
  Gift, Coins, ShoppingBag, Shield, Users, Star, Zap, ArrowRight,
  ChevronLeft, ChevronRight,
} from "lucide-react";

const CARDS = [
  {
    icon: Gift,
    color: "from-[#5A45FF] to-[#7B68EE]",
    iconColor: "text-yellow-300",
    title: "Welcome to Swapedly! 🎉",
    body: "Swapedly is the marketplace where you trade your stuff for Swap Bucks (SB) — no cash needed between buyers and sellers. List items you don't need, earn SB, and use them to get what you actually want.",
    highlight: "Let's show you around!",
  },
  {
    icon: Coins,
    color: "from-yellow-500 to-amber-600",
    iconColor: "text-white",
    title: "What Are Swap Bucks?",
    body: "Swap Bucks (SB) are Swapedly's currency. Every item in the marketplace is priced in SB. Earn them by listing items, referring friends, and completing tasks. 1 SB = $1 USD value.",
    highlight: "1 SB = $1 USD value",
  },
  {
    icon: ShoppingBag,
    color: "from-pink-500 to-rose-600",
    iconColor: "text-white",
    title: "How Buying Works 🛍️",
    body: "Browse the marketplace, find something you love, and buy it with your Swap Bucks. The seller gets notified, accepts your request, and you coordinate the exchange — local pickup or shipped.",
    highlight: "No cash changes hands",
  },
  {
    icon: Zap,
    color: "from-green-500 to-emerald-600",
    iconColor: "text-white",
    title: "How Selling Works 📸",
    body: "Take a photo of anything around your home, set a price in SB, and list it in under 2 minutes. When someone buys it, their SB transfers to your wallet after the exchange is confirmed.",
    highlight: "List anything in 2 minutes",
  },
  {
    icon: Shield,
    color: "from-slate-700 to-slate-900",
    iconColor: "text-green-400",
    title: "Your SB is Always Protected 🔒",
    body: "When a buyer purchases your item, their SB is held in escrow until both parties confirm the exchange happened. No SB moves until you say the deal is done.",
    highlight: "Escrow protection on every trade",
  },
  {
    icon: Users,
    color: "from-blue-500 to-indigo-600",
    iconColor: "text-white",
    title: "Share & Earn SB 🙌",
    body: "Every friend who signs up using your referral link earns you SB. Share on Facebook, send gift cards to friends — the more people you invite, the more you earn.",
    highlight: "Earn SB for every friend who joins",
  },
  {
    icon: Star,
    color: "from-orange-500 to-amber-500",
    iconColor: "text-white",
    title: "Swapedly Plus ⭐",
    body: "Swapedly Plus ($9.99/month) removes purchase credit requirements, gives you 1.5× SB on every sale, and lets you feature your listings at the top of the marketplace.",
    highlight: "Upgrade anytime from your dashboard",
  },
  {
    icon: Zap,
    color: "from-[#5A45FF] to-[#FF4D6D]",
    iconColor: "text-white",
    title: "Let's Get You Started! 🚀",
    body: "Your dashboard has a Getting Started checklist to help you earn your first Swap Bucks. Complete your profile, list an item, share with friends — each task earns you SB toward unlocking the marketplace!",
    highlight: "Head to your dashboard to start earning!",
  },
];

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const [cardIndex, setCardIndex] = useState(0);

  const card = CARDS[cardIndex];
  const Icon = card.icon;
  const isLast = cardIndex === CARDS.length - 1;
  const progress = ((cardIndex + 1) / CARDS.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="p-5 flex justify-center border-b bg-white">
        <Logo />
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-4">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground shrink-0">{cardIndex + 1} / {CARDS.length}</span>
          </div>

          {/* Card */}
          <div className={`rounded-3xl bg-gradient-to-br ${card.color} p-8 text-white shadow-xl min-h-[320px] flex flex-col justify-between`}>
            <div>
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center mb-5">
                <Icon className={`h-7 w-7 ${card.iconColor}`} />
              </div>
              <h2 className="text-2xl font-black mb-3">{card.title}</h2>
              <p className="text-white/85 text-base leading-relaxed">{card.body}</p>
            </div>
            <div className="mt-6 bg-white/15 rounded-xl px-4 py-2.5">
              <p className="text-sm font-semibold text-white/90">{card.highlight}</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {cardIndex > 0 && (
              <Button variant="outline" className="rounded-xl gap-1.5 flex-1" onClick={() => setCardIndex(i => i - 1)}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
            <Button
              className="rounded-xl gap-1.5 flex-1 font-semibold"
              onClick={() => isLast ? navigate("/dashboard") : setCardIndex(i => i + 1)}
              data-testid={isLast ? "finish-onboarding-btn" : "next-card-btn"}
            >
              {isLast ? <>Go to Dashboard <Zap className="h-4 w-4" /></> : <>Next <ChevronRight className="h-4 w-4" /></>}
            </Button>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5">
            {CARDS.map((_, i) => (
              <button key={i} onClick={() => setCardIndex(i)}
                className={`h-2 rounded-full transition-all ${i === cardIndex ? "w-6 bg-primary" : "w-2 bg-slate-300"}`}
              />
            ))}
          </div>

          {/* Skip */}
          <div className="text-center">
            <button onClick={() => navigate("/dashboard")} className="text-xs text-muted-foreground hover:text-foreground">
              Skip intro →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
