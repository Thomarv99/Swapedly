import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { PublicLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  DollarSign, Users, Link2, BarChart3, CheckCircle2, ArrowRight,
  Star, Zap, Shield, Gift, TrendingUp, Share2, Copy
} from "lucide-react";

export default function AffiliatesLandingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [referrals, setReferrals] = useState([10]);

  // Estimated earnings: mix of SB (avg $5 purchase → $1.25 commission), plus some Plus subs
  const estimatedMonthly = Math.round(referrals[0] * (1.25 + 0.75 + 0.50));

  const handleApplyClick = () => {
    if (user) {
      setLocation("/affiliate/apply");
    } else {
      setLocation("/login?redirect=/affiliate/apply");
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-[#f8fafc]">
        {/* Hero Section */}
        <section
          className="relative overflow-hidden py-24 px-4"
          style={{ background: "linear-gradient(135deg, #5A45FF 0%, #7B68EE 50%, #FF4D6D 100%)" }}
        >
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
              <Star className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
              Affiliate Program — Instant Approval
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Turn your audience<br />into income
            </h1>
            <p className="text-xl md:text-2xl text-white/85 mb-4 max-w-2xl mx-auto">
              Earn <span className="font-bold text-yellow-300">25%</span> of every Swap Buck purchase your audience makes.
              Plus commissions on subscriptions and credits.
            </p>
            <p className="text-white/70 mb-10 text-base">
              No approval waitlist. No minimum audience size. Start earning in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-[#5A45FF] hover:bg-white/90 font-bold text-base px-8 py-6 rounded-2xl shadow-lg"
                onClick={handleApplyClick}
              >
                Apply Now — It's Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/50 text-white hover:bg-white/10 font-semibold text-base px-8 py-6 rounded-2xl"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                See How It Works
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-white border-b py-6 px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-[#5A45FF]">25%</p>
              <p className="text-sm text-muted-foreground">SB Purchase Commission</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#5A45FF]">$25</p>
              <p className="text-sm text-muted-foreground">Minimum Payout</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#5A45FF]">$40</p>
              <p className="text-sm text-muted-foreground">Gift Card for Your Audience</p>
            </div>
          </div>
        </section>

        {/* Commission Breakdown */}
        <section className="py-16 px-4 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Commission Rates</h2>
            <p className="text-muted-foreground text-base">Earn on every purchase your referred users make</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: <DollarSign className="h-6 w-6 text-[#5A45FF]" />,
                title: "Swap Buck Purchases",
                rate: "25%",
                description: "When your audience buys Swap Bucks — the marketplace currency — you earn 25% of the USD value.",
                highlight: true,
              },
              {
                icon: <Star className="h-6 w-6 text-[#FF4D6D]" />,
                title: "Plus Subscriptions",
                rate: "15%",
                description: "Earn 15% every time a referred user upgrades to Swapedly Plus for premium features.",
                highlight: false,
              },
              {
                icon: <Zap className="h-6 w-6 text-[#7B68EE]" />,
                title: "Purchase Credits",
                rate: "10%",
                description: "Earn 10% when referred users buy Purchase Credits to unlock listings.",
                highlight: false,
              },
            ].map((item) => (
              <Card key={item.title} className={`rounded-2xl shadow-sm border ${item.highlight ? "border-[#5A45FF]/30 bg-[#5A45FF]/5" : ""}`}>
                <CardContent className="pt-6 pb-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-xl ${item.highlight ? "bg-[#5A45FF]/10" : "bg-gray-100"}`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{item.title}</p>
                      <p className="text-2xl font-bold" style={{ color: item.highlight ? "#5A45FF" : "#374151" }}>{item.rate}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  {item.highlight && (
                    <div className="mt-3 inline-flex items-center gap-1 bg-[#5A45FF] text-white text-xs px-2.5 py-1 rounded-full font-medium">
                      <Star className="h-3 w-3 fill-white" /> Highest Rate
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Earnings Calculator */}
        <section className="py-16 px-4 bg-white border-y">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-3">Earnings Calculator</h2>
            <p className="text-muted-foreground mb-10">Estimate your monthly affiliate income</p>

            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-8 pb-8 px-8">
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-muted-foreground">Monthly Referrals</span>
                    <span className="text-lg font-bold text-[#5A45FF]">{referrals[0]} users</span>
                  </div>
                  <Slider
                    value={referrals}
                    onValueChange={setReferrals}
                    min={1}
                    max={500}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1</span>
                    <span>500</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-[#f8fafc] rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">SB Purchases</p>
                    <p className="font-bold text-[#5A45FF]">${Math.round(referrals[0] * 1.25)}</p>
                  </div>
                  <div className="bg-[#f8fafc] rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Subscriptions</p>
                    <p className="font-bold text-[#5A45FF]">${Math.round(referrals[0] * 0.75)}</p>
                  </div>
                  <div className="bg-[#f8fafc] rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Credits</p>
                    <p className="font-bold text-[#5A45FF]">${Math.round(referrals[0] * 0.50)}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-[#5A45FF] to-[#7B68EE] rounded-2xl p-5 text-white text-center">
                  <p className="text-sm font-medium opacity-80 mb-1">Estimated Monthly Earnings</p>
                  <p className="text-4xl font-bold">${estimatedMonthly}</p>
                  <p className="text-xs opacity-70 mt-1">Based on average order values</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-16 px-4 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">Three easy steps to start earning</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: <CheckCircle2 className="h-8 w-8 text-[#5A45FF]" />,
                title: "Apply Instantly",
                description: "Fill out a quick form with your platform details. You get instant access — no waiting period.",
              },
              {
                step: "2",
                icon: <Share2 className="h-8 w-8 text-[#FF4D6D]" />,
                title: "Share Your Link",
                description: "Get your custom affiliate link like swapedly.com/join/yourname. Share it in posts, bio, or videos.",
              },
              {
                step: "3",
                icon: <DollarSign className="h-8 w-8 text-[#5A45FF]" />,
                title: "Earn Commissions",
                description: "When your audience buys Swap Bucks or subscribes, you earn commissions automatically.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border flex items-center justify-center mx-auto">
                    {item.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#5A45FF] text-white text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                </div>
                <h3 className="font-semibold text-base mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Swapedly */}
        <section className="py-16 px-4 bg-white border-y">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Why Partner with Swapedly?</h2>
              <p className="text-muted-foreground">A platform your audience will actually love</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: <Gift className="h-5 w-5 text-[#FF4D6D]" />,
                  title: "$40 Free Gift Card for Your Audience",
                  description: "Every new user who signs up via your link gets $40 in Swap Bucks — making your recommendation easy to pitch.",
                },
                {
                  icon: <TrendingUp className="h-5 w-5 text-[#5A45FF]" />,
                  title: "Growing Marketplace",
                  description: "Swapedly is a fast-growing peer-to-peer marketplace with real recurring revenue opportunities for affiliates.",
                },
                {
                  icon: <Shield className="h-5 w-5 text-[#5A45FF]" />,
                  title: "No Fees, No Minimums to Join",
                  description: "Zero cost to become an affiliate. No minimum audience size. We welcome creators at every level.",
                },
                {
                  icon: <BarChart3 className="h-5 w-5 text-[#FF4D6D]" />,
                  title: "Real-Time Dashboard",
                  description: "Track clicks, signups, and commissions in your affiliate dashboard. PayPal payouts available at $25+.",
                },
                {
                  icon: <Link2 className="h-5 w-5 text-[#7B68EE]" />,
                  title: "Vanity URL",
                  description: "Your own branded URL: swapedly.com/join/yourname — clean, memorable, and easy to share.",
                },
                {
                  icon: <Users className="h-5 w-5 text-[#5A45FF]" />,
                  title: "Resources & Support",
                  description: "Access marketing copy, commission breakdowns, and help articles to make promotion effortless.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 p-5 rounded-2xl bg-[#f8fafc] border">
                  <div className="p-2 rounded-xl bg-white shadow-sm border shrink-0 h-fit">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Resource Preview */}
        <section className="py-16 px-4 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Marketing Resources Included</h2>
            <p className="text-muted-foreground">Everything you need to promote Swapedly effectively</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <Copy className="h-8 w-8 text-[#5A45FF] mb-3" />
                <h3 className="font-semibold mb-2">Caption Templates</h3>
                <p className="text-sm text-muted-foreground">Pre-written social captions for Instagram, TikTok, Twitter, and YouTube descriptions. Copy, paste, post.</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <BarChart3 className="h-8 w-8 text-[#FF4D6D] mb-3" />
                <h3 className="font-semibold mb-2">Commission Fact Sheet</h3>
                <p className="text-sm text-muted-foreground">A clear summary of all commission rates and earning scenarios — for your own reference or to share with co-creators.</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <Link2 className="h-8 w-8 text-[#7B68EE] mb-3" />
                <h3 className="font-semibold mb-2">Blog & Help Articles</h3>
                <p className="text-sm text-muted-foreground">Link to Swapedly's SEO blog articles and help docs to add authority to your content and assist your referrals.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section
          className="py-20 px-4 text-center"
          style={{ background: "linear-gradient(135deg, #5A45FF 0%, #FF4D6D 100%)" }}
        >
          <div className="max-w-2xl mx-auto text-white">
            <h2 className="text-4xl font-bold mb-4">Ready to start earning?</h2>
            <p className="text-white/80 mb-8 text-lg">
              Join our affiliate program today. Instant approval, no fees, payouts via PayPal.
            </p>
            <Button
              size="lg"
              className="bg-white text-[#5A45FF] hover:bg-white/90 font-bold text-base px-10 py-6 rounded-2xl shadow-lg"
              onClick={handleApplyClick}
            >
              Apply Now — It's Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="mt-4 text-white/60 text-sm">Already an affiliate? <Link href="/affiliate/dashboard" className="underline text-white/80">View your dashboard</Link></p>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
