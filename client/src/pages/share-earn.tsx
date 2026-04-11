import { AuthenticatedLayout } from "@/components/layouts";
import { SwapBucksAmount, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Coins,
  Gift,
  TrendingUp,
  Instagram,
  Facebook,
  Hash,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Link2,
  ChevronRight,
  Download,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, resolveImageUrl } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback, useRef } from "react";
import type { Listing, SocialShare } from "@shared/schema";

// Platform config
const PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: Instagram, color: "bg-gradient-to-br from-purple-600 to-pink-500", textColor: "text-white" },
  { id: "facebook", name: "Facebook", icon: Facebook, color: "bg-blue-600", textColor: "text-white" },
  { id: "tiktok", name: "TikTok", icon: Hash, color: "bg-black", textColor: "text-white" },
  { id: "pinterest", name: "Pinterest", icon: Share2, color: "bg-red-600", textColor: "text-white" },
] as const;

function getPlatformConfig(id: string) {
  return PLATFORMS.find((p) => p.id === id) || PLATFORMS[0];
}

// ============================
// Download share card as image
// ============================
async function generateShareImage(
  coverImageUrl: string | null,
  title: string,
  price: number,
  condition: string,
): Promise<string> {
  const W = 1080;
  const H = 1350; // 4:5 ratio — ideal for Instagram
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Load and draw cover image
  const imgH = 810; // 60% of height for image
  if (coverImageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = resolveImageUrl(coverImageUrl);
      });
      // Cover crop
      const scale = Math.max(W / img.width, imgH / img.height);
      const sw = W / scale;
      const sh = imgH / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, imgH);
    } catch {
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(0, 0, W, imgH);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 36px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No Image", W / 2, imgH / 2);
      ctx.textAlign = "start";
    }
  } else {
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(0, 0, W, imgH);
  }

  // Bottom info section
  const infoY = imgH + 40;

  // Swapedly branding
  ctx.fillStyle = "#5A45FF";
  const badgeSize = 44;
  const bx = 48;
  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };
  roundRect(bx, infoY, badgeSize, badgeSize, 10);
  ctx.fill();
  // Arrow icon in badge
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const cx = bx + badgeSize / 2;
  const cy = infoY + badgeSize / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 4);
  ctx.lineTo(cx, cy - 6);
  ctx.lineTo(cx + 8, cy + 4);
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx, cy + 10);
  ctx.stroke();

  ctx.fillStyle = "#5A45FF";
  ctx.font = "bold 24px Inter, system-ui, sans-serif";
  ctx.fillText("Swapedly", bx + badgeSize + 14, infoY + 30);

  // Title
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 40px Inter, system-ui, sans-serif";
  // Word-wrap the title
  const maxWidth = W - 96;
  const words = title.split(" ");
  let line = "";
  let titleY = infoY + 100;
  for (const word of words) {
    const testLine = line + (line ? " " : "") + word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, bx, titleY);
      line = word;
      titleY += 52;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, bx, titleY);

  // Price - draw a yellow circle coin icon then price text
  const priceY = titleY + 64;
  // Coin icon
  ctx.fillStyle = "#eab308";
  ctx.beginPath();
  ctx.arc(bx + 16, priceY - 10, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("S", bx + 16, priceY - 4);
  ctx.textAlign = "start";
  // Price text
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 36px Inter, system-ui, sans-serif";
  ctx.fillText(`${price} Swap Bucks`, bx + 44, priceY);

  // Condition badge
  const condLabel = condition.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const condColors: Record<string, { bg: string; text: string }> = {
    new: { bg: "#d1fae5", text: "#065f46" },
    like_new: { bg: "#d1fae5", text: "#065f46" },
    good: { bg: "#dbeafe", text: "#1e40af" },
    fair: { bg: "#fef3c7", text: "#92400e" },
    poor: { bg: "#fee2e2", text: "#991b1b" },
  };
  const cond = condColors[condition] || { bg: "#f1f5f9", text: "#475569" };
  ctx.font = "bold 24px Inter, system-ui, sans-serif";
  const condW = ctx.measureText(condLabel).width + 32;
  const condX = W - 48 - condW;
  ctx.fillStyle = cond.bg;
  roundRect(condX, priceY - 28, condW, 38, 19);
  ctx.fill();
  ctx.fillStyle = cond.text;
  ctx.fillText(condLabel, condX + 16, priceY);

  // Bottom tagline
  ctx.fillStyle = "#94a3b8";
  ctx.font = "20px Inter, system-ui, sans-serif";
  ctx.fillText("Trade smarter with Swap Bucks \u2022 swapedly.com", bx, H - 40);

  return canvas.toDataURL("image/png");
}

// ============================
// Share Card Preview
// ============================
function ShareCardPreview({
  listing,
  coverImage,
}: {
  listing: { title: string; price: number; category: string; condition: string };
  coverImage: string | null;
}) {
  const imgSrc = coverImage
    ? resolveImageUrl(coverImage)
    : "https://placehold.co/600x400/e2e8f0/94a3b8?text=No+Image";

  return (
    <div className="relative overflow-hidden rounded-xl border shadow-sm bg-white" data-testid="share-card-preview">
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <img src={imgSrc} alt={listing.title} className="w-full h-full object-cover" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-md bg-[#5A45FF] flex items-center justify-center">
            <Share2 className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-[#5A45FF]">Swapedly</span>
        </div>
        <h3 className="font-semibold text-sm">{listing.title}</h3>
        <div className="flex items-center justify-between mt-2">
          <SwapBucksAmount amount={listing.price} size="sm" className="font-bold" />
          <StatusBadge status={listing.condition} />
        </div>
      </div>
    </div>
  );
}

// ============================
// Share Dialog
// ============================
function ShareDialog({
  listingId,
  trigger,
}: {
  listingId: number;
  trigger: React.ReactNode;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState("instagram");
  const [postUrl, setPostUrl] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: shareData, isLoading } = useQuery({
    queryKey: ["/api/share/generate", listingId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/share/generate/${listingId}`);
      return res.json();
    },
    enabled: open,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/share/claim", {
        listingId,
        platform: selectedPlatform,
        postUrl,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "5 Swap Bucks earned!", description: "Thank you for sharing on " + getPlatformConfig(selectedPlatform).name });
      queryClient.invalidateQueries({ queryKey: ["/api/share/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setPostUrl("");
      setOpen(false);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const copyToClipboard = useCallback(async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for deployed iframe
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedField(fieldName);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopiedField(null), 2000);
    }
  }, [toast]);

  const platformCaption = shareData?.captions?.[selectedPlatform as keyof typeof shareData.captions] || "";
  const platform = getPlatformConfig(selectedPlatform);

  const handleDownloadImage = useCallback(async () => {
    if (!shareData) return;
    setDownloading(true);
    try {
      const dataUrl = await generateShareImage(
        shareData.coverImage,
        shareData.listing.title,
        shareData.listing.price,
        shareData.listing.condition,
      );
      const link = document.createElement("a");
      link.download = `swapedly-${shareData.listing.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Image downloaded", description: "Save it and upload to your social media post" });
    } catch (err) {
      toast({ title: "Download failed", description: "Try right-clicking the preview image instead", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  }, [shareData, toast]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share & Earn 5 Swap Bucks
          </DialogTitle>
          <DialogDescription>
            Share this listing on social media and earn 5 SB. Copy the caption, post it, then paste your post URL below.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : shareData ? (
          <div className="space-y-5 py-2">
            {/* Share Card Preview */}
            <div className="max-w-xs mx-auto">
              <ShareCardPreview
                listing={shareData.listing}
                coverImage={shareData.coverImage}
              />
              <Button
                variant="outline"
                className="w-full mt-3 rounded-xl gap-2"
                onClick={handleDownloadImage}
                disabled={downloading}
                data-testid="download-share-image"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? "Generating..." : "Download Image for Post"}
              </Button>
            </div>

            {/* Platform Selector */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Select Platform
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {PLATFORMS.map((p) => {
                  const Icon = p.icon;
                  const isActive = selectedPlatform === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatform(p.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      }`}
                      data-testid={`platform-${p.id}`}
                    >
                      <div className={`h-8 w-8 rounded-lg ${p.color} flex items-center justify-center`}>
                        <Icon className={`h-4 w-4 ${p.textColor}`} />
                      </div>
                      <span className="text-[11px] font-medium">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caption */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Caption for {platform.name}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => copyToClipboard(platformCaption, "caption")}
                  data-testid="copy-caption"
                >
                  {copiedField === "caption" ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedField === "caption" ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-sm whitespace-pre-line max-h-40 overflow-y-auto">
                {platformCaption}
              </div>
            </div>

            {/* Hashtags */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Hashtags
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => copyToClipboard(shareData.hashtags.join(" "), "hashtags")}
                  data-testid="copy-hashtags"
                >
                  {copiedField === "hashtags" ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedField === "hashtags" ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {shareData.hashtags.map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs rounded-lg">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Claim Reward */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Coins className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Claim your 5 Swap Bucks</p>
                  <p className="text-xs text-muted-foreground">
                    After posting, paste your post URL below
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Paste your ${platform.name} post URL...`}
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    className="pl-10 rounded-xl"
                    data-testid="post-url-input"
                  />
                </div>
                <Button
                  className="w-full rounded-xl gap-2"
                  onClick={() => claimMutation.mutate()}
                  disabled={!postUrl.trim() || claimMutation.isPending}
                  data-testid="claim-reward-btn"
                >
                  {claimMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Claim 5 Swap Bucks
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ============================
// Listing Share Card (for the grid)
// ============================
function ListingShareCard({ listing }: { listing: Listing }) {
  const images = listing.images ? JSON.parse(listing.images) : [];
  const imgSrc = images[0]
    ? resolveImageUrl(images[0])
    : "https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image";

  return (
    <Card className="rounded-xl overflow-hidden group" data-testid={`share-listing-${listing.id}`}>
      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
        <img
          src={imgSrc}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
      <CardContent className="p-3 space-y-2">
        <h3 className="font-medium text-sm line-clamp-1">{listing.title}</h3>
        <div className="flex items-center justify-between">
          <SwapBucksAmount amount={listing.price} size="sm" className="font-semibold" />
          <StatusBadge status={listing.condition} />
        </div>
        <ShareDialog
          listingId={listing.id}
          trigger={
            <Button variant="outline" size="sm" className="w-full rounded-lg gap-1.5 text-xs mt-1" data-testid={`share-btn-${listing.id}`}>
              <Share2 className="h-3 w-3" />
              Share & Earn 5 SB
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}

// ============================
// Share History Row
// ============================
function ShareHistoryRow({ share }: { share: SocialShare }) {
  const platform = getPlatformConfig(share.platform);
  const Icon = platform.icon;
  const date = new Date(share.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30" data-testid={`share-history-${share.id}`}>
      <div className={`h-9 w-9 rounded-lg ${platform.color} flex items-center justify-center shrink-0`}>
        <Icon className={`h-4 w-4 ${platform.textColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Shared on {platform.name}</p>
        <p className="text-xs text-muted-foreground truncate">{date}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {share.rewardPaid ? (
          <Badge className="bg-green-100 text-green-700 text-xs rounded-lg gap-1">
            <Check className="h-3 w-3" />
            +5 SB
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs rounded-lg">Pending</Badge>
        )}
        <a href={share.postUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>
    </div>
  );
}

// ============================
// Main Page
// ============================
export default function ShareEarnPage() {
  const { user } = useAuth();

  const { data: listings, isLoading: listingsLoading } = useQuery<Listing[]>({
    queryKey: ["/api/share/listings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/share/listings");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: shareHistory, isLoading: historyLoading } = useQuery<SocialShare[]>({
    queryKey: ["/api/share/history"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/share/history");
      return res.json();
    },
    enabled: !!user,
  });

  const totalEarned = (shareHistory || [])
    .filter((s) => s.rewardPaid)
    .reduce((acc, s) => acc + s.reward, 0);
  const totalShares = (shareHistory || []).length;

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="share-earn-title">
            <Share2 className="h-5 w-5 text-primary" />
            Share & Earn
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Share listings on social media and earn 5 Swap Bucks per post
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-xl">
            <CardContent className="p-4 text-center">
              <Gift className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-primary">{totalShares}</p>
              <p className="text-xs text-muted-foreground">Total Shares</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4 text-center">
              <Coins className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
              <p className="text-2xl font-bold text-yellow-600">{totalEarned}</p>
              <p className="text-xs text-muted-foreground">SB Earned</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-2xl font-bold text-green-600">5</p>
              <p className="text-xs text-muted-foreground">SB Per Share</p>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <Card className="rounded-xl border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3">How it works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { step: "1", title: "Pick a listing", desc: "Choose any listing below to share" },
                { step: "2", title: "Post on social", desc: "Copy the caption and post it" },
                { step: "3", title: "Paste your URL", desc: "Submit the post link to earn 5 SB" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-xl">
            <TabsTrigger value="listings" className="rounded-lg text-xs sm:text-sm" data-testid="tab-listings">
              Listings to Share
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs sm:text-sm" data-testid="tab-history">
              Share History
              {totalShares > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 text-[10px] px-1.5">{totalShares}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-4">
            {listingsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="rounded-xl overflow-hidden">
                    <Skeleton className="aspect-[4/3]" />
                    <CardContent className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-8 w-full rounded-lg" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : listings && listings.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {listings.map((listing) => (
                  <ListingShareCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold text-sm">No listings available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check back later for listings you can share
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {historyLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : shareHistory && shareHistory.length > 0 ? (
              <div className="space-y-2">
                {shareHistory.map((share) => (
                  <ShareHistoryRow key={share.id} share={share} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Share2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold text-sm">No shares yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Share a listing above to earn your first 5 Swap Bucks
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}

// Export the ShareDialog so it can be used on listing detail pages
export { ShareDialog };
