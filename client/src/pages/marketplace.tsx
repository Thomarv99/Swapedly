import { AuthenticatedLayout } from "@/components/layouts";
import { SwapBucksAmount } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { resolveImageUrl } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import type { Listing, User } from "@shared/schema";

const CATEGORIES = [
  "All",
  "Electronics",
  "Gaming",
  "Fashion",
  "Home & Garden",
  "Sports & Outdoors",
  "Books & Media",
  "Toys & Hobbies",
  "Auto & Parts",
  "Musical Instruments",
  "Art & Collectibles",
  "Services",
  "Other",
];

// ─── Feed Card ────────────────────────────────────────────────────────────────
function FeedCard({ listing }: { listing: Listing & { seller?: User } }) {
  const images: string[] = listing.images ? JSON.parse(listing.images) : [];
  const [imgIndex, setImgIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-cycle images when hovered (simulates video) — only if multiple images
  useEffect(() => {
    if (hovered && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setImgIndex((p) => (p + 1) % images.length);
      }, 800);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [hovered, images.length]);

  const currentSrc = images[imgIndex]
    ? resolveImageUrl(images[imgIndex])
    : "https://placehold.co/600x600/e2e8f0/94a3b8?text=No+Image";

  const sellerName = listing.seller?.displayName || listing.seller?.username || "Seller";

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setImgIndex(0); }}
      data-testid={`feed-card-${listing.id}`}
    >
      {/* Image / slideshow area — entire image is a link */}
      <Link href={`/listing/${listing.id}`}>
        <div className="relative aspect-square overflow-hidden bg-muted cursor-pointer">
          <img
            src={currentSrc}
            alt={listing.title}
            className="w-full h-full object-cover transition-all duration-300"
          />

        {/* Multi-image indicator dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={`block w-1.5 h-1.5 rounded-full transition-all ${
                  i === imgIndex ? "bg-white scale-125" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        {/* Image nav arrows (visible on hover) */}
        {images.length > 1 && hovered && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); setImgIndex((p) => (p - 1 + images.length) % images.length); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 z-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); setImgIndex((p) => (p + 1) % images.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 z-10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Highlighted badge */}
        {listing.isHighlighted && (
          <div className="absolute top-2 left-2 z-10">
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              ⭐ FEATURED
            </span>
          </div>
        )}

        {/* "Playing" animation indicator for multi-image when hovered */}
        {images.length > 1 && hovered && (
          <div className="absolute top-2 right-2 z-10 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            {images.length} photos
          </div>
        )}

        </div>
      </Link>

      {/* Card info */}
      <div className="p-3">
        <Link href={`/listing/${listing.id}`}>
          <h3 className="font-semibold text-sm line-clamp-1 hover:text-primary transition-colors">
            {listing.title}
          </h3>
        </Link>
        <div className="flex items-center justify-between mt-1">
          <SwapBucksAmount amount={listing.price} size="sm" />
          {listing.views > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Eye className="h-3 w-3" />{listing.views}
            </span>
          )}
        </div>
        {/* Seller + delivery */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[11px] text-muted-foreground truncate max-w-[60%]">by {sellerName}</span>
          {listing.deliveryOptions && (() => {
            try {
              const opts = JSON.parse(listing.deliveryOptions);
              return opts.localPickup ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                  <MapPin className="h-2.5 w-2.5" />Local pickup
                </span>
              ) : null;
            } catch { return null; }
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Main Marketplace Page ───────────────────────────────────────────────────
export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [localOnly, setLocalOnly] = useState(false);
  const [sortBy] = useState("newest");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { user } = useAuth();

  const queryParams = new URLSearchParams();
  if (debouncedSearch) queryParams.set("search", debouncedSearch);
  if (sortBy) queryParams.set("sort", sortBy);
  if (selectedCategory && selectedCategory !== "All") queryParams.set("category", selectedCategory);
  if (localOnly && (user as any)?.city) queryParams.set("city", (user as any).city);

  const { data, isLoading } = useQuery<{ listings: (Listing & { seller?: User })[] }>({
    queryKey: ["/api/listings", debouncedSearch, selectedCategory, sortBy, localOnly ? (user as any)?.city : ""],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/listings?" + queryParams.toString());
      return res.json();
    },
  });

  let listings = data?.listings || (Array.isArray(data) ? data : []);

  // Client-side local pickup filter (delivery options) — also filter if no city set
  if (localOnly && !(user as any)?.city) {
    listings = listings.filter((l) => {
      try {
        const opts = JSON.parse(l.deliveryOptions || "{}");
        return opts.localPickup === true;
      } catch { return false; }
    });
  }

  const catScrollRef = useRef<HTMLDivElement>(null);

  return (
    <AuthenticatedLayout>
      <div className="max-w-5xl mx-auto px-4 pb-10">
        {/* ── Sticky filter bar ── */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 pt-4 pb-3 mb-6 -mx-4 px-4">
          {/* Search row */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl h-10 bg-slate-50 border-slate-200"
                data-testid="marketplace-search"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Local toggle */}
            <button
              onClick={() => setLocalOnly((v) => !v)}
              className={`flex items-center gap-1.5 px-3 h-10 rounded-xl border text-sm font-medium transition-all shrink-0 ${
                localOnly
                  ? "bg-green-600 text-white border-green-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-green-500 hover:text-green-600"
              }`}
              data-testid="local-filter-btn"
            >
              <MapPin className="h-3.5 w-3.5" />
              Local
            </button>
          </div>

          {/* Category pills — horizontally scrollable */}
          <div
            ref={catScrollRef}
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
            data-testid="category-pills"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  selectedCategory === cat
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary"
                }`}
                data-testid={`category-pill-${cat}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Active filter chips ── */}
        {(selectedCategory !== "All" || localOnly) && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {selectedCategory !== "All" && (
              <Badge variant="secondary" className="gap-1 rounded-lg text-xs">
                {selectedCategory}
                <button onClick={() => setSelectedCategory("All")} data-testid="clear-category">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {localOnly && (
              <Badge variant="secondary" className="gap-1 rounded-lg text-xs">
                <MapPin className="h-3 w-3" />Local Pickup
                <button onClick={() => setLocalOnly(false)} data-testid="clear-local">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <button
              onClick={() => { setSelectedCategory("All"); setLocalOnly(false); setSearch(""); }}
              className="text-xs text-primary hover:underline"
              data-testid="clear-all-filters"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Result count ── */}
        <p className="text-sm text-muted-foreground mb-5">
          {isLoading ? "Loading..." : `${listings.length} item${listings.length !== 1 ? "s" : ""} available`}
        </p>

        {/* ── Feed grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border overflow-hidden">
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground text-sm">No listings found.</p>
            <button onClick={() => { setSelectedCategory("All"); setLocalOnly(false); setSearch(""); }} className="text-primary text-sm mt-2 hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing: any) => (
              <FeedCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
