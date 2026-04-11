import { AuthenticatedLayout } from "@/components/layouts";
import { SwapBucksAmount } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Crown,
  Check,
  X,
  Sparkles,
  Coins,
  ShoppingBag,
  Star,
  Headphones,
  Zap,
  CreditCard,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useOnboarding } from "@/components/onboarding-guard";
import { useLocation } from "wouter";
import { format } from "date-fns";

interface MembershipData {
  tier: "free" | "plus";
  isPlus: boolean;
  expiresAt: string | null;
  highlightsRemaining: number;
  listingCredits: number;
  pricing: {
    plusMonthly: number;
    creditPrice: number;
    creditMinPurchase: number;
  };
  multiplier: number;
}

const creditPackages = [
  { quantity: 10, price: 4.9, testId: "buy-credits-10" },
  { quantity: 25, price: 12.25, testId: "buy-credits-25" },
  { quantity: 50, price: 24.5, testId: "buy-credits-50" },
];

const freeFeatures = [
  { label: "$0.49 per listing credit", included: true },
  { label: "Minimum $5 purchase", included: true },
  { label: "1× SB earnings", included: true },
  { label: "Standard listings", included: true },
  { label: "Highlighted listings", included: false },
  { label: "Plus badge on profile", included: false },
  { label: "Priority support", included: false },
];

const plusFeatures = [
  { label: "Unlimited free listings", included: true },
  { label: "No credits needed", included: true },
  { label: "1.5× SB on all earnings", included: true },
  { label: "5 highlighted listings/month", included: true },
  { label: "Plus badge on profile", included: true },
  { label: "Priority support", included: true },
];

export default function MembershipPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { data: onboardingData } = useOnboarding();

  const { data: membership, isLoading } = useQuery<MembershipData>({
    queryKey: ["/api/membership"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/membership/upgrade");
    },
    onSuccess: async () => {
      toast({ title: "Welcome to Swapedly Plus!", description: "Your membership has been activated." });
      queryClient.invalidateQueries({ queryKey: ["/api/membership"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Advance onboarding if in membership step
      if (onboardingData && !onboardingData.onboardingComplete && onboardingData.step === "membership") {
        await apiRequest("POST", "/api/onboarding/advance", { step: "profile" });
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
        navigate("/complete-profile");
      }
    },
    onError: (e: Error) => {
      toast({ title: "Upgrade failed", description: e.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/membership/cancel");
    },
    onSuccess: () => {
      toast({ title: "Membership cancelled", description: "Your Plus membership has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ["/api/membership"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (e: Error) => {
      toast({ title: "Cancellation failed", description: e.message, variant: "destructive" });
    },
  });

  const buyCreditsMutation = useMutation({
    mutationFn: async (quantity: number) => {
      await apiRequest("POST", "/api/membership/buy-credits", { quantity });
    },
    onSuccess: async () => {
      toast({ title: "Credits purchased!", description: "Listing credits added to your account." });
      queryClient.invalidateQueries({ queryKey: ["/api/membership"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Advance onboarding if in membership step
      if (onboardingData && !onboardingData.onboardingComplete && onboardingData.step === "membership") {
        await apiRequest("POST", "/api/onboarding/advance", { step: "profile" });
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
        navigate("/complete-profile");
      }
    },
    onError: (e: Error) => {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    },
  });

  const isPlus = membership?.isPlus ?? false;

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold" data-testid="membership-title">
            Membership
          </h1>
          <p className="text-muted-foreground">
            Choose the plan that works best for you
          </p>
        </div>

        {/* Current Plan Banner */}
        <Card
          className={
            isPlus
              ? "rounded-2xl bg-gradient-to-r from-[#5A45FF] to-[#7B68EE] text-white overflow-hidden relative"
              : "rounded-2xl border-2 border-dashed border-muted-foreground/20 overflow-hidden"
          }
          data-testid="current-plan"
        >
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {isPlus ? (
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-yellow-300" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">
                      {isPlus ? "Swapedly Plus" : "Free Plan"}
                    </h2>
                    {isPlus && (
                      <Badge className="bg-yellow-400/20 text-yellow-200 border-yellow-400/30 hover:bg-yellow-400/30">
                        Active
                      </Badge>
                    )}
                  </div>
                  {isPlus && membership?.expiresAt ? (
                    <p className={isPlus ? "text-sm text-white/70" : "text-sm text-muted-foreground"}>
                      <CalendarDays className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                      Renews {format(new Date(membership.expiresAt), "MMM d, yyyy")}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Upgrade to Plus for unlimited listings
                    </p>
                  )}
                </div>
              </div>
              {isPlus && (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className={isPlus ? "text-2xl font-bold" : "text-2xl font-bold"}>
                      {membership?.highlightsRemaining ?? 0}
                    </p>
                    <p className={isPlus ? "text-xs text-white/60" : "text-xs text-muted-foreground"}>
                      Highlights Left
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">1.5×</p>
                    <p className={isPlus ? "text-xs text-white/60" : "text-xs text-muted-foreground"}>
                      SB Multiplier
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          {isPlus && (
            <div className="absolute top-4 right-8 text-8xl font-black text-white/5 select-none">
              PLUS
            </div>
          )}
        </Card>

        {/* Pricing Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Tier */}
          <Card className={`rounded-xl ${!isPlus ? "ring-2 ring-primary/20" : ""}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Free</CardTitle>
                {!isPlus && (
                  <Badge variant="secondary" className="text-xs">
                    Current Plan
                  </Badge>
                )}
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold">$0</span>
                <span className="text-muted-foreground text-sm ml-1">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Pay per listing with credits
              </p>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5">
              <ul className="space-y-3">
                {freeFeatures.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-2.5 text-sm">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={feature.included ? "" : "text-muted-foreground"}>
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Plus Tier */}
          <Card className={`rounded-xl relative overflow-hidden ${isPlus ? "ring-2 ring-[#5A45FF]" : ""}`}>
            <div className="absolute top-0 right-0 bg-[#5A45FF] text-white text-xs font-semibold px-3 py-1 rounded-bl-xl">
              Recommended
            </div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-[#5A45FF]" />
                  <CardTitle className="text-lg">Swapedly Plus</CardTitle>
                </div>
                {isPlus && (
                  <Badge className="bg-[#5A45FF]/10 text-[#5A45FF] hover:bg-[#5A45FF]/20 border-0">
                    Current Plan
                  </Badge>
                )}
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold">$9.99</span>
                <span className="text-muted-foreground text-sm ml-1">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Unlimited listings &amp; premium perks
              </p>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5">
              <ul className="space-y-3">
                {plusFeatures.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-[#5A45FF] shrink-0" />
                    <span className="font-medium">{feature.label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isPlus ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/30"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    data-testid="cancel-btn"
                  >
                    {cancelMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Cancel Membership
                  </Button>
                ) : (
                  <Button
                    className="w-full rounded-xl bg-[#5A45FF] hover:bg-[#4935EE] text-white gap-2"
                    onClick={() => upgradeMutation.mutate()}
                    disabled={upgradeMutation.isPending}
                    data-testid="upgrade-btn"
                  >
                    {upgradeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    Upgrade to Plus — $9.99/mo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Listing Credits Section (Free users) */}
        {!isPlus && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Listing Credits
                </h2>
                <p className="text-sm text-muted-foreground">
                  Purchase credits to create new listings
                </p>
              </div>
              <div
                className="flex items-center gap-2 bg-primary/5 rounded-xl px-4 py-2 border border-primary/10"
                data-testid="credits-balance"
              >
                <Coins className="h-5 w-5 text-[#5A45FF]" />
                <span className="font-bold text-lg">{membership?.listingCredits ?? 0}</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {creditPackages.map((pkg) => (
                <Card
                  key={pkg.quantity}
                  className="rounded-xl hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-5 text-center space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-[#5A45FF]/10 flex items-center justify-center mx-auto">
                      <Sparkles className="h-6 w-6 text-[#5A45FF]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pkg.quantity}</p>
                      <p className="text-sm text-muted-foreground">credits</p>
                    </div>
                    <p className="text-lg font-semibold">
                      ${pkg.price.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${(pkg.price / pkg.quantity).toFixed(2)} per credit
                    </p>
                    <Button
                      className="w-full rounded-xl bg-[#5A45FF] hover:bg-[#4935EE] text-white"
                      onClick={() => buyCreditsMutation.mutate(pkg.quantity)}
                      disabled={buyCreditsMutation.isPending}
                      data-testid={pkg.testId}
                    >
                      {buyCreditsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Buy"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Plus Active Details (Plus users) */}
        {isPlus && (
          <Card className="rounded-xl bg-gradient-to-r from-[#5A45FF]/5 to-[#7B68EE]/5 border-[#5A45FF]/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-[#5A45FF]" />
                Your Plus Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 bg-white rounded-xl p-4 border">
                  <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Listings</p>
                    <p className="font-bold">Unlimited</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-xl p-4 border">
                  <div className="h-10 w-10 rounded-xl bg-[#5A45FF]/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-[#5A45FF]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Highlights Left</p>
                    <p className="font-bold">{membership?.highlightsRemaining ?? 0} / 5</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-xl p-4 border">
                  <div className="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                    <Headphones className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Support</p>
                    <p className="font-bold">Priority</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
