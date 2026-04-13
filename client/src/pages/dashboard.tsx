import { AuthenticatedLayout } from "@/components/layouts";
import { SwapBucksAmount, StatusBadge, UserAvatar } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Coins, Package, Mail, Scale, Wallet, PlusCircle, MessageSquare, TrendingUp,
  ArrowUpRight, ArrowDownRight, ShoppingBag, Lock, Gift,
  Check, Camera, ListPlus, Share2, Facebook, Zap,
} from "lucide-react";
import { useOnboarding } from "@/components/onboarding-guard";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { WalletLedger, Conversation } from "@shared/schema";

// Mock chart data for display
const chartData = [
  { month: "Jan", earned: 120, spent: 80 },
  { month: "Feb", earned: 200, spent: 150 },
  { month: "Mar", earned: 180, spent: 90 },
  { month: "Apr", earned: 350, spent: 200 },
  { month: "May", earned: 280, spent: 160 },
  { month: "Jun", earned: 400, spent: 220 },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: wallet } = useQuery<{ balance: number; totalEarned: number; totalSpent: number }>({
    queryKey: ["/api/wallet"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const { data: statsData } = useQuery<{
    activeListings: number;
    unreadMessages: number;
    openDisputes: number;
    recentTransactions: WalletLedger[];
    recentConversations: any[];
  }>({
    queryKey: ["/api/dashboard"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const stats = [
    {
      label: "Total Balance",
      value: wallet?.balance ?? 0,
      icon: Coins,
      isSB: true,
      color: "text-yellow-600 bg-yellow-50",
    },
    {
      label: "Active Listings",
      value: statsData?.activeListings ?? 0,
      icon: Package,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Unread Messages",
      value: statsData?.unreadMessages ?? 0,
      icon: Mail,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Open Disputes",
      value: statsData?.openDisputes ?? 0,
      icon: Scale,
      color: "text-red-600 bg-red-50",
    },
  ];

  const quickActions = [
    { label: "View Wallet", icon: Wallet, href: "/wallet" },
    { label: "Create Listing", icon: PlusCircle, href: "/create-listing" },
    { label: "View Messages", icon: MessageSquare, href: "/messages" },
    { label: "Earn Bucks", icon: TrendingUp, href: "/earn" },
  ];

  const { data: onboarding } = useOnboarding();
  const sbBalance = wallet?.totalEarned ?? 0;
  const sbRequired = 60;
  const marketplaceUnlocked = onboarding?.canAccessMarketplace ?? false;
  const progressPct = Math.min(100, Math.round((sbBalance / sbRequired) * 100));

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Marketplace unlock progress banner */}
        {onboarding && !marketplaceUnlocked && (
          <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-violet-50 p-4" data-testid="marketplace-unlock-banner">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm">Unlock the Marketplace</p>
                  <span className="text-sm font-bold text-primary">{Math.round(sbBalance)} / {sbRequired} SB</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Earn <strong>{Math.max(0, sbRequired - Math.round(sbBalance))} more Swap Bucks</strong> to unlock the marketplace. List items, refer friends, and complete tasks to earn SB fast!
                </p>
                <div className="h-2 rounded-full bg-primary/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {onboarding && marketplaceUnlocked && !onboarding.onboardingComplete && (
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 flex items-center gap-3">
            <ShoppingBag className="h-8 w-8 text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-green-800">🎉 Marketplace Unlocked!</p>
              <p className="text-xs text-green-700">You've earned enough Swap Bucks. Browse the marketplace and start swapping!</p>
            </div>
            <Link href="/marketplace">
              <button className="bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors shrink-0">
                Browse Now
              </button>
            </Link>
          </div>
        )}

        {/* Gift Card Sharing Banner */}
        <Card className="rounded-xl border-2 border-primary/15 bg-gradient-to-r from-primary/5 via-white to-pink-50" data-testid="gift-card-banner">
          <CardContent className="p-4 flex items-center gap-4">
            <img src="/gift-card.png" alt="Gift Card" className="h-16 w-24 object-contain shrink-0 drop-shadow" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Give friends a FREE $40 Gift Card</p>
              <p className="text-xs text-muted-foreground mt-0.5">Earn <strong className="text-primary">5 SB</strong> every time a friend redeems your link. Invite 6 friends to unlock the marketplace!</p>
            </div>
            <Link href="/gift-card/share">
              <button className="shrink-0 bg-gradient-to-r from-[#5A45FF] to-[#FF4D6D] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">
                Send Gift Cards
              </button>
            </Link>
          </CardContent>
        </Card>

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold" data-testid="dashboard-welcome">
            Welcome back, {user?.displayName || user?.username}!
          </h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your account.</p>
        </div>

        {/* Getting Started Checklist — shown until onboarding is complete */}
        {onboarding && !onboarding.onboardingComplete && (
          <GettingStartedChecklist user={user} onboarding={onboarding} />        
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="rounded-xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      {stat.isSB ? (
                        <SwapBucksAmount amount={stat.value} size="lg" className="mt-1" />
                      ) : (
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      )}
                    </div>
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 rounded-xl flex flex-col items-center gap-2"
                  data-testid={`quick-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Activity chart */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="earned" stroke="#5A45FF" strokeWidth={2} name="Earned SB" />
                  <Line type="monotone" dataKey="spent" stroke="#FF4D6D" strokeWidth={2} name="Spent SB" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <Link href="/wallet">
                <Button variant="ghost" size="sm" data-testid="view-all-transactions">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(statsData?.recentTransactions || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(statsData?.recentTransactions || []).slice(0, 5).map((tx: WalletLedger) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <StatusBadge status={tx.type} />
                        </TableCell>
                        <TableCell className="text-sm">{tx.description}</TableCell>
                        <TableCell className="text-right">
                          <span className={tx.amount >= 0 ? "text-green-600" : "text-red-600"}>
                            {tx.amount >= 0 ? "+" : ""}{tx.amount} SB
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Messages */}
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Messages</CardTitle>
              <Link href="/messages">
                <Button variant="ghost" size="sm" data-testid="view-all-messages">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(statsData?.recentConversations || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
              ) : (
                <div className="space-y-3">
                  {(statsData?.recentConversations || []).slice(0, 4).map((conv: any) => (
                    <Link key={conv.id} href={`/messages/${conv.id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                        <UserAvatar user={conv.otherUser || {}} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{conv.otherUser?.displayName || conv.otherUser?.username || "User"}</p>
                          <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || "No messages"}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {conv.lastMessageAt ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true }) : ""}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

// ─── Getting Started Checklist ───────────────────────────────────────────────
function GettingStartedChecklist({ user, onboarding }: { user: any; onboarding: any }) {
  const hasProfile = !!user?.avatarUrl && !!user?.bio && !!user?.city;
  const hasListing = (onboarding?.listingsCreated || 0) >= 1;
  const sbBalance = onboarding?.sbBalance || 0;

  const tasks = [
    {
      label: "Complete your profile",
      description: "Add a profile photo, bio, and city to earn SB",
      reward: "Earn SB",
      done: hasProfile,
      href: "/settings",
      icon: Camera,
    },
    {
      label: "List your first item",
      description: "It's 100% free — list anything in 2 minutes",
      reward: "Free",
      done: hasListing,
      href: "/create-listing",
      icon: ListPlus,
    },
    {
      label: "Send a gift card to a friend",
      description: "Share a $40 gift card and earn SB when they redeem",
      reward: "+5 SB",
      done: false, // We don't track this yet, always show as available
      href: "/gift-card/share",
      icon: Gift,
    },
    {
      label: "Post about Swapedly on Facebook",
      description: "Share Swapedly on Facebook and claim 5 SB",
      reward: "+5 SB",
      done: false,
      href: "/gift-card/share",
      icon: Facebook,
    },
  ];

  const completedCount = tasks.filter(t => t.done).length;
  const progress = (completedCount / tasks.length) * 100;

  return (
    <Card className="rounded-xl border-2 border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Getting Started
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete these tasks to earn SB and unlock the marketplace
            </p>
          </div>
          <span className="text-sm font-bold text-primary">{completedCount}/{tasks.length}</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="space-y-3">
          {tasks.map((task, i) => {
            const Icon = task.icon;
            return (
              <Link key={i} href={task.href}>
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                  task.done ? "bg-green-50 border-green-200" : "hover:bg-slate-50 border-slate-200"
                }`}>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    task.done ? "bg-green-100" : "bg-primary/10"
                  }`}>
                    {task.done
                      ? <Check className="h-5 w-5 text-green-600" />
                      : <Icon className="h-5 w-5 text-primary" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${task.done ? "line-through text-muted-foreground" : ""}`}>
                      {task.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                    task.done
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {task.done ? "✓ Done" : task.reward}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
