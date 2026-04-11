import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/layouts";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { Link } from "wouter";
import {
  ArrowRight, Package, Coins, ShoppingBag, Share2, Crown,
  Shield, Users, Star, CheckCircle, Zap, Gift, MapPin, Truck,
} from "lucide-react";

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing">
              <Button variant="ghost" size="sm">Pricing</Button>
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
      <section className="pt-28 pb-16 px-4 sm:px-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 max-w-4xl mx-auto">
          Swapedly — The Smart Way to Trade Your Stuff
        </h1>
        <p className="mt-5 text-xl text-muted-foreground max-w-2xl mx-auto">
          Swapedly is an online marketplace where you list items you no longer need, earn virtual Swap Bucks, and use them to get things you actually want — no cash exchanged between users.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup">
            <Button size="lg" className="rounded-xl gap-2 px-8 h-12">
              <Gift className="h-4 w-4" />
              Sign Up Free — Get 10 Swap Bucks
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="rounded-xl px-8 h-12">
              View Pricing
            </Button>
          </Link>
        </div>
      </section>

      {/* What is Swapedly */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">What is Swapedly?</h2>
          <p className="text-center text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
            Swapedly is a peer-to-peer marketplace built around a virtual currency system. Instead of buyers paying sellers directly in cash, all purchases are made using <strong>Swap Bucks (SB)</strong> — an in-app currency that users earn by listing and selling items.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Package,
                title: "List Your Items",
                desc: "Take photos of items you want to sell and publish listings in minutes. Set your price in Swap Bucks. Free accounts use purchase credits ($0.49 each); Swapedly Plus members list for free.",
                color: "bg-blue-100 text-blue-600",
              },
              {
                icon: Coins,
                title: "Earn Swap Bucks",
                desc: "When your item sells, you receive Swap Bucks. You also earn SB by completing tasks, referring friends, sharing listings on social media, and through our welcome bonus.",
                color: "bg-yellow-100 text-yellow-600",
              },
              {
                icon: ShoppingBag,
                title: "Shop the Marketplace",
                desc: "Browse thousands of items listed by other users and buy them using your Swap Bucks balance. No cash changes hands between buyers and sellers.",
                color: "bg-green-100 text-green-600",
              },
            ].map((item) => (
              <Card key={item.title} className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-7">
                  <div className={`h-12 w-12 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Platform Features</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: Zap, title: "Fast Listing Creation", desc: "Create a listing with photos, description, condition, and delivery options in under 2 minutes." },
              { icon: MapPin, title: "Local Pickup & Shipping", desc: "Sellers choose whether to offer local pickup, shipping, or both. Buyers see delivery options before purchasing." },
              { icon: Share2, title: "Share & Earn", desc: "Share your listings on Instagram, Facebook, TikTok, or Pinterest and earn 5 Swap Bucks per verified post." },
              { icon: Users, title: "Referral Program", desc: "Invite friends with your unique referral code and earn 1 Swap Buck for every person who joins through your link." },
              { icon: Shield, title: "Dispute Resolution", desc: "Built-in dispute system for handling issues between buyers and sellers. Swapedly mediates and resolves fairly." },
              { icon: Star, title: "Ratings & Reviews", desc: "After each transaction, buyers and sellers can rate each other. Build your reputation as a trusted trader." },
              { icon: Crown, title: "Swapedly Plus Membership", desc: "Optional $9.99/month subscription for unlimited free listings, 1.5× SB earnings, and 5 highlighted listings per month." },
              { icon: Truck, title: "Transaction Fees", desc: "A 10% fee (capped at $20 USD) is charged to both buyer and seller in real currency upon transaction completion." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-5 rounded-xl border">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Sell (for Paddle) */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">What Swapedly Sells</h2>
          <p className="text-center text-muted-foreground mb-10">
            Swapedly offers two paid products. All payments are processed by Paddle.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="rounded-2xl border-2 border-primary">
              <CardContent className="p-7">
                <Crown className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Swapedly Plus</h3>
                <p className="text-3xl font-bold text-primary mb-1">$9.99<span className="text-lg font-normal text-muted-foreground">/month</span></p>
                <p className="text-sm text-muted-foreground mb-4">Recurring monthly subscription. Cancel anytime.</p>
                <ul className="space-y-2">
                  {[
                    "Unlimited free listings (no credits needed)",
                    "1.5× Swap Bucks multiplier on all earnings",
                    "5 highlighted listings per month",
                    "Plus badge on profile",
                    "Priority customer support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-7">
                <Package className="h-8 w-8 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold mb-2">Purchase Credits</h3>
                <p className="text-sm text-muted-foreground mb-4">One-time purchases. Free accounts use credits to publish listings ($0.49 per listing).</p>
                <ul className="space-y-3">
                  {[
                    { qty: "10 credits", price: "$4.90", note: "Best for new users" },
                    { qty: "25 credits", price: "$12.25", note: "Most popular" },
                    { qty: "50 credits", price: "$24.50", note: "Best value" },
                  ].map((p) => (
                    <li key={p.qty} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <span className="font-medium text-sm">{p.qty}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.note}</span>
                      </div>
                      <span className="font-bold text-sm">{p.price}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            <Shield className="h-3.5 w-3.5 inline mr-1" />
            All payments processed securely by Paddle. See our <Link href="/refunds" className="text-primary hover:underline">Refund Policy</Link> and <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 text-center">
        <h2 className="text-3xl font-bold">Ready to start swapping?</h2>
        <p className="mt-3 text-muted-foreground text-lg">Join free today and get 10 Swap Bucks on us.</p>
        <Link href="/signup">
          <Button size="lg" className="mt-6 rounded-xl px-8 h-12 gap-2">
            <Gift className="h-4 w-4" />
            Create Free Account
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap justify-center">
            <Link href="/" className="hover:text-primary">Home</Link>
            <Link href="/product" className="hover:text-primary font-medium text-foreground">Product</Link>
            <Link href="/pricing" className="hover:text-primary">Pricing</Link>
            <Link href="/terms" className="hover:text-primary">Terms</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
            <Link href="/refunds" className="hover:text-primary">Refunds</Link>
          </div>
          <PerplexityAttribution />
        </div>
      </footer>
    </div>
  );
}
