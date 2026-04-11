import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/layouts";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { Link } from "wouter";
import {
  CheckCircle, XCircle, Crown, Package, Coins, Star, ArrowRight,
  Sparkles, Shield, Zap, Gift,
} from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">Home</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="rounded-xl gap-1.5">
                Get Started Free <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-12 px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-5">
          <Sparkles className="h-4 w-4" />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 max-w-3xl mx-auto">
          Start free. Upgrade when you're ready.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
          Swapedly is free to join and list. Upgrade to Plus for unlimited purchases, bonus Swap Bucks, and featured placement in the marketplace.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">

          {/* Free */}
          <Card className="rounded-2xl border-2">
            <CardContent className="p-8">
              <div className="mb-6">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Free</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">List for free · Buy with Purchase Credits</p>
              </div>

              <Link href="/signup">
                <Button variant="outline" className="w-full rounded-xl h-11 mb-8">
                  Get Started Free
                </Button>
              </Link>

              <ul className="space-y-3">
                {[
                  { text: "10 Swap Bucks welcome bonus", ok: true },
                  { text: "$0.49 per purchase credit (min $5)", ok: true },
                  { text: "1× SB earnings on all tasks", ok: true },
                  { text: "Browse & buy in the marketplace", ok: true },
                  { text: "Referral rewards", ok: true },
                  { text: "Share & earn on social media", ok: true },
                  { text: "Highlighted listings", ok: false },
                  { text: "1.5× SB bonus multiplier", ok: false },
                  { text: "Unlimited free listings", ok: true },
                  { text: "Priority support", ok: false },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    {item.ok
                      ? <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      : <XCircle className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />}
                    <span className={item.ok ? "text-sm" : "text-sm text-muted-foreground"}>{item.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Plus */}
          <Card className="rounded-2xl border-2 border-primary relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              RECOMMENDED
            </div>
            <CardContent className="p-8">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-primary uppercase tracking-wide">Swapedly Plus</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold">$9.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Unlimited listings & purchases, premium perks</p>
              </div>

              <Link href="/signup">
                <Button className="w-full rounded-xl h-11 mb-8 gap-2">
                  <Sparkles className="h-4 w-4" />
                  Upgrade to Plus
                </Button>
              </Link>

              <ul className="space-y-3">
                {[
                  { text: "Everything in Free", ok: true },
                  { text: "Unlimited free listings — no credits needed", ok: true },
                  { text: "1.5× SB multiplier on all earnings", ok: true },
                  { text: "5 highlighted listings per month", ok: true },
                  { text: "Plus badge on your profile", ok: true },
                  { text: "Priority customer support", ok: true },
                  { text: "Early access to new features", ok: true },
                  { text: "Cancel anytime — no contracts", ok: true },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Purchase Credits */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Purchase Credits</h2>
            <p className="mt-3 text-muted-foreground text-lg">
              Free accounts need Purchase Credits to buy items. $0.49 per purchase. Listing is always free!
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { qty: 10, price: "$4.90", perCredit: "$0.49", popular: false },
              { qty: 25, price: "$12.25", perCredit: "$0.49", popular: true },
              { qty: 50, price: "$24.50", perCredit: "$0.49", popular: false },
            ].map((pack) => (
              <Card key={pack.qty} className={`rounded-2xl ${pack.popular ? "border-primary border-2" : ""}`}>
                <CardContent className="p-6 text-center">
                  {pack.popular && (
                    <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full mb-3">MOST POPULAR</span>
                  )}
                  <p className="text-3xl font-bold mb-1">{pack.qty}</p>
                  <p className="text-sm text-muted-foreground mb-3">purchase credits</p>
                  <p className="text-2xl font-bold text-primary">{pack.price}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pack.perCredit} per credit</p>
                  <Link href="/signup">
                    <Button variant={pack.popular ? "default" : "outline"} size="sm" className="w-full rounded-xl mt-4">
                      Buy Credits
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            <Shield className="h-3.5 w-3.5 inline mr-1" />
            Swapedly Plus members never need Purchase Credits — make unlimited purchases included.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "What are Swap Bucks?",
                a: "Swap Bucks (SB) are Swapedly's in-app currency. You earn them by listing items, completing tasks, referring friends, and sharing on social media. Use them to buy items in the marketplace — no cash needed.",
              },
              {
                q: "What are purchase credits?",
                a: "Purchase Credits let free account holders buy items in the marketplace. Each credit costs $0.49 and covers one purchase transaction. Listing items is always free for everyone. Swapedly Plus members never need Purchase Credits.",
              },
              {
                q: "What is a highlighted listing?",
                a: "Highlighted listings appear with a golden 'FEATURED' badge in the marketplace, making them stand out and get more views. Swapedly Plus members get 5 highlights per month included.",
              },
              {
                q: "Can I cancel my Plus membership?",
                a: "Yes, anytime. Cancel in your account settings. You'll keep Plus benefits until the end of your current billing period. No contracts, no penalties.",
              },
              {
                q: "How do transaction fees work?",
                a: "When an item sells, a 10% fee (capped at $20) is charged in USD separately to both the buyer and seller. This is how Swapedly sustains the platform. The Swap Bucks transaction itself has no extra cost.",
              },
              {
                q: "Is my payment information secure?",
                a: "Yes. Payments are processed by Paddle, a certified Merchant of Record. Swapedly never stores your card details. Paddle handles all tax compliance and payment security.",
              },
            ].map((item) => (
              <div key={item.q} className="border-b pb-6">
                <h3 className="font-semibold text-base mb-2">{item.q}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-br from-[#5A45FF] to-[#FF4D6D] text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold">Ready to start swapping?</h2>
          <p className="mt-3 text-white/80 text-lg">Join free today and get 10 Swap Bucks on us.</p>
          <Link href="/signup">
            <Button size="lg" className="mt-8 bg-white text-primary hover:bg-white/90 rounded-xl px-8 h-12 gap-2">
              <Gift className="h-4 w-4" />
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">Home</Link>
            <Link href="/pricing" className="hover:text-primary">Pricing</Link>
            <Link href="/signup" className="hover:text-primary">Sign Up</Link>
          </div>
          <PerplexityAttribution />
        </div>
      </footer>
    </div>
  );
}
