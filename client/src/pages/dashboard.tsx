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
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
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

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold" data-testid="dashboard-welcome">
            Welcome back, {user?.displayName || user?.username}!
          </h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your account.</p>
        </div>

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
