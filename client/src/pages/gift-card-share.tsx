import { AuthenticatedLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Gift, Copy, Check, Facebook, Mail, MessageSquare, Share2, Coins, Download } from "lucide-react";
import { SiFacebook } from "react-icons/si";

export default function GiftCardSharePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const referralCode = (user as any)?.referralCode || "SWAP-XXXXX";
  const giftLink = `https://www.swapedly.com/#/gift-card?ref=${referralCode}`;

  const shareText = `🎁 I'm giving you a FREE $40 Swapedly Gift Card!\n\nUse my link to claim 40 Swap Bucks and start trading:\n${giftLink}\n\nSwapedly lets you swap your stuff for Swap Bucks — no cash needed! 🔄`;

  // Generate the shareable gift card image
  useEffect(() => {
    generateCard();
  }, [user]);

  const generateCard = async () => {
    const W = 1200, H = 630;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#5A45FF");
    grad.addColorStop(0.6, "#7B68EE");
    grad.addColorStop(1, "#FF4D6D");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative circles
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath(); ctx.arc(W * 0.8, H * 0.2, 220, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.1, H * 0.8, 160, 0, Math.PI * 2); ctx.fill();

    // Gift card rectangle
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, 80, 80, 500, 300, 24);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    roundRect(ctx, 80, 80, 500, 300, 24);
    ctx.stroke();

    // Amount
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 96px Inter,system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("40 SB", 330, 210);

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "28px Inter,system-ui,sans-serif";
    ctx.fillText("Swap Bucks Gift Card", 330, 260);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "20px Inter,system-ui,sans-serif";
    ctx.fillText("= $40 USD value", 330, 300);

    // Right side text
    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 42px Inter,system-ui,sans-serif";
    wrapText(ctx, "I'm giving you a FREE gift!", 640, 130, 500, 52);

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "24px Inter,system-ui,sans-serif";
    wrapText(ctx, "Claim 40 Swap Bucks and start trading on Swapedly. No cash needed!", 640, 240, 500, 32);

    // From label
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "18px Inter,system-ui,sans-serif";
    ctx.fillText(`From: ${(user as any)?.displayName || (user as any)?.username || "Your friend"}`, 640, 360);

    // URL box
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    roundRect(ctx, 640, 400, 500, 50, 12);
    ctx.fill();
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 16px Inter,system-ui,sans-serif";
    ctx.fillText(`swapedly.com/#/gift-card?ref=${referralCode}`, 660, 430);

    // Swapedly branding
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 22px Inter,system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SWAPEDLY", W / 2, H - 40);

    setCardDataUrl(canvas.toDataURL("image/png"));
  };

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
    const words = text.split(" ");
    let line = "";
    for (const word of words) {
      const test = line + word + " ";
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y);
        line = word + " ";
        y += lineH;
      } else line = test;
    }
    ctx.fillText(line, x, y);
  }

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(giftLink); } catch {
      const el = document.createElement("textarea");
      el.value = giftLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!cardDataUrl) return;
    const a = document.createElement("a");
    a.download = "swapedly-gift-card.png";
    a.href = cardDataUrl;
    a.click();
    toast({ title: "Gift card image downloaded!" });
  };

  const handleFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(giftLink)}&quote=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleMessenger = () => {
    window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(giftLink)}&app_id=YOUR_FB_APP_ID&redirect_uri=${encodeURIComponent("https://www.swapedly.com")}`, "_blank");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("I'm sending you a FREE $40 Swapedly Gift Card! 🎁");
    const body = encodeURIComponent(shareText);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Free $40 Swapedly Gift Card!", text: shareText, url: giftLink });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Send a Gift Card</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Give your friends a $40 Swapedly gift card. When they redeem it using your link, you earn 1 SB!
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { n: "1", text: "Download or share the gift card image" },
            { n: "2", text: "Your friend redeems it and creates an account" },
            { n: "3", text: "You earn 1 Swap Buck automatically" },
          ].map(s => (
            <Card key={s.n} className="rounded-xl">
              <CardContent className="p-4 text-center">
                <div className="h-8 w-8 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center mx-auto mb-2">{s.n}</div>
                <p className="text-xs text-muted-foreground">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gift card preview */}
        <Card className="rounded-2xl overflow-hidden">
          <div className="aspect-[1.9] bg-muted">
            {cardDataUrl ? (
              <img src={cardDataUrl} alt="Gift card" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#5A45FF] to-[#FF4D6D]">
                <div className="text-center text-white">
                  <Coins className="h-10 w-10 mx-auto mb-2 text-yellow-300" />
                  <p className="font-black text-3xl">40 SB</p>
                  <p className="text-white/70 text-sm">Swap Bucks Gift Card</p>
                </div>
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">Your referral link (auto-included in all shares)</p>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border">
              <p className="text-xs font-mono text-slate-600 flex-1 truncate">{giftLink}</p>
              <button onClick={handleCopy} className="shrink-0 text-primary hover:text-primary/80">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Share buttons */}
        <Card className="rounded-xl">
          <CardContent className="p-5 space-y-3">
            <p className="font-semibold text-sm">Share with your friends</p>

            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full rounded-xl gap-2 h-11"
              data-testid="download-gift-card"
            >
              <Download className="h-4 w-4" />
              Download Gift Card Image
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleFacebook}
                className="rounded-xl gap-2 h-11 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
                data-testid="share-facebook"
              >
                <SiFacebook className="h-4 w-4" />
                Facebook
              </Button>
              <Button
                onClick={handleMessenger}
                className="rounded-xl gap-2 h-11 bg-[#0084FF] hover:bg-[#0084FF]/90 text-white"
                data-testid="share-messenger"
              >
                <MessageSquare className="h-4 w-4" />
                Messenger
              </Button>
              <Button
                onClick={handleEmail}
                variant="outline"
                className="rounded-xl gap-2 h-11"
                data-testid="share-email"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button
                onClick={handleSMS}
                variant="outline"
                className="rounded-xl gap-2 h-11"
                data-testid="share-sms"
              >
                <MessageSquare className="h-4 w-4" />
                Text Message
              </Button>
            </div>

            <Button
              onClick={handleNativeShare}
              className="w-full rounded-xl gap-2 h-11"
              data-testid="share-native"
            >
              <Share2 className="h-4 w-4" />
              More Sharing Options
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You earn <strong>1 SB</strong> every time a friend redeems using your link
            </p>
          </CardContent>
        </Card>

        {/* Share text preview */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-700 mb-2">Caption (copy & paste)</p>
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 whitespace-pre-wrap border">
              {shareText}
            </div>
            <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs" onClick={() => {
              try { navigator.clipboard.writeText(shareText); } catch {}
              toast({ title: "Caption copied!" });
            }}>
              <Copy className="h-3 w-3" /> Copy caption
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
