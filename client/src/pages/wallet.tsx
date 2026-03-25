import { AuthenticatedLayout } from "@/components/layouts";
import { SwapBucksAmount, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Coins, ArrowUpRight, ArrowDownRight, TrendingUp, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import type { WalletLedger } from "@shared/schema";

const cashflowData = [
  { month: "Jan", earned: 120, spent: 80 },
  { month: "Feb", earned: 320, spent: 230 },
  { month: "Mar", earned: 500, spent: 320 },
  { month: "Apr", earned: 850, spent: 520 },
  { month: "May", earned: 1130, spent: 680 },
  { month: "Jun", earned: 1530, spent: 900 },
];

export default function WalletPage() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: wallet } = useQuery<{ balance: number; totalEarned: number; totalSpent: number }>({
    queryKey: ["/api/wallet"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const { data: ledgerData } = useQuery<WalletLedger[]>({
    queryKey: ["/api/wallet/ledger"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const ledger = Array.isArray(ledgerData) ? ledgerData : [];
  const filtered = typeFilter === "all" ? ledger : ledger.filter((e) => e.type === typeFilter);

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Wallet</h1>
            <p className="text-muted-foreground">Manage your Swap Bucks</p>
          </div>
          <Link href="/earn">
            <Button className="rounded-xl gap-2" data-testid="earn-more-btn">
              <Sparkles className="h-4 w-4" />
              Earn More Bucks
            </Button>
          </Link>
        </div>

        {/* Balance card */}
        <Card className="rounded-2xl bg-gradient-to-r from-[#5A45FF] to-[#7B68EE] text-white overflow-hidden relative">
          <CardContent className="p-8 relative z-10">
            <p className="text-white/70 text-sm">Available Balance</p>
            <div className="flex items-center gap-3 mt-2">
              <Coins className="h-10 w-10 text-yellow-300" />
              <span className="text-5xl font-bold tabular-nums">{(wallet?.balance ?? 0).toLocaleString()}</span>
              <span className="text-2xl text-white/70">SB</span>
            </div>
          </CardContent>
          <div className="absolute top-4 right-8 text-8xl font-black text-white/5 select-none">
            SWAPEDLY
          </div>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-xl font-bold text-green-600">
                  +{(wallet?.totalEarned ?? 0).toLocaleString()} SB
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-xl font-bold text-red-600">
                  -{(wallet?.totalSpent ?? 0).toLocaleString()} SB
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cashflow Chart */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Cashflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflowData}>
                  <defs>
                    <linearGradient id="earnedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5A45FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#5A45FF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF4D6D" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FF4D6D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="earned" stroke="#5A45FF" fill="url(#earnedGrad)" name="Earned" />
                  <Area type="monotone" dataKey="spent" stroke="#FF4D6D" fill="url(#spentGrad)" name="Spent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Boost promo */}
        <Card className="rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-yellow-400/20 flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Boost Your Balance</h3>
              <p className="text-sm text-muted-foreground">Earn SB by referring friends, completing tasks, or listing items.</p>
            </div>
            <Link href="/earn">
              <Button className="rounded-xl" data-testid="boost-balance-btn">Start Earning</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Transaction history */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transaction History</CardTitle>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44 rounded-xl" data-testid="tx-type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="welcome_bonus">Welcome Bonus</SelectItem>
                <SelectItem value="listing_credit">Listing Credit</SelectItem>
                <SelectItem value="referral_bonus">Referral Bonus</SelectItem>
                <SelectItem value="earn_task">Earn Task</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No transactions found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">{format(new Date(entry.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell><StatusBadge status={entry.type} /></TableCell>
                      <TableCell className="text-sm">{entry.description}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={entry.amount >= 0 ? "text-green-600" : "text-red-600"}>
                          {entry.amount >= 0 ? "+" : ""}{entry.amount} SB
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
