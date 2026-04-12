/**
 * Gift Card Share Wall
 * Shows after profile creation + first listing.
 * User must get 10 friends to click their invite link to unlock 40 SB.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layouts";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Gift, Copy, Check, Mail, MessageSquare, Share2,
  Coins, Facebook, Users, Lock, Unlock, ChevronRight,
} from "lucide-react";
import { SiFacebook } from "react-icons/si";

type InviteStatus = {
  inviteCode: string;
  clickCount: number;
  invitesRequired: number;
  unlocked: boolean;
  inviteLink: string;
  sbReward: number;
};

export default function GiftCardWallPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: status, refetch } = useQuery<InviteStatus>({
    queryKey: ["/api/gift-card/invite-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
    refetchInterval: 5000, // poll every 5s for real-time updates
  });

  // Auto-advance when unlocked
  useEffect(() => {
    if (status?.unlocked) {
      // Give a moment to show the celebration, then redirect to onboarding cards
      setTimeout(() => navigate("/gift-card?unlocked=1"), 3000);
    }
  }, [status?.unlocked]);

  const inviteLink = status?.inviteLink || "";
  const clickCount = status?.clickCount || 0;
  const required = status?.invitesRequired || 10;
  const unlocked = status?.unlocked || false;
  const progress = Math.min(100, (clickCount / required) * 100);

  const shareText = `🎁 I'm inviting you to join Swapedly and claim a FREE $40 in Swap Bucks!\n\nUse my link to get started:\n${inviteLink}\n\nSwapedly lets you trade your stuff for Swap Bucks — no cash needed! 🔄`;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(inviteLink); } catch {
      const el = document.createElement("textarea"); el.value = inviteLink;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    toast({ title: "Link copied! Send it to your friends." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFacebook = () => window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}&quote=${encodeURIComponent(shareText)}`,
    "_blank"
  );
  const handleMessenger = () => window.open(
    `https://www.facebook.com/dialog/send?link=${encodeURIComponent(inviteLink)}&app_id=&redirect_uri=${encodeURIComponent("https://www.swapedly.com")}`,
    "_blank"
  );
  const handleSMS = () => window.open(`sms:?body=${encodeURIComponent(shareText)}`, "_blank");
  const handleEmail = () => window.open(
    `mailto:?subject=${encodeURIComponent("I'm inviting you to Swapedly — claim $40 in Swap Bucks!")}&body=${encodeURIComponent(shareText)}`,
    "_blank"
  );
  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Join Swapedly — Free $40 Gift!", text: shareText, url: inviteLink }).catch(() => {});
    } else handleCopy();
  };

  // ── Unlocked state ────────────────────────────────────────────────────────
  if (unlocked) return (
    <div className="min-h-screen bg-gradient-to-br from-[#5A45FF] to-[#FF4D6D] flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="text-8xl mb-6">🎉</div>
      <h1 className="text-3xl font-black mb-3">You did it!</h1>
      <p className="text-white/85 text-lg mb-2">You invited {required} friends to Swapedly.</p>
      <div className="bg-white/20 rounded-2xl px-8 py-4 mb-6">
        <p className="text-5xl font-black text-yellow-300">+{status?.sbReward} SB</p>
        <p className="text-white/75 text-sm mt-1">added to your wallet!</p>
      </div>
      <p className="text-white/70 text-sm">Redirecting you to get started...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="p-5 flex justify-center border-b bg-white">
        <Logo />
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-5">

          {/* Header */}
          <div className="text-center">
            <img src="/gift-card.jpg" alt="Swapedly Gift Card" className="mx-auto w-64 drop-shadow-xl mb-2" />
            <h1 className="text-2xl font-black text-slate-900">One last step!</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Invite <strong>{required} friends</strong> to Swapedly to unlock your <strong className="text-primary">{status?.sbReward || 40} Swap Bucks</strong>.
            </p>
          </div>

          {/* Progress card */}
          <div className="bg-white rounded-2xl border-2 border-primary/20 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-bold text-sm">Friends Invited</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-2xl font-black ${clickCount >= required ? "text-green-600" : "text-primary"}`}>
                  {clickCount}
                </span>
                <span className="text-muted-foreground text-lg font-bold">/ {required}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5A45FF] to-[#FF4D6D] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Dot indicators */}
            <div className="flex justify-between">
              {Array.from({ length: required }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 transition-all ${
                    i < clickCount
                      ? "bg-primary border-primary shadow-sm"
                      : "bg-white border-slate-300"
                  }`}
                />
              ))}
            </div>

            {clickCount > 0 && clickCount < required && (
              <p className="text-xs text-center text-primary font-semibold mt-3">
                {required - clickCount} more friend{required - clickCount !== 1 ? "s" : ""} to go! 🔥
              </p>
            )}
            {clickCount === 0 && (
              <p className="text-xs text-center text-muted-foreground mt-3">
                Share your link below and watch the progress update in real time
              </p>
            )}
          </div>

          {/* Reward preview */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${unlocked ? "bg-green-100" : "bg-yellow-100"}`}>
              {unlocked ? <Unlock className="h-6 w-6 text-green-600" /> : <Lock className="h-6 w-6 text-yellow-600" />}
            </div>
            <div>
              <p className="font-bold text-sm flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-yellow-600" />
                {status?.sbReward || 40} Swap Bucks
              </p>
              <p className="text-xs text-muted-foreground">Unlocks when {required} friends click your link</p>
            </div>
          </div>

          {/* Your invite link */}
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700">Your invite link</p>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 border">
              <p className="text-xs font-mono text-slate-600 flex-1 truncate">{inviteLink}</p>
              <button onClick={handleCopy} className="shrink-0 text-primary" data-testid="copy-invite-link">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleFacebook} className="rounded-xl gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white" data-testid="share-wall-facebook">
                <SiFacebook className="h-4 w-4" />Facebook
              </Button>
              <Button onClick={handleMessenger} className="rounded-xl gap-2 bg-[#0084FF] hover:bg-[#0084FF]/90 text-white" data-testid="share-wall-messenger">
                <MessageSquare className="h-4 w-4" />Messenger
              </Button>
              <Button onClick={handleSMS} variant="outline" className="rounded-xl gap-2" data-testid="share-wall-sms">
                <MessageSquare className="h-4 w-4" />Text
              </Button>
              <Button onClick={handleEmail} variant="outline" className="rounded-xl gap-2" data-testid="share-wall-email">
                <Mail className="h-4 w-4" />Email
              </Button>
            </div>

            <Button onClick={handleNativeShare} variant="outline" className="w-full rounded-xl gap-2" data-testid="share-wall-more">
              <Share2 className="h-4 w-4" />More options
            </Button>
          </div>

          {/* Caption to copy */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-700">Ready-to-send message</p>
              <button
                className="text-xs text-primary hover:underline flex items-center gap-1"
                onClick={() => { try { navigator.clipboard.writeText(shareText); } catch {} toast({ title: "Copied!" }); }}
              >
                <Copy className="h-3 w-3" />Copy
              </button>
            </div>
            <p className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border">{shareText}</p>
          </div>

          <p className="text-xs text-center text-muted-foreground pb-4">
            This page updates automatically every 5 seconds. Keep sharing!
          </p>
        </div>
      </div>
    </div>
  );
}
