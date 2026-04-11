import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/layouts";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import {
  ArrowLeftRight, Mail, Lock, Eye, EyeOff, Coins, ShoppingBag, Users,
  TrendingUp, ArrowRight, CheckCircle, Star, Sparkles, Gift, Shield,
  Crown, Zap, Package, Share2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { resolveImageUrl } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Listing } from "@shared/schema";

export default function WelcomePage() {
  const { login, loginPending, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showLogin, setShowLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Track referral link click when ?ref=CODE is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      // Store for signup form pre-fill
      sessionStorage.setItem("referralCode", ref);
      // Fire tracking event
      fetch("/api/referral/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: ref }),
      }).catch(() => {}); // fire and forget
    }
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string; password: string }>();

  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      await login(data);
      navigate("/dashboard");
    } catch (e: any) {
      toast({ title: "Login failed", description: e.message, variant: "destructive" });
    }
  };


  const handleGoogleSignIn = () => {
    const base = window.location.origin.includes("localhost") ? "http://localhost:5000" : "";
    window.location.href = `${base}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href="/leaderboard">
              <Button variant="ghost" size="sm" className="text-sm hidden sm:flex">Leaderboard</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-sm hidden sm:flex">Pricing</Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm"
              onClick={() => setShowLogin(true)}
              data-testid="login-link"
            >
              Log In
            </Button>
            <Link href="/signup">
              <Button size="sm" className="rounded-xl gap-1.5" data-testid="signup-cta-nav">
                Get Started Free
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="h-4 w-4" />
            Trade smarter, not harder
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 max-w-4xl mx-auto leading-tight">
            Swap your stuff for
            <span className="bg-gradient-to-r from-[#5A45FF] to-[#FF4D6D] bg-clip-text text-transparent"> Swap Bucks</span>
            {" "}— no cash needed
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            List items you no longer need, earn Swap Bucks, and use them to get what you actually want. 
            Join thousands of smart traders on Swapedly.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg" className="rounded-xl gap-2 px-8 h-12 text-base" data-testid="hero-signup-btn">
                Start Swapping — It's Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl px-8 h-12 text-base"
              onClick={() => {
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See How It Works
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            <Gift className="h-3.5 w-3.5 inline mr-1" />
            Get 10 free Swap Bucks when you sign up
          </p>
        </div>
      </section>

      {/* Latest Products Slider */}
      <LatestProductsSlider />

      {/* Social Proof Strip */}
      <section className="py-8 bg-gray-50 border-y">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "10K+", label: "Active Traders" },
              { value: "50K+", label: "Items Listed" },
              { value: "$0", label: "Listing Fees*" },
              { value: "4.9★", label: "User Rating" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">How Swapedly Works</h2>
            <p className="mt-3 text-muted-foreground text-lg">Three simple steps to start trading</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: Package,
                title: "List Your Items",
                desc: "Snap a photo, set your price in Swap Bucks, and publish. It takes less than 2 minutes.",
                color: "bg-blue-100 text-blue-600",
              },
              {
                step: "2",
                icon: Coins,
                title: "Earn Swap Bucks",
                desc: "When someone buys your item, you earn Swap Bucks. You also earn them by referring friends, sharing on social media, and more.",
                color: "bg-yellow-100 text-yellow-600",
              },
              {
                step: "3",
                icon: ShoppingBag,
                title: "Swap for What You Want",
                desc: "Browse the marketplace and spend your Swap Bucks on items you actually want. No cash exchanged.",
                color: "bg-green-100 text-green-600",
              },
            ].map((item) => (
              <Card key={item.step} className="rounded-2xl border-0 shadow-sm bg-gray-50/50">
                <CardContent className="p-8">
                  <div className={`h-14 w-14 rounded-2xl ${item.color} flex items-center justify-center mb-5`}>
                    <item.icon className="h-7 w-7" />
                  </div>
                  <div className="text-xs font-bold text-muted-foreground mb-2">STEP {item.step}</div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-br from-[#5A45FF] via-[#7B68EE] to-[#FF4D6D] text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Why Traders Love Swapedly</h2>
            <p className="mt-3 text-white/70 text-lg">Built for real people who want to trade smarter</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Coins, title: "No Cash Needed", desc: "Trade using Swap Bucks instead of real money. Earn them by listing items and completing tasks." },
              { icon: Shield, title: "Secure Transactions", desc: "Every trade is tracked and protected. Dispute resolution built in." },
              { icon: Share2, title: "Earn by Sharing", desc: "Share listings on social media and earn 5 SB per post. Grow the community, grow your balance." },
              { icon: Crown, title: "Plus Membership", desc: "Upgrade for unlimited listings, 1.5x SB earnings, and featured listing spots." },
              { icon: Users, title: "Local Community", desc: "Find traders in your area for easy local pickup. Or ship nationwide." },
              { icon: Zap, title: "Quick Listings", desc: "List an item in under 2 minutes. Snap, price, publish. Done." },
            ].map((item) => (
              <div key={item.title} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <item.icon className="h-8 w-8 text-white/90 mb-4" />
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-white/70 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">What Our Traders Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Sarah M.", quote: "I've saved hundreds of dollars swapping items I no longer needed. Swapedly changed how I think about trading.", rating: 5 },
              { name: "Mike T.", quote: "Listed my old gaming setup, earned enough Swap Bucks to grab a mountain bike. This app is addictive!", rating: 5 },
              { name: "Emma L.", quote: "The referral program is amazing. I've earned over 500 SB just from inviting friends. Love this community.", rating: 5 },
            ].map((t) => (
              <Card key={t.name} className="rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{t.quote}"</p>
                  <p className="font-semibold text-sm">{t.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold">Ready to Start Trading?</h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Sign up in 30 seconds. List your first items. Start earning Swap Bucks today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg" className="rounded-xl gap-2 px-8 h-12 text-base" data-testid="bottom-signup-btn">
                Create Your Free Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-500" /> Free to join</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-500" /> 10 SB welcome bonus</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-500" /> No credit card needed</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap justify-center">
            <button onClick={() => setShowLogin(true)} className="hover:text-primary">Sign In</button>
            <Link href="/signup" className="hover:text-primary">Sign Up</Link>
            <Link href="/pricing" className="hover:text-primary">Pricing</Link>
            <Link href="/terms" className="hover:text-primary">Terms</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
            <Link href="/refunds" className="hover:text-primary">Refunds</Link>
          </div>
          <PerplexityAttribution />
        </div>
      </footer>

      {/* Login Modal Overlay */}
      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowLogin(false)}>
          <Card className="w-full max-w-md mx-4 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Welcome back</h2>
                  <p className="text-sm text-muted-foreground">Sign in to your account</p>
                </div>
                <button onClick={() => setShowLogin(false)} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10 rounded-xl"
                      data-testid="login-email"
                      {...register("email", { required: "Email is required" })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 rounded-xl"
                      data-testid="login-password"
                      {...register("password", { required: "Password is required" })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-xl h-11" disabled={loginPending} data-testid="login-submit">
                  {loginPending ? "Signing in..." : "Log In"}
                </Button>
              </form>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or continue with</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 border rounded-xl h-11 text-sm font-medium hover:bg-slate-50 transition-colors"
                data-testid="google-signin-btn"
              >
                <FcGoogle className="h-5 w-5" />
                Continue with Google
              </button>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary font-medium hover:underline">
                  Sign up free
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================
// Latest Products Auto-Scrolling Slider
// ============================
function LatestProductsSlider() {
  const { data } = useQuery<{ listings: Listing[]; total: number }>({
    queryKey: ["/api/listings-landing"],
    queryFn: async () => {
      const res = await fetch("/api/listings?limit=20");
      if (!res.ok) return { listings: [], total: 0 };
      return res.json();
    },
    staleTime: 60000,
  });

  const listings = data?.listings || [];
  if (listings.length === 0) return null;

  // Duplicate the list for seamless infinite scroll
  const doubled = [...listings, ...listings];

  return (
    <section className="py-10 overflow-hidden" data-testid="product-slider">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-5">
        <p className="text-center text-sm font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 inline mr-1.5" />
          Just listed by traders like you
        </p>
      </div>
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div
          className="flex gap-4 animate-scroll"
          style={{
            width: "max-content",
            animation: `scroll ${listings.length * 3}s linear infinite`,
          }}
        >
          {doubled.map((listing, i) => {
            const images = listing.images ? JSON.parse(listing.images) : [];
            const imgSrc = images[0]
              ? resolveImageUrl(images[0])
              : "https://placehold.co/200x200/e2e8f0/94a3b8?text=No+Image";

            return (
              <div
                key={`${listing.id}-${i}`}
                className="shrink-0 w-48 rounded-xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={imgSrc}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium line-clamp-1">{listing.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Coins className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs font-bold">{listing.price} SB</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline keyframes for the scroll animation */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
