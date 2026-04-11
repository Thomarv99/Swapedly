import { AuthenticatedLayout } from "@/components/layouts";
import { SwapBucksAmount } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, resolveImageUrl } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Crown, Medal, Trophy, Coins, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type LeaderEntry = {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  membershipTier: string;
  totalEarned: number;
  balance: number;
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-sm shrink-0">
        <Trophy className="h-3.5 w-3.5 text-white" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-sm shrink-0">
        <Medal className="h-3.5 w-3.5 text-white" />
      </div>
    );
  if (rank === 3)
    return (
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-sm shrink-0">
        <Medal className="h-3.5 w-3.5 text-white" />
      </div>
    );
  return (
    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-slate-500">{rank}</span>
    </div>
  );
}

function Avatar({ entry, size = "md" }: { entry: LeaderEntry; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-8 w-8 text-sm" : "h-9 w-9 text-sm";
  return (
    <div className={`${sz} rounded-full overflow-hidden bg-primary/10 shrink-0`}>
      {entry.avatarUrl ? (
        <img src={resolveImageUrl(entry.avatarUrl)} alt={entry.username} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-primary font-bold">
          {(entry.displayName || entry.username)[0].toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();

  const { data: leaders, isLoading } = useQuery<LeaderEntry[]>({
    queryKey: ["/api/leaderboard"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 30_000,
  });

  const top3 = leaders?.slice(0, 3) || [];
  const rest = leaders?.slice(3) || [];
  const myRank = leaders?.findIndex((l) => l.userId === user?.id) ?? -1;

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 max-w-2xl">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h1 className="text-xl font-bold" data-testid="leaderboard-title">Swap Bucks Leaderboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">Top earners across the Swapedly community</p>
        </div>

        {/* My rank banner */}
        {user && myRank >= 0 && leaders && (
          <Card className="rounded-xl border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <RankBadge rank={myRank + 1} />
              <Avatar entry={leaders[myRank]} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary">Your rank: #{myRank + 1}</p>
                <p className="text-xs text-muted-foreground">
                  {myRank === 0
                    ? "You're at the top! 🏆"
                    : `${Math.round(leaders[myRank - 1].totalEarned - leaders[myRank].totalEarned).toLocaleString()} SB behind #${myRank}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-yellow-600">{leaders[myRank].totalEarned.toLocaleString()} SB</p>
                <p className="text-[10px] text-muted-foreground">total earned</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 3 podium */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="rounded-xl">
                <CardContent className="p-4 text-center">
                  <Skeleton className="h-14 w-14 rounded-full mx-auto mb-2" />
                  <Skeleton className="h-4 w-20 mx-auto mb-1" />
                  <Skeleton className="h-3 w-14 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : top3.length >= 3 ? (
          <div className="grid grid-cols-3 gap-3">
            <PodiumCard entry={top3[1]} rank={2} />
            <PodiumCard entry={top3[0]} rank={1} featured />
            <PodiumCard entry={top3[2]} rank={3} />
          </div>
        ) : null}

        {/* Full rankings */}
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <Coins className="h-4 w-4 text-yellow-500" />
              Full Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : leaders && leaders.length > 0 ? (
              <div className="divide-y">
                {leaders.map((entry, idx) => {
                  const isMe = entry.userId === user?.id;
                  return (
                    <div
                      key={entry.userId}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50",
                        isMe && "bg-primary/5 hover:bg-primary/10",
                        idx < 3 && "bg-amber-50/40 hover:bg-amber-50/60"
                      )}
                      data-testid={`leaderboard-row-${entry.userId}`}
                    >
                      <RankBadge rank={idx + 1} />
                      <Avatar entry={entry} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={cn("font-medium text-sm truncate", isMe && "text-primary")}>
                            {entry.displayName || entry.username}
                          </p>
                          {isMe && (
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">you</span>
                          )}
                          {entry.membershipTier === "plus" && (
                            <span className="inline-flex items-center gap-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                              <Crown className="h-2.5 w-2.5" />PLUS
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {entry.totalEarned.toLocaleString()} SB earned total
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-yellow-600">{entry.balance.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">SB balance</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 text-center">
                <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No entries yet. Be the first!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA for guests */}
        {!user && (
          <Card className="rounded-xl border-primary/20 bg-primary/5">
            <CardContent className="p-5 text-center">
              <Zap className="h-7 w-7 text-primary mx-auto mb-2" />
              <h3 className="font-bold text-sm">Want to make the leaderboard?</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                List items, complete tasks, refer friends, and share on social media to earn Swap Bucks.
              </p>
              <Link href="/signup">
                <button className="bg-primary text-white text-xs font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition-colors">
                  Join Swapedly Free
                </button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

function PodiumCard({ entry, rank, featured = false }: { entry: LeaderEntry; rank: number; featured?: boolean }) {
  const gradients = {
    1: "from-yellow-400 to-amber-500",
    2: "from-slate-300 to-slate-400",
    3: "from-amber-600 to-amber-700",
  };
  const g = gradients[rank as 1 | 2 | 3];

  return (
    <Card className={cn("rounded-xl text-center overflow-hidden", featured && "ring-2 ring-yellow-400 shadow-md shadow-yellow-100/60")}>
      <div className={`h-1 bg-gradient-to-r ${g}`} />
      <CardContent className="p-3 pt-4">
        <div className="relative inline-block mb-2">
          <div className="h-12 w-12 rounded-full overflow-hidden bg-primary/10 mx-auto">
            {entry.avatarUrl ? (
              <img src={resolveImageUrl(entry.avatarUrl)} alt={entry.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">
                {(entry.displayName || entry.username)[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br ${g} flex items-center justify-center`}>
            <span className="text-white text-[9px] font-bold">{rank}</span>
          </div>
        </div>
        <p className="font-semibold text-xs truncate leading-tight">{entry.displayName || entry.username}</p>
        {entry.membershipTier === "plus" && (
          <div className="flex items-center justify-center gap-0.5 mt-0.5">
            <Crown className="h-2.5 w-2.5 text-yellow-500" />
            <span className="text-[9px] text-yellow-600 font-bold">PLUS</span>
          </div>
        )}
        <p className="text-sm font-bold text-yellow-600 mt-1.5">{entry.totalEarned.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">SB earned</p>
      </CardContent>
    </Card>
  );
}
