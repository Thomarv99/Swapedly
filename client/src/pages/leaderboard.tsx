import { PublicLayout } from "@/components/layouts";
import { UserAvatar, SwapBucksAmount } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, resolveImageUrl } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Crown, Medal, Trophy, Star, Coins, TrendingUp, Zap } from "lucide-react";
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
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-md shrink-0">
        <Trophy className="h-4 w-4 text-white" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-sm shrink-0">
        <Medal className="h-4 w-4 text-white" />
      </div>
    );
  if (rank === 3)
    return (
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-sm shrink-0">
        <Medal className="h-4 w-4 text-white" />
      </div>
    );
  return (
    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-muted-foreground">{rank}</span>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();

  const { data: leaders, isLoading } = useQuery<LeaderEntry[]>({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard?limit=50");
      return res.json();
    },
    staleTime: 30000, // refresh every 30s
  });

  const top3 = leaders?.slice(0, 3) || [];
  const rest = leaders?.slice(3) || [];
  const myRank = leaders?.findIndex((l) => l.userId === user?.id);

  return (
    <PublicLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            <TrendingUp className="h-4 w-4" />
            Updated in real time
          </div>
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2" data-testid="leaderboard-title">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Swap Bucks Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top earners across the Swapedly community
          </p>
        </div>

        {/* My rank banner */}
        {user && myRank !== undefined && myRank >= 0 && (
          <Card className="rounded-xl border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-4">
              <RankBadge rank={myRank + 1} />
              <div className="flex-1">
                <p className="text-sm font-semibold">Your rank: #{myRank + 1}</p>
                <p className="text-xs text-muted-foreground">
                  {myRank === 0 ? "You're at the top! 🏆" : `${leaders![myRank - 1].totalEarned - leaders![myRank].totalEarned} SB behind #${myRank}`}
                </p>
              </div>
              <SwapBucksAmount amount={leaders![myRank].totalEarned} size="sm" className="font-bold" />
            </CardContent>
          </Card>
        )}

        {/* Top 3 podium */}
        {!isLoading && top3.length >= 3 && (
          <div className="grid grid-cols-3 gap-3">
            {/* 2nd place */}
            <PodiumCard entry={top3[1]} rank={2} />
            {/* 1st place */}
            <PodiumCard entry={top3[0]} rank={1} featured />
            {/* 3rd place */}
            <PodiumCard entry={top3[2]} rank={3} />
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="rounded-xl">
                <CardContent className="p-4 text-center">
                  <Skeleton className="h-14 w-14 rounded-full mx-auto mb-2" />
                  <Skeleton className="h-4 w-20 mx-auto mb-1" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Full rankings list */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="h-4 w-4 text-yellow-500" />
              Full Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16" />
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
                        "flex items-center gap-3 px-4 py-3 transition-colors",
                        isMe && "bg-primary/5",
                        idx < 3 && "bg-gradient-to-r from-yellow-50/50 to-transparent"
                      )}
                      data-testid={`leaderboard-row-${entry.userId}`}
                    >
                      <RankBadge rank={idx + 1} />

                      <div className="h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0">
                        {entry.avatarUrl ? (
                          <img
                            src={resolveImageUrl(entry.avatarUrl)}
                            alt={entry.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm">
                            {(entry.displayName || entry.username)[0].toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={cn("font-medium text-sm truncate", isMe && "text-primary")}>
                            {entry.displayName || entry.username}
                            {isMe && <span className="text-xs text-primary ml-1">(you)</span>}
                          </p>
                          {entry.membershipTier === "plus" && (
                            <span className="inline-flex items-center gap-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                              <Crown className="h-2.5 w-2.5" />
                              PLUS
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {entry.totalEarned.toLocaleString()} SB earned total
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-yellow-600">
                          {entry.balance.toLocaleString()} SB
                        </p>
                        <p className="text-[10px] text-muted-foreground">balance</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No entries yet. Be the first!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How to earn CTA */}
        {!user && (
          <Card className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-5 text-center">
              <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-bold">Want to make the leaderboard?</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                List items, complete tasks, refer friends, and share on social media to earn Swap Bucks.
              </p>
              <Link href="/signup">
                <button className="bg-primary text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-primary/90 transition-colors">
                  Join Swapedly Free
                </button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </PublicLayout>
  );
}

function PodiumCard({ entry, rank, featured = false }: { entry: LeaderEntry; rank: number; featured?: boolean }) {
  const colors = {
    1: "from-yellow-400 to-amber-500",
    2: "from-slate-300 to-slate-400",
    3: "from-amber-600 to-amber-700",
  };

  return (
    <Card className={cn("rounded-xl text-center overflow-hidden", featured && "ring-2 ring-yellow-400 shadow-lg shadow-yellow-100")}>
      <div className={`h-1.5 bg-gradient-to-r ${colors[rank as 1 | 2 | 3]}`} />
      <CardContent className="p-4">
        <div className="relative inline-block mb-2">
          <div className="h-14 w-14 rounded-full overflow-hidden bg-muted mx-auto">
            {entry.avatarUrl ? (
              <img src={resolveImageUrl(entry.avatarUrl)} alt={entry.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-lg">
                {(entry.displayName || entry.username)[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br ${colors[rank as 1 | 2 | 3]} flex items-center justify-center`}>
            <span className="text-white text-[10px] font-bold">{rank}</span>
          </div>
        </div>
        <p className="font-semibold text-xs truncate">{entry.displayName || entry.username}</p>
        {entry.membershipTier === "plus" && (
          <div className="flex items-center justify-center gap-0.5 mt-0.5">
            <Crown className="h-2.5 w-2.5 text-yellow-500" />
            <span className="text-[9px] text-yellow-600 font-bold">PLUS</span>
          </div>
        )}
        <p className="text-sm font-bold text-yellow-600 mt-1">{entry.totalEarned.toLocaleString()} SB</p>
        <p className="text-[10px] text-muted-foreground">earned</p>
      </CardContent>
    </Card>
  );
}
