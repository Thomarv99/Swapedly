import { AuthenticatedLayout } from "@/components/layouts";
import { SwapBucksAmount, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Coins, Copy, Users, ClipboardList, Download, Share2, Star,
  ShoppingBag, Gift, Check, ArrowRight, Sparkles,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
import type { EarnTask, WalletLedger } from "@shared/schema";

const taskIcons: Record<string, any> = {
  survey: ClipboardList,
  app_download: Download,
  social_share: Share2,
  review_offer: Star,
  referral: Users,
  purchase_sb: ShoppingBag,
};

export default function EarnPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: wallet } = useQuery<{ balance: number }>({
    queryKey: ["/api/wallet"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const { data: tasks } = useQuery<EarnTask[]>({
    queryKey: ["/api/earn/tasks"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const { data: earningsData } = useQuery<WalletLedger[]>({
    queryKey: ["/api/wallet/ledger?type=earn_task"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("POST", `/api/earn/complete/${taskId}`);
    },
    onSuccess: () => {
      toast({ title: "Task completed! SB credited to your wallet." });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/ledger"] });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const referralCode = user?.referralCode || "SWAP-XXXXX";
  const referralLink = `${window.location.origin}/#/signup?ref=${referralCode}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Referral link copied!" });
  };

  const tasksList = Array.isArray(tasks) ? tasks.filter((t) => t.isActive) : [];
  const earnings = Array.isArray(earningsData) ? earningsData : [];

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Earn Swap Bucks</h1>
            <p className="text-muted-foreground">Complete tasks and refer friends to earn SB</p>
          </div>
          <div className="flex items-center gap-2 bg-yellow-50 rounded-xl px-4 py-2 border border-yellow-200">
            <Coins className="h-5 w-5 text-yellow-600" />
            <span className="font-bold text-lg">{wallet?.balance?.toLocaleString() ?? 0}</span>
            <span className="text-sm text-muted-foreground">SB</span>
          </div>
        </div>

        {/* Referral Hero */}
        <Card className="rounded-2xl bg-gradient-to-r from-[#5A45FF] to-[#7B68EE] text-white overflow-hidden">
          <CardContent className="p-8 relative">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-6 w-6 text-yellow-300" />
                <h2 className="text-xl font-bold">Referral Program</h2>
              </div>
              <p className="text-white/80 mb-6 max-w-lg">
                Invite friends to Swapedly and you&apos;ll both earn <strong>500 SB</strong> when they sign up!
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 bg-white/10 backdrop-blur rounded-xl px-4 py-3 flex items-center gap-2">
                  <span className="text-sm font-mono truncate flex-1">{referralLink}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={copyReferral}
                    className="rounded-lg shrink-0 gap-1"
                    data-testid="copy-referral-btn"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-white/60">Total Referrals</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">0 SB</p>
                  <p className="text-xs text-white/60">SB Earned</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center sm:block hidden">
                  <Progress value={0} className="h-2 bg-white/20 mt-2" />
                  <p className="text-xs text-white/60 mt-2">Next Milestone: 5 referrals</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* More Ways to Earn */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            More Ways to Earn
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasksList.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full text-center py-8">No earn tasks available right now.</p>
            ) : (
              tasksList.map((task) => {
                const Icon = taskIcons[task.type] || Coins;
                return (
                  <Card key={task.id} className="rounded-xl hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{task.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                          <div className="flex items-center justify-between mt-3">
                            <SwapBucksAmount amount={task.reward} size="sm" className="font-semibold text-green-600" />
                            <Button
                              size="sm"
                              className="rounded-lg gap-1"
                              onClick={() => completeMutation.mutate(task.id)}
                              disabled={completeMutation.isPending}
                              data-testid={`earn-task-${task.id}`}
                            >
                              Start <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Earnings History */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Earnings History</CardTitle>
          </CardHeader>
          <CardContent>
            {earnings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No earnings recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">{format(new Date(entry.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell><StatusBadge status={entry.type} /></TableCell>
                      <TableCell className="text-sm">{entry.description}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">+{entry.amount} SB</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      {/* Buy Swap Bucks */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-5 w-5 text-yellow-500" />
            Buy Swap Bucks
          </CardTitle>
          <p className="text-sm text-muted-foreground">Need SB fast? Top up your wallet instantly.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { pack: "100", sb: 100, price: "$100.00", tag: null },
              { pack: "500", sb: 500, price: "$500.00", tag: "Popular" },
              { pack: "1000", sb: 1000, price: "$1,000.00", tag: "Best Value" },
            ].map((item) => (
              <button
                key={item.pack}
                onClick={async () => {
                  try {
                    const res = await apiRequest("POST", "/api/stripe/buy-swap-bucks", { pack: item.pack });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
                className="relative rounded-xl border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all p-4 text-center"
                data-testid={`buy-sb-${item.pack}`}
              >
                {item.tag && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.tag}
                  </span>
                )}
                <p className="text-2xl font-black text-yellow-500">{item.sb}</p>
                <p className="text-xs text-muted-foreground mb-1">Swap Bucks</p>
                <p className="text-sm font-bold text-green-700">{item.price}</p>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-3">Secure checkout via Stripe · Instant delivery to your wallet</p>
        </CardContent>
      </Card>
      </div>
    </AuthenticatedLayout>
  );
}
