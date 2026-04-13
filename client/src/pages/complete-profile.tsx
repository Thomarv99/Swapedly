import { AuthenticatedLayout } from "@/components/layouts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera,
  Check,
  ChevronRight,
  Coins,
  Copy,
  Gift,
  Link2,
  Loader2,
  Package,
  Share2,
  Sparkles,
  Upload,
  Users,
  Video,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  getQueryFn,
  API_BASE,
  getAuthToken,
  resolveImageUrl,
} from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useRef, useCallback } from "react";

interface OnboardingData {
  onboardingComplete: boolean;
  step: string;
  listingsCreated: number;
  listingsRequired: number;
  hasMembership: boolean;
  isPlus: boolean;
  purchaseCredits: number;
  sbBalance: number;
  sbRequired: number;
  canAccessMarketplace: boolean;
  hasProfileImage: boolean;
}

export default function CompleteProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [copiedReferral, setCopiedReferral] = useState(false);

  const { data: onboarding, isLoading } = useQuery<OnboardingData>({
    queryKey: ["/api/onboarding"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  // Avatar upload mutation
  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/profile/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile picture updated!",
        description: "You earned 2 SB for adding a profile picture.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
    },
    onError: (e: Error) => {
      toast({
        title: "Upload failed",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  // Claim video mutation
  const claimVideoMutation = useMutation({
    mutationFn: async (postUrl: string) => {
      const res = await apiRequest("POST", "/api/onboarding/claim-video", {
        postUrl,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Video post claimed!",
        description: "You earned 20 SB for creating a video post.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      setVideoUrl("");
    },
    onError: (e: Error) => {
      toast({
        title: "Claim failed",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  // Advance onboarding to complete
  const advanceMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/onboarding/advance", {
        step: "complete",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigate("/marketplace");
    },
    onError: (e: Error) => {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        avatarMutation.mutate(file);
      }
    },
    [avatarMutation],
  );

  const copyReferralLink = useCallback(async () => {
    if (!user?.referralCode) return;
    const text = `Join Swapedly with my code: ${user.referralCode}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedReferral(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopiedReferral(false), 2000);
  }, [user?.referralCode, toast]);

  const sbBalance = onboarding?.sbBalance ?? 0;
  const sbRequired = onboarding?.sbRequired ?? 30;
  const progressPercent = Math.min((sbBalance / sbRequired) * 100, 100);
  const canEnter = onboarding?.canAccessMarketplace ?? false;
  const hasProfileImage = onboarding?.hasProfileImage ?? !!user?.avatarUrl;

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Progress Header */}
        <div className="space-y-4">
          <div>
            <h1
              className="text-2xl font-bold"
              data-testid="complete-profile-title"
            >
              Complete Your Profile
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Earn {sbRequired} Swap Bucks to unlock the marketplace
            </p>
          </div>

          <Card className="rounded-xl overflow-hidden border-0 bg-gradient-to-r from-[#5A45FF]/5 to-[#7B68EE]/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#5A45FF]/10 flex items-center justify-center">
                    <Coins className="h-4 w-4 text-[#5A45FF]" />
                  </div>
                  <span className="font-semibold text-sm">Progress</span>
                </div>
                <span className="text-sm font-bold">
                  <span
                    className={
                      canEnter ? "text-green-600" : "text-[#5A45FF]"
                    }
                  >
                    {sbBalance}
                  </span>{" "}
                  / {sbRequired} SB
                </span>
              </div>
              <div className="relative" data-testid="progress-bar">
                <Progress
                  value={progressPercent}
                  className="h-3 rounded-full bg-gray-200"
                />
                <div
                  className={`absolute inset-0 h-3 rounded-full transition-all ${
                    canEnter
                      ? "bg-gradient-to-r from-green-400 to-green-500"
                      : "bg-gradient-to-r from-[#5A45FF] to-[#7B68EE]"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {canEnter && (
                <Button
                  className="w-full mt-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white gap-2 font-semibold shadow-lg shadow-green-500/25"
                  onClick={() => advanceMutation.mutate()}
                  disabled={advanceMutation.isPending}
                  data-testid="enter-marketplace-btn"
                >
                  {advanceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Enter the Marketplace
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Task Cards */}
        <div className="space-y-3">
          {/* Task: Add Profile Picture */}
          <Card className="rounded-xl" data-testid="task-avatar">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  {hasProfileImage && user?.avatarUrl ? (
                    <div className="relative">
                      <img
                        src={resolveImageUrl(user.avatarUrl)}
                        alt="Profile"
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-white">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-[#5A45FF]/10 flex items-center justify-center">
                      <Camera className="h-6 w-6 text-[#5A45FF]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">
                      Add Profile Picture
                    </h3>
                    <Badge
                      variant="secondary"
                      className="text-xs rounded-lg bg-yellow-100 text-yellow-700 border-0"
                    >
                      Earn 2 SB
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upload a profile photo to personalize your account
                  </p>
                </div>
                <div className="shrink-0">
                  {hasProfileImage ? (
                    <Badge className="bg-green-100 text-green-700 border-0 rounded-lg gap-1">
                      <Check className="h-3 w-3" />
                      Done
                    </Badge>
                  ) : (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Button
                        size="sm"
                        className="rounded-xl bg-[#5A45FF] hover:bg-[#4935EE] text-white gap-1.5"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarMutation.isPending}
                        data-testid="upload-avatar-btn"
                      >
                        {avatarMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        Upload Photo
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task: Invite Friends */}
          <Card className="rounded-xl" data-testid="task-referral">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">Invite Friends</h3>
                    <Badge
                      variant="secondary"
                      className="text-xs rounded-lg bg-yellow-100 text-yellow-700 border-0"
                    >
                      Earn 1 SB each
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Share your referral code and earn SB for each friend who
                    joins
                  </p>
                  {user?.referralCode && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 bg-muted/50 rounded-lg px-3 py-1.5 text-sm font-mono truncate">
                        {user.referralCode}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg gap-1.5 shrink-0"
                        onClick={copyReferralLink}
                        data-testid="copy-referral-btn"
                      >
                        {copiedReferral ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedReferral ? "Copied" : "Copy Link"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task: Create a Video Post */}
          <Card className="rounded-xl" data-testid="task-video">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Video className="h-6 w-6 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">
                      Create a Video Post
                    </h3>
                    <Badge
                      variant="secondary"
                      className="text-xs rounded-lg bg-yellow-100 text-yellow-700 border-0"
                    >
                      Earn 20 SB
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Create a video about Swapedly and post it to social media
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Paste video URL..."
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="pl-9 rounded-lg h-9 text-sm"
                        data-testid="video-url-input"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl bg-[#5A45FF] hover:bg-[#4935EE] text-white gap-1.5 shrink-0"
                      onClick={() => claimVideoMutation.mutate(videoUrl)}
                      disabled={
                        !videoUrl.trim() || claimVideoMutation.isPending
                      }
                      data-testid="claim-video-btn"
                    >
                      {claimVideoMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Claim 20 SB
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task: Share Your Listings */}
          <Card className="rounded-xl" data-testid="task-share">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Share2 className="h-6 w-6 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">
                      Share Your Listings
                    </h3>
                    <Badge
                      variant="secondary"
                      className="text-xs rounded-lg bg-yellow-100 text-yellow-700 border-0"
                    >
                      Earn 10 SB
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Share your product listings on social media
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 shrink-0"
                  onClick={() => navigate("/share-earn")}
                  data-testid="go-share-earn-btn"
                >
                  Go to Share & Earn
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Task: List Another Product */}
          <Card className="rounded-xl" data-testid="task-listing">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <Package className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">
                      List Another Product
                    </h3>
                    <Badge
                      variant="secondary"
                      className="text-xs rounded-lg bg-yellow-100 text-yellow-700 border-0"
                    >
                      Earn 5 SB
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Create more listings to earn SB and build your store
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 shrink-0"
                  onClick={() => navigate("/create-listing")}
                  data-testid="go-create-listing-btn"
                >
                  Create Listing
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gift Card Sharing Prompt */}
        <Card className="rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-violet-50 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <img src="/gift-card.png" alt="Gift Card" className="h-16 w-24 object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm">Give friends a FREE $40 Gift Card</h3>
                  <Badge variant="secondary" className="text-xs rounded-lg bg-yellow-100 text-yellow-700 border-0 gap-0.5">
                    <Coins className="h-3 w-3" /> Earn 5 SB per redemption
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Share a $40 Swap Bucks gift card with your friends. When they redeem it, you earn 5 SB — the fastest way to hit your 60 SB goal!
                </p>
                <Button
                  size="sm"
                  className="mt-3 rounded-xl bg-gradient-to-r from-[#5A45FF] to-[#FF4D6D] hover:opacity-90 text-white gap-1.5 font-semibold"
                  onClick={() => navigate("/gift-card/share")}
                  data-testid="gift-card-prompt-btn"
                >
                  <Gift className="h-3.5 w-3.5" />
                  Send Gift Cards & Earn SB
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
