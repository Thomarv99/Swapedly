import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, AlertCircle, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AffiliateApplyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    platform: "",
    platformUrl: "",
    audienceSize: "",
    niche: "",
    code: "",
    paypalEmail: "",
  });
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [codeTimer, setCodeTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [user, authLoading, setLocation]);

  // Check if already an affiliate
  const { data: existingAffiliate, isLoading: checkingAffiliate } = useQuery({
    queryKey: ["/api/affiliates/me"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/affiliates/me");
        if (res.status === 404) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    enabled: !!user,
    retry: false,
  });

  // Redirect if already an affiliate
  useEffect(() => {
    if (existingAffiliate) {
      setLocation("/affiliate/dashboard");
    }
  }, [existingAffiliate, setLocation]);

  // Pre-fill name from user
  useEffect(() => {
    if (user) {
      setForm(f => ({ ...f, name: f.name || user.displayName || user.username }));
    }
  }, [user]);

  const handleCodeChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setForm(f => ({ ...f, code: cleaned }));
    setCodeAvailable(null);

    if (codeTimer) clearTimeout(codeTimer);
    if (!cleaned) return;

    setCodeChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await apiRequest("GET", `/api/affiliates/check-code/${cleaned}`);
        const data = await res.json();
        setCodeAvailable(data.available);
      } catch {
        setCodeAvailable(null);
      } finally {
        setCodeChecking(false);
      }
    }, 500);
    setCodeTimer(t);
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/affiliates/apply", form);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Application failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates/me"] });
      toast({ title: "Welcome to the program!", description: "Your affiliate account is active. Redirecting to your dashboard..." });
      setTimeout(() => setLocation("/affiliate/dashboard"), 1200);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.platform || !form.code) {
      toast({ title: "Missing fields", description: "Please fill in name, platform, and affiliate code.", variant: "destructive" });
      return;
    }
    if (codeAvailable === false) {
      toast({ title: "Code taken", description: "Please choose a different affiliate code.", variant: "destructive" });
      return;
    }
    applyMutation.mutate();
  };

  if (authLoading || checkingAffiliate) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#5A45FF]" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen bg-[#f8fafc] py-12 px-4">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-[#5A45FF]/10 text-[#5A45FF] rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <CheckCircle2 className="h-4 w-4" />
              Instant Approval
            </div>
            <h1 className="text-3xl font-bold mb-2">Join the Affiliate Program</h1>
            <p className="text-muted-foreground">
              Fill in your details below. You'll get instant access — no waiting.
            </p>
          </div>

          {/* Benefits strip */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "SB Purchases", value: "25%" },
              { label: "Plus Subs", value: "15%" },
              { label: "Credits", value: "10%" },
            ].map(item => (
              <div key={item.label} className="bg-white border rounded-xl p-3 text-center shadow-sm">
                <p className="text-lg font-bold text-[#5A45FF]">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Your Application</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Affiliate / Brand Name */}
                <div>
                  <Label htmlFor="name">Affiliate / Brand Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. TechReviewsByAlex"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="mt-1 rounded-xl"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Your display name in the program</p>
                </div>

                {/* Platform */}
                <div>
                  <Label>Primary Platform *</Label>
                  <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Select your platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">Twitter / X</SelectItem>
                      <SelectItem value="blog">Blog / Website</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Platform URL */}
                <div>
                  <Label htmlFor="platformUrl">Platform URL</Label>
                  <Input
                    id="platformUrl"
                    placeholder="https://youtube.com/@yourchannel"
                    value={form.platformUrl}
                    onChange={e => setForm(f => ({ ...f, platformUrl: e.target.value }))}
                    className="mt-1 rounded-xl"
                  />
                </div>

                {/* Audience Size */}
                <div>
                  <Label>Audience Size</Label>
                  <Select value={form.audienceSize} onValueChange={v => setForm(f => ({ ...f, audienceSize: v }))}>
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under_1k">Under 1K</SelectItem>
                      <SelectItem value="1k_10k">1K – 10K</SelectItem>
                      <SelectItem value="10k_100k">10K – 100K</SelectItem>
                      <SelectItem value="100k_plus">100K+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Niche */}
                <div>
                  <Label>Niche / Content Category</Label>
                  <Select value={form.niche} onValueChange={v => setForm(f => ({ ...f, niche: v }))}>
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Select niche" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">Tech</SelectItem>
                      <SelectItem value="fashion">Fashion / Style</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="resale">Resale / Thrift</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Affiliate Code */}
                <div>
                  <Label htmlFor="code">Your Affiliate Code *</Label>
                  <div className="relative mt-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground text-sm pointer-events-none">
                      <Link2 className="h-3.5 w-3.5" />
                      <span>swapedly.com/join/</span>
                    </div>
                    <Input
                      id="code"
                      placeholder="yourname"
                      value={form.code}
                      onChange={e => handleCodeChange(e.target.value)}
                      className="pl-[170px] rounded-xl font-mono"
                      required
                    />
                    {codeChecking && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!codeChecking && codeAvailable === true && form.code && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                    {!codeChecking && codeAvailable === false && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </div>
                    )}
                  </div>
                  {!codeChecking && codeAvailable === true && form.code && (
                    <p className="text-xs text-green-600 mt-1">✓ Code is available</p>
                  )}
                  {!codeChecking && codeAvailable === false && (
                    <p className="text-xs text-red-500 mt-1">Code is already taken. Try another.</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Only lowercase letters, numbers, underscores, and hyphens</p>
                </div>

                {/* PayPal Email */}
                <div>
                  <Label htmlFor="paypalEmail">PayPal Email (for payouts)</Label>
                  <Input
                    id="paypalEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={form.paypalEmail}
                    onChange={e => setForm(f => ({ ...f, paypalEmail: e.target.value }))}
                    className="mt-1 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Optional — you can add this later in your dashboard</p>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-[#5A45FF] hover:bg-[#4835EF] font-semibold py-5"
                  disabled={applyMutation.isPending || codeAvailable === false}
                >
                  {applyMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating your account...</>
                  ) : (
                    "Join Affiliate Program"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By applying you agree to our <a href="/#/terms" className="underline hover:text-foreground">Terms of Service</a>. Commissions are paid via PayPal. Minimum payout is $25.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
