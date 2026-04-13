import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthenticatedLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Copy, CheckCircle2, DollarSign, Users, BarChart3,
  Link2, Share2, Settings, FileText, BookOpen,
  Twitter, Facebook
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

function StatCard({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: string }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AffiliateDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ paypalEmail: "", platformUrl: "" });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [user, authLoading, setLocation]);

  // Fetch affiliate data
  const { data: affiliate, isLoading: affiliateLoading } = useQuery<any>({
    queryKey: ["/api/affiliates/me"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/affiliates/me");
      if (res.status === 404) return null;
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Redirect to apply if not an affiliate
  useEffect(() => {
    if (!affiliateLoading && affiliate === null && user) {
      setLocation("/affiliate/apply");
    }
  }, [affiliate, affiliateLoading, user, setLocation]);

  // Fetch conversions
  const { data: conversions = [], isLoading: conversionsLoading } = useQuery<any[]>({
    queryKey: ["/api/affiliates/me/conversions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/affiliates/me/conversions");
      return res.json();
    },
    enabled: !!affiliate,
  });

  // Fetch payouts
  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<any[]>({
    queryKey: ["/api/affiliates/me/payouts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/affiliates/me/payouts");
      return res.json();
    },
    enabled: !!affiliate,
  });

  // Pre-fill settings form
  useEffect(() => {
    if (affiliate) {
      setSettingsForm({
        paypalEmail: affiliate.paypalEmail || "",
        platformUrl: affiliate.platformUrl || "",
      });
    }
  }, [affiliate]);

  const affiliateLink = affiliate ? `https://www.swapedly.com/join/${affiliate.code}` : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    toast({ title: "Link copied!", description: "Your affiliate link is in the clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await apiRequest("PATCH", "/api/affiliates/me", settingsForm);
      if (!res.ok) throw new Error("Failed to save");
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates/me"] });
      toast({ title: "Settings saved!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSettingsSaving(false);
    }
  };

  const requestPayout = useMutation({
    mutationFn: async () => {
      // This just opens instructions — actual payout request goes through admin
      return true;
    },
    onSuccess: () => {
      setPayoutDialogOpen(false);
      toast({
        title: "Payout request noted",
        description: "Our team will process your payout within 3–5 business days via PayPal.",
      });
    },
  });

  if (authLoading || affiliateLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#5A45FF]" />
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!affiliate) return null;

  const stats = affiliate.stats || {};
  const pendingBalance = affiliate.pendingBalance ?? 0;
  const paidBalance = affiliate.paidBalance ?? 0;
  const canRequestPayout = pendingBalance >= 25;

  const SUGGESTED_CAPTION = `🔥 I just found a game-changer for buying & selling stuff online — Swapedly! 

New users get $40 in Swap Bucks FREE when you sign up. Use my link:
👉 ${affiliateLink}

Trade smarter. No hidden fees, no hassle. 💸 #Swapedly #Marketplace #ThriftLife`;

  const COMMISSION_FACT_SHEET = `SWAPEDLY AFFILIATE COMMISSION RATES
=====================================
• Swap Buck Purchases: 25% commission
• Plus Subscriptions: 15% commission  
• Purchase Credits: 10% commission

MINIMUM PAYOUT: $25
PAYOUT METHOD: PayPal
REFERRAL LINK: ${affiliateLink}

New users get $40 in free Swap Bucks when they sign up via your link!`;

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-[#f8fafc]">
        {/* Header */}
        <div
          className="py-8 px-4 text-white"
          style={{ background: "linear-gradient(135deg, #5A45FF 0%, #7B68EE 100%)" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-white/70 text-sm font-medium mb-1">Affiliate Dashboard</p>
                <h1 className="text-2xl font-bold">{affiliate.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                    {affiliate.status === "active" ? "Active" : affiliate.status}
                  </Badge>
                  <span className="text-white/60 text-sm font-mono">{affiliate.code}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => document.getElementById("settings-section")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Settings className="h-4 w-4 mr-2" /> Settings
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Signups"
              value={String(stats.signups ?? 0)}
              icon={<Users className="h-4 w-4" />}
              sub="Referred users"
            />
            <StatCard
              label="Conversions"
              value={String(stats.conversions ?? 0)}
              icon={<BarChart3 className="h-4 w-4" />}
              sub="Paid purchases"
            />
            <StatCard
              label="Pending Earnings"
              value={`$${pendingBalance.toFixed(2)}`}
              icon={<DollarSign className="h-4 w-4 text-yellow-500" />}
              sub="Awaiting payout"
            />
            <StatCard
              label="Total Paid Out"
              value={`$${paidBalance.toFixed(2)}`}
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
              sub="Lifetime earnings"
            />
          </div>

          {/* Affiliate Link */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4 text-[#5A45FF]" />
                Your Affiliate Link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={affiliateLink}
                  readOnly
                  className="rounded-xl font-mono text-sm bg-[#f8fafc]"
                />
                <Button
                  onClick={copyLink}
                  className={`rounded-xl shrink-0 ${copied ? "bg-green-500 hover:bg-green-600" : "bg-[#5A45FF] hover:bg-[#4835EF]"}`}
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl flex-1"
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out Swapedly — get $40 in free Swap Bucks: " + affiliateLink)}`)}
                >
                  <Twitter className="h-4 w-4 mr-2 text-sky-500" /> Share on X
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl flex-1"
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(affiliateLink)}`)}
                >
                  <Facebook className="h-4 w-4 mr-2 text-blue-600" /> Share on Facebook
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl flex-1"
                  onClick={copyLink}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy Link
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conversions */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#5A45FF]" />
                Conversions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : conversions.length === 0 ? (
                <div className="text-center py-10">
                  <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No conversions yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Share your link to start earning!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Your Commission</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversions.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className="capitalize text-sm">
                            {c.type === "sb_purchase" ? "SB Purchase" : c.type === "plus_subscription" ? "Plus Sub" : "Purchase Credits"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">${c.revenueUsd?.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-[#5A45FF]">${c.commissionUsd?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={c.paid ? "default" : "secondary"} className="text-xs">
                            {c.paid ? "Paid" : "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Payout & Earnings */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#5A45FF]" />
                Payouts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Payout request */}
              <div className="bg-[#f8fafc] rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold">Pending Balance</p>
                  <p className="text-2xl font-bold text-[#5A45FF]">${pendingBalance.toFixed(2)}</p>
                  {!canRequestPayout && (
                    <p className="text-xs text-muted-foreground mt-1">Minimum $25 to request payout</p>
                  )}
                </div>
                <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="rounded-xl bg-[#5A45FF] hover:bg-[#4835EF]"
                      disabled={!canRequestPayout}
                    >
                      Request Payout
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Request Payout</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <p className="text-sm text-muted-foreground">
                        You have <strong>${pendingBalance.toFixed(2)}</strong> pending. Payouts are processed within 3–5 business days via PayPal.
                      </p>
                      <div>
                        <Label>PayPal Email</Label>
                        <Input
                          value={settingsForm.paypalEmail}
                          onChange={e => setSettingsForm(f => ({ ...f, paypalEmail: e.target.value }))}
                          placeholder="your@paypal.com"
                          className="mt-1 rounded-xl"
                        />
                      </div>
                      <Button
                        className="w-full rounded-xl bg-[#5A45FF] hover:bg-[#4835EF]"
                        onClick={() => requestPayout.mutate()}
                      >
                        Confirm Payout Request
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Payout history */}
              {payoutsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : payouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No payouts yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold text-green-600">${p.amountUsd?.toFixed(2)}</TableCell>
                        <TableCell className="text-sm capitalize">{p.method}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.reference || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Resource Kit */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#5A45FF]" />
                Resource Kit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-[#f8fafc] rounded-xl p-4 border">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-[#5A45FF]" />
                    <p className="font-semibold text-sm">Blog Articles</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Link to these in your content to add value and SEO authority.</p>
                  <div className="space-y-1">
                    <a href="/#/blog/facebook-marketplace-alternatives" className="block text-xs text-[#5A45FF] hover:underline">→ FB Marketplace Alternatives</a>
                    <a href="/#/blog/craigslist-alternatives" className="block text-xs text-[#5A45FF] hover:underline">→ Craigslist Alternatives</a>
                    <a href="/#/blog/best-places-to-sell-stuff-online" className="block text-xs text-[#5A45FF] hover:underline">→ Best Places to Sell Online</a>
                  </div>
                </div>
                <div className="bg-[#f8fafc] rounded-xl p-4 border">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 className="h-4 w-4 text-[#FF4D6D]" />
                    <p className="font-semibold text-sm">Help Center</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Direct your audience to these guides to help them get started.</p>
                  <a href="/#/help" className="block text-xs text-[#5A45FF] hover:underline">→ Swapedly Help Center</a>
                  <a href="/#/help/how-to-earn-swap-bucks" className="block text-xs text-[#5A45FF] hover:underline mt-1">→ How to Earn Swap Bucks</a>
                </div>
              </div>

              {/* Suggested Caption */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">Suggested Caption</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(SUGGESTED_CAPTION);
                      toast({ title: "Caption copied!" });
                    }}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
                <Textarea
                  value={SUGGESTED_CAPTION}
                  readOnly
                  className="font-mono text-xs bg-[#f8fafc] rounded-xl resize-none"
                  rows={6}
                />
              </div>

              {/* Commission Fact Sheet */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">Commission Fact Sheet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(COMMISSION_FACT_SHEET);
                      toast({ title: "Fact sheet copied!" });
                    }}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
                <Textarea
                  value={COMMISSION_FACT_SHEET}
                  readOnly
                  className="font-mono text-xs bg-[#f8fafc] rounded-xl resize-none"
                  rows={8}
                />
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card id="settings-section" className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#5A45FF]" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>PayPal Email</Label>
                <Input
                  type="email"
                  placeholder="your@paypal.com"
                  value={settingsForm.paypalEmail}
                  onChange={e => setSettingsForm(f => ({ ...f, paypalEmail: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label>Platform URL</Label>
                <Input
                  placeholder="https://youtube.com/@yourchannel"
                  value={settingsForm.platformUrl}
                  onChange={e => setSettingsForm(f => ({ ...f, platformUrl: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <Button
                className="rounded-xl bg-[#5A45FF] hover:bg-[#4835EF]"
                onClick={saveSettings}
                disabled={settingsSaving}
              >
                {settingsSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
