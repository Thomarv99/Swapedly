import { PublicLayout } from "@/components/layouts";
import { ListingCard, RatingStars, UserAvatar, VerifiedBadge, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Package, Repeat, Star, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link, useParams } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import type { User, Listing, Review } from "@shared/schema";

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const { data: profile, isLoading } = useQuery<User & { listings?: Listing[]; reviews?: Review[]; stats?: any }>({
    queryKey: [`/api/users/${id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <Skeleton className="h-64 w-full" />
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-64" />
        </div>
      </PublicLayout>
    );
  }

  if (!profile) {
    return (
      <PublicLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">User not found.</p>
        </div>
      </PublicLayout>
    );
  }

  const listings = profile.listings || [];
  const reviews = profile.reviews || [];
  const stats = profile.stats || {};

  return (
    <PublicLayout>
      {/* Dark header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#5A45FF]/80 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-start gap-6">
            <UserAvatar user={profile} size="lg" showVerified />
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{profile.displayName || profile.username}</h1>
                {profile.isVerified && <VerifiedBadge />}
              </div>
              {profile.location && (
                <p className="text-white/70 flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </p>
              )}
              {profile.bio && <p className="mt-2 text-white/80 max-w-lg">{profile.bio}</p>}

              <div className="flex items-center gap-6 mt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.totalListings || listings.length}</p>
                  <p className="text-xs text-white/60">Items Listed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.successfulTrades || 0}</p>
                  <p className="text-xs text-white/60">Successful Trades</p>
                </div>
                <div className="text-center">
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(profile.joinedAt), "MMM yyyy")}
                  </p>
                  <p className="text-xs text-white/60">Member Since</p>
                </div>
                <div className="text-center">
                  <RatingStars rating={stats.averageRating || 0} count={stats.reviewCount || 0} />
                  <p className="text-xs text-white/60">Average Rating</p>
                </div>
              </div>
            </div>
            {currentUser && currentUser.id !== Number(id) && (
              <Link href="/messages">
                <Button variant="secondary" className="rounded-xl gap-2" data-testid="message-user-btn">
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Active Listings */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Active Listings
          </h2>
          {listings.length === 0 ? (
            <p className="text-muted-foreground">No active listings.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {listings.map((listing: Listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5" />
            Recent Reviews
          </h2>
          {reviews.length === 0 ? (
            <p className="text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r: Review) => (
                <Card key={r.id} className="rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <RatingStars rating={r.rating} />
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm">{r.comment}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </PublicLayout>
  );
}
