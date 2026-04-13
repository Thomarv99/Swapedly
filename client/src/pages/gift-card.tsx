import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layouts";
import { apiRequest, setAuthToken, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Check, Mail, Upload, MapPin } from "lucide-react";

const UNIVERSAL_CODE = "SWAPEDLY-40";
const SB_AMOUNT = 40;

// ─── Onboarding Cards ────────────────────────────────────────────────────────
const CARDS = [
  {
    icon: Gift,
    color: "from-[#5A45FF] to-[#7B68EE]",
    iconColor: "text-yellow-300",
    title: "Welcome to Swapedly! 🎉",
    body: "Your $40 in Swap Bucks is now in your wallet. Swapedly is the marketplace where you trade your stuff for SB — no cash needed between buyers and sellers.",
    highlight: "40 SB added to your wallet!",
  },
  {
    icon: Coins,
    color: "from-yellow-500 to-amber-600",
    iconColor: "text-white",
    title: "What Are Swap Bucks?",
    body: "Swap Bucks (SB) are Swapedly's currency. Every item in the marketplace is priced in SB. Your $40 gift card = 40 SB to spend on anything. List your own items to earn even more.",
    highlight: "1 SB = $1 USD value",
  },
  {
    icon: ShoppingBag,
    color: "from-pink-500 to-rose-600",
    iconColor: "text-white",
    title: "How Buying Works 🛍️",
    body: "Browse the marketplace, find something you love, and buy it with your Swap Bucks. The seller gets notified, accepts your request, and you coordinate the exchange — local pickup or shipped.",
    highlight: "No cash changes hands",
  },
  {
    icon: Upload,
    color: "from-green-500 to-emerald-600",
    iconColor: "text-white",
    title: "How Selling Works 📸",
    body: "Take a photo of anything around your home, set a price in SB, and list it in under 2 minutes. When someone buys it, their SB transfers to your wallet after the exchange is confirmed.",
    highlight: "List anything in 2 minutes",
  },
  {
    icon: Shield,
    color: "from-slate-700 to-slate-900",
    iconColor: "text-green-400",
    title: "Your SB is Always Protected 🔒",
    body: "When a buyer purchases your item, their SB is held in escrow until both parties confirm the exchange happened. No SB moves until you say the deal is done.",
    highlight: "Escrow protection on every trade",
  },
  {
    icon: Users,
    color: "from-blue-500 to-indigo-600",
    iconColor: "text-white",
    title: "Share Swapedly, Earn More SB 🙌",
    body: "Every friend who signs up using your referral link earns you 1 SB. Share on Facebook, Instagram, by text — the more people you invite, the more you earn.",
    highlight: "1 SB per friend who joins",
  },
  {
    icon: Star,
    color: "from-orange-500 to-amber-500",
    iconColor: "text-white",
    title: "Want Unlimited Buying Power? ⭐",
    body: "Swapedly Plus ($9.99/month) removes purchase credit requirements, gives you 1.5× SB on every sale, lets you feature listings at the top of the marketplace, and unlocks 5 highlights per month.",
    highlight: "Upgrade anytime from your dashboard",
  },
  {
    icon: Zap,
    color: "from-[#5A45FF] to-[#FF4D6D]",
    iconColor: "text-white",
    title: "You're Ready to Trade! 🚀",
    body: "To unlock the full marketplace, list at least 1 item AND earn 30 Swap Bucks. You already have 40 SB — now list your first item and you'll have instant access!",
    highlight: "You're 1 listing away from the marketplace!",
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GiftCardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Steps: "profile" | "polish"
  const [step, setStep] = useState<"profile" | "polish">("profile");
  const [cardIndex, setCardIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newToken, setNewToken] = useState("");

  // Profile fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Polish step fields
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [polishLoading, setPolishLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Pull referral code from URL
  const urlRef = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const referralCode = urlRef.get("ref") || "";

  // Track invite click from URL
  useEffect(() => {
    const inviteCode = urlRef.get("invite");
    if (inviteCode) {
      apiRequest("POST", "/api/gift-card/invite-click", { inviteCode }).catch(() => {});
    }
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setAvatarUrl(data.url);
    } catch {}
  };

  const handlePolishSave = async () => {
    setPolishLoading(true);
    try {
      const updates: Record<string, string> = {};
      if (displayName) updates.displayName = displayName;
      if (city) updates.city = city;
      if (locationState) updates.location = locationState ? `${city}, ${locationState}` : city;
      if (avatarUrl) updates.avatarUrl = avatarUrl;
      if (Object.keys(updates).length > 0) {
        await apiRequest("PATCH", "/api/auth/me", updates);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    } catch {}
    setPolishLoading(false);
    navigate("/create-listing");
  };

  const handleCreateAccount = async () => {
    if (!email || !password || !username) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/gift-card/redeem", {
        code: UNIVERSAL_CODE,
        username,
        email,
        password,
        displayName: displayName || username,
        referralCode,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAuthToken(data.token);
      setNewToken(data.token);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setStep("polish");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => navigate("/create-listing");


  // ── Polish Step ──────────────────────────────────────────────────────────────
  if (step === "polish") return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="p-5 flex justify-center border-b bg-white">
        <Logo />
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border max-w-md w-full p-8 space-y-6">
          <div className="text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h2 className="text-xl font-black text-slate-900">You're in! 40 SB added.</h2>
            <p className="text-sm text-muted-foreground mt-1">Add a photo and your location so buyers know who they're dealing with.</p>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="h-24 w-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 hover:border-primary flex items-center justify-center overflow-hidden transition-colors"
              data-testid="avatar-upload"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
                  <p className="text-[10px] text-muted-foreground mt-1">Add photo</p>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <p className="text-xs text-muted-foreground">Profile photo (optional)</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Jane Smith"
                className="rounded-xl"
                data-testid="polish-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Chicago" className="pl-9 rounded-xl" data-testid="polish-city" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={locationState} onChange={e => setLocationState(e.target.value)} placeholder="IL" className="rounded-xl" data-testid="polish-state" />
              </div>
            </div>
          </div>

          <Button
            onClick={handlePolishSave}
            disabled={polishLoading}
            className="w-full rounded-xl h-12 font-bold gap-2"
            data-testid="polish-continue-btn"
          >
            {polishLoading ? "Saving..." : <>Continue <ArrowRight className="h-4 w-4" /></>}
          </Button>
          <p className="text-center">
            <button
              onClick={() => navigate("/welcome-tour")}
              className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
            >
              Skip for now
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  // ── Profile Step ─────────────────────────────────────────────────────────────
  if (step === "profile") return (
    <div className="min-h-screen bg-gradient-to-br from-[#5A45FF]/10 via-white to-[#FF4D6D]/5 flex flex-col">
      <header className="p-5 flex justify-center">
        <Logo />
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 space-y-5">
          <div className="text-center">
            <img src="/gift-card.png" alt="$40 Gift Card" className="mx-auto w-48 mb-4" />
            <h2 className="text-2xl font-black text-slate-900">Claim your $40 in Swap Bucks</h2>
            <p className="text-sm text-muted-foreground mt-1">Spend it on anything in the marketplace. No catch, no credit card.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Username *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))} placeholder="janesmith" className="pl-7 rounded-xl" data-testid="profile-username" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" className="pl-9 rounded-xl" data-testid="profile-email" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" className="rounded-xl" data-testid="profile-password" />
            </div>
          </div>

          <Button
            onClick={handleCreateAccount}
            className="w-full rounded-xl h-12 font-bold gap-2"
            disabled={loading}
            data-testid="create-account-btn"
          >
            {loading ? "Creating your account..." : <>Claim My 40 Swap Bucks <ArrowRight className="h-4 w-4" /></>}
          </Button>
          <p className="text-xs text-center text-muted-foreground">By creating an account you agree to our <a href="/#/terms" className="text-primary hover:underline">Terms of Service</a>.</p>
        </div>
      </div>
    </div>
  );

  return null;
}
