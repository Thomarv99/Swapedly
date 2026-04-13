import { AuthenticatedLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import {
  Gift, Copy, Check, Mail, MessageSquare, Share2, Coins,
  Download, Facebook, Video, Star,
} from "lucide-react";
import { SiFacebook, SiPinterest } from "react-icons/si";

type RewardStatus = Record<string, { claimed: boolean; nextClaimAt?: string }>;

const REWARDS = [
  {
    type: "gift_card_share",
    icon: Gift,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    label: "Share a Gift Card",
    description: "Send a gift card to a friend using your referral link",
    sb: 1,
    cooldown: "Once per day",
    action: "share",
  },
  {
    type: "facebook_post",
    icon: Facebook,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    label: "Post on Facebook",
    description: "Share Swapedly or a listing on your Facebook profile",
    sb: 5,
    cooldown: "Once per day",
    action: "facebook",
  },
  {
    type: "pinterest_post",
    icon: Star,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    label: "Pin on Pinterest",
    description: "Create a Pin about Swapedly or one of your listings",
    sb: 5,
    cooldown: "Once per day",
    action: "pinterest",
  },
  {
    type: "video_review",
    icon: Video,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    label: "Video Review",
    description: "Post a video review of Swapedly on TikTok, Instagram Reels, or YouTube",
    sb: 30,
    cooldown: "Once per week",
    action: "video",
  },
];

function generateGiftCardCanvas(userName: string, referralCode: string): string {
  const W = 1200, H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#5A45FF");
  grad.addColorStop(0.6, "#7B68EE");
  grad.addColorStop(1, "#FF4D6D");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath(); ctx.arc(W * 0.8, H * 0.2, 220, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.1, H * 0.8, 160, 0, Math.PI * 2); ctx.fill();

  // Card rect
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.roundRect(80, 80, 500, 300, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(80, 80, 500, 300, 24);
  ctx.stroke();

  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 96px Inter,Arial,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("40 SB", 330, 210);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "28px Inter,Arial,sans-serif";
  ctx.fillText("Swap Bucks Gift Card", 330, 262);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "20px Inter,Arial,sans-serif";
  ctx.fillText("= $40 USD value", 330, 302);

  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 40px Inter,Arial,sans-serif";
  ctx.fillText("You've got a FREE gift! 🎁", 640, 145);

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "22px Inter,Arial,sans-serif";
  const lines = ["Claim 40 Swap Bucks and start", "trading on Swapedly.", "No cash needed!"];
  lines.forEach((l, i) => ctx.fillText(l, 640, 200 + i * 32));

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "18px Inter,Arial,sans-serif";
  ctx.fillText(`From: ${userName}`, 640, 340);

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.roundRect(640, 370, 490, 50, 12);
  ctx.fill();
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 14px Inter,Arial,sans-serif";
  ctx.fillText(`swapedly.com/#/gift-card?ref=${referralCode}`, 658, 400);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 22px Inter,Arial,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SWAPEDLY", W / 2, H - 36);

  return canvas.toDataURL("image/png");
}

export default function GiftCardSharePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [showProof, setShowProof] = useState<string | null>(null);

  const referralCode = (user as any)?.referralCode || "SWAP-XXXXX";
  const giftLink = `https://www.swapedly.com/#/gift-card?ref=${referralCode}`;
  const shareText = `🎁 I'm giving you a FREE $40 Swapedly Gift Card!\n\nUse my link to claim 40 Swap Bucks and start trading:\n${giftLink}\n\nSwapedly lets you swap your stuff for Swap Bucks — no cash needed! 🔄`;

  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(giftLink)}&quote=${encodeURIComponent(shareText)}`;
  const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent("https://www.swapedly.com")}&description=${encodeURIComponent("Trade your stuff for Swap Bucks on Swapedly — no cash needed! " + giftLink)}`;

  useEffect(() => {
    if (user) {
      const userName = (user as any).displayName || (user as any).username || "Your friend";
      setCardDataUrl(generateGiftCardCanvas(userName, referralCode));
    }
  }, [user]);

  const { data: rewardStatus } = useQuery<RewardStatus>({
    queryKey: ["/api/share-reward/status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const claimMutation = useMutation({
    mutationFn: async ({ type, proof }: { type: string; proof?: string }) => {
      const res = await apiRequest("POST", "/api/share-reward/claim", { type, proofUrl: proof });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `+${data.sbEarned} SB earned!`, description: `${data.label} reward claimed.` });
      queryClient.invalidateQueries({ queryKey: ["/api/share-reward/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      setShowProof(null);
      setProofUrl("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(giftLink); } catch {
      const el = document.createElement("textarea"); el.value = giftLink;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!cardDataUrl) return;
    const a = document.createElement("a");
    a.download = "swapedly-gift-card.png";
    a.href = cardDataUrl; a.click();
    toast({ title: "Gift card downloaded!" });
  };

  const handleShare = (action: string, type: string) => {
    if (action === "facebook") window.open(fbShareUrl, "_blank");
    else if (action === "pinterest") window.open(pinterestUrl, "_blank");
    else if (action === "video") {
      setShowProof(type);
      return;
    } else if (action === "share") {
      if (navigator.share) {
        navigator.share({ title: "Free $40 Swapedly Gift Card!", text: shareText, url: giftLink }).catch(() => {});
      } else handleCopy();
    }
    // Open proof dialog after sharing (for FB/Pinterest)
    if (action === "facebook" || action === "pinterest") {
      setTimeout(() => setShowProof(type), 1500);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Share & Earn Swap Bucks</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Share Swapedly with friends and earn SB every time. The more you share, the more you earn.
          </p>
        </div>

        {/* Reward cards */}
        <div className="space-y-3">
          {REWARDS.map((reward) => {
            const Icon = reward.icon;
            const status = rewardStatus?.[reward.type];
            const claimed = status?.claimed;
            return (
              <Card key={reward.type} className="rounded-xl">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl ${reward.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-6 w-6 ${reward.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{reward.label}</p>
                      <span className="inline-flex items-center gap-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        <Coins className="h-3 w-3" />+{reward.sb} SB
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{reward.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">⏱ {reward.cooldown}</p>
                  </div>
                  <div className="shrink-0">
                    {claimed ? (
                      <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                        <Check className="h-4 w-4" />Claimed
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-xl"
                        onClick={() => handleShare(reward.action, reward.type)}
                        disabled={claimMutation.isPending}
                        data-testid={`reward-${reward.type}`}
                      >
                        {reward.action === "share" ? "Share" :
                         reward.action === "facebook" ? "Post" :
                         reward.action === "pinterest" ? "Pin" : "Submit"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Proof submission modal */}
        {showProof && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
              <h3 className="font-bold text-lg">Claim Your Reward</h3>
              <p className="text-sm text-muted-foreground">
                {showProof === "video_review"
                  ? "Paste the URL to your video (TikTok, YouTube, Instagram Reels, etc.)"
                  : "Paste the URL of your post to verify and claim your SB."}
              </p>
              <input
                type="url"
                value={proofUrl}
                onChange={e => setProofUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border rounded-xl px-3 py-2 text-sm"
                data-testid="proof-url-input"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setShowProof(null); setProofUrl(""); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={() => claimMutation.mutate({ type: showProof, proof: proofUrl })}
                  disabled={claimMutation.isPending}
                  data-testid="claim-reward-btn"
                >
                  {claimMutation.isPending ? "Claiming..." : "Claim SB"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Gift card section */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Your Gift Card Link
              <Badge variant="secondary" className="text-xs gap-1">
                <Coins className="h-3 w-3 text-yellow-600" />+5 SB per redemption
              </Badge>
            </CardTitle>
          </CardHeader>
          <div className="px-4 py-2">
            <img src="/gift-card.png" alt="Swapedly $40 Gift Card" className="w-full" />
          </div>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border">
              <p className="text-xs font-mono text-slate-600 flex-1 truncate">{giftLink}</p>
              <button onClick={handleCopy} className="shrink-0 text-primary">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <Button onClick={handleDownload} variant="outline" className="w-full rounded-xl gap-2">
              <Download className="h-4 w-4" />
              Download Gift Card Image
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => { window.open(fbShareUrl, "_blank"); setTimeout(() => setShowProof("gift_card_share"), 1500); }}
                className="rounded-xl gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white">
                <SiFacebook className="h-4 w-4" />Facebook
              </Button>
              <Button onClick={() => window.open(`sms:?body=${encodeURIComponent(shareText)}`, "_blank")}
                variant="outline" className="rounded-xl gap-2">
                <MessageSquare className="h-4 w-4" />Text
              </Button>
              <Button onClick={() => window.open(`mailto:?subject=${encodeURIComponent("Free $40 Swapedly Gift!")}&body=${encodeURIComponent(shareText)}`, "_blank")}
                variant="outline" className="rounded-xl gap-2">
                <Mail className="h-4 w-4" />Email
              </Button>
              <Button onClick={() => { if (navigator.share) navigator.share({ text: shareText, url: giftLink }).catch(() => {}); else handleCopy(); }}
                variant="outline" className="rounded-xl gap-2">
                <Share2 className="h-4 w-4" />More
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Caption */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold">Ready-to-use caption</p>
              <button className="text-xs text-primary hover:underline flex items-center gap-1"
                onClick={() => { try { navigator.clipboard.writeText(shareText); } catch {} toast({ title: "Copied!" }); }}>
                <Copy className="h-3 w-3" />Copy
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 whitespace-pre-wrap border">
              {shareText}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
