import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Star, Truck, MapPin, Coins, CheckCircle, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

// ============================
// SwapBucksAmount
// ============================
export function SwapBucksAmount({
  amount,
  size = "default",
  className,
}: {
  amount: number;
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
}) {
  const sizeClasses = {
    sm: "text-sm",
    default: "text-base",
    lg: "text-lg font-semibold",
    xl: "text-2xl font-bold",
  };
  return (
    <span className={cn("inline-flex items-center gap-1", sizeClasses[size], className)} data-testid="swap-bucks-amount">
      <Coins className={cn("text-yellow-500", size === "xl" ? "h-6 w-6" : size === "lg" ? "h-5 w-5" : "h-4 w-4")} />
      <span>{amount.toLocaleString()}</span>
      <span className="text-muted-foreground">SB</span>
    </span>
  );
}

// ============================
// RatingStars
// ============================
export function RatingStars({ rating, count, size = "sm" }: { rating: number; count?: number; size?: "sm" | "default" }) {
  const s = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-1" data-testid="rating-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(s, i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300")}
        />
      ))}
      {count !== undefined && <span className="text-xs text-muted-foreground ml-0.5">({count})</span>}
    </span>
  );
}

// ============================
// UserAvatar
// ============================
export function UserAvatar({
  user,
  size = "default",
  showOnline,
  showVerified,
}: {
  user: { displayName?: string | null; username?: string; avatarUrl?: string | null; isVerified?: boolean };
  size?: "sm" | "default" | "lg";
  showOnline?: boolean;
  showVerified?: boolean;
}) {
  const sizeClass = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-16 w-16" : "h-10 w-10";
  const name = user.displayName || user.username || "U";
  return (
    <span className="relative inline-flex" data-testid="user-avatar">
      <Avatar className={sizeClass}>
        <AvatarImage src={user.avatarUrl || undefined} alt={name} />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {showOnline && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
      )}
      {showVerified && user.isVerified && (
        <CheckCircle className="absolute -bottom-0.5 -right-0.5 h-4 w-4 fill-blue-500 text-white" />
      )}
    </span>
  );
}

// ============================
// DeliveryBadge
// ============================
export function DeliveryBadge({ options }: { options: { localPickup?: boolean; shipping?: boolean; shippingCost?: number } }) {
  return (
    <span className="inline-flex items-center gap-2" data-testid="delivery-badge">
      {options.shipping && (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Truck className="h-3 w-3" />
          Ship{options.shippingCost ? ` +${options.shippingCost} SB` : ""}
        </Badge>
      )}
      {options.localPickup && (
        <Badge variant="secondary" className="gap-1 text-xs">
          <MapPin className="h-3 w-3" />
          Pickup
        </Badge>
      )}
    </span>
  );
}

// ============================
// StatusBadge
// ============================
const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-700",
  removed: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
  disputed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-700",
  open: "bg-yellow-100 text-yellow-700",
  under_review: "bg-orange-100 text-orange-700",
  resolved_buyer: "bg-green-100 text-green-700",
  resolved_seller: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
  new: "bg-emerald-100 text-emerald-700",
  like_new: "bg-green-100 text-green-700",
  good: "bg-blue-100 text-blue-700",
  fair: "bg-yellow-100 text-yellow-700",
  poor: "bg-red-100 text-red-700",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const color = statusColors[status] || "bg-gray-100 text-gray-700";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", color, className)} data-testid="status-badge">
      {label}
    </span>
  );
}

// ============================
// ListingCard
// ============================
export function ListingCard({
  listing,
  seller,
}: {
  listing: {
    id: number;
    title: string;
    price: number;
    condition: string;
    images?: string | null;
    status?: string;
  };
  seller?: {
    id?: number;
    username?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    rating?: number;
  };
}) {
  const [liked, setLiked] = useState(false);
  const images = listing.images ? JSON.parse(listing.images) : [];
  const thumbUrl = images[0] || "https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image";

  return (
    <Card className="group overflow-hidden rounded-xl border hover:shadow-lg transition-shadow" data-testid="listing-card">
      <Link href={`/listing/${listing.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img src={thumbUrl} alt={listing.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
          <StatusBadge status={listing.condition} className="absolute top-2 left-2" />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setLiked(!liked); }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur hover:bg-white transition-colors"
            data-testid="favorite-button"
          >
            <Heart className={cn("h-4 w-4", liked ? "fill-red-500 text-red-500" : "text-gray-600")} />
          </button>
        </div>
      </Link>
      <CardContent className="p-3">
        <Link href={`/listing/${listing.id}`}>
          <h3 className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors">{listing.title}</h3>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <SwapBucksAmount amount={listing.price} size="sm" className="font-semibold text-foreground" />
        </div>
        {seller && (
          <div className="mt-2 flex items-center gap-2 pt-2 border-t">
            <UserAvatar user={seller} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{seller.displayName || seller.username}</p>
              {seller.rating !== undefined && <RatingStars rating={seller.rating} size="sm" />}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================
// VerifiedBadge
// ============================
export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-blue-600" data-testid="verified-badge">
      <ShieldCheck className="h-4 w-4 fill-blue-100" />
      <span className="text-xs font-medium">Verified</span>
    </span>
  );
}
