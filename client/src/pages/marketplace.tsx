import { PublicLayout } from "@/components/layouts";
import { ListingCard, SwapBucksAmount } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useState } from "react";
import type { Listing, User } from "@shared/schema";

const CATEGORIES = [
  "Electronics", "Gaming", "Fashion", "Home & Garden", "Sports & Outdoors",
  "Books & Media", "Toys & Hobbies", "Auto & Parts", "Musical Instruments",
  "Art & Collectibles", "Services", "Other",
];

const CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"];

const PRICE_RANGES = [
  { label: "Any Price", value: "any" },
  { label: "Under 50 SB", value: "0-50" },
  { label: "50 - 200 SB", value: "50-200" },
  { label: "200 - 500 SB", value: "200-500" },
  { label: "500+ SB", value: "500-999999" },
];

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState("any");
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (sortBy) queryParams.set("sort", sortBy);
  if (selectedCategories.length) queryParams.set("categories", selectedCategories.join(","));
  if (selectedConditions.length) queryParams.set("conditions", selectedConditions.join(","));
  if (priceRange !== "any") {
    const [min, max] = priceRange.split("-");
    queryParams.set("minPrice", min);
    queryParams.set("maxPrice", max);
  }

  const { data, isLoading } = useQuery<{ listings: (Listing & { seller?: User })[] }>({
    queryKey: ["/api/listings?" + queryParams.toString()],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const listings = data?.listings || (Array.isArray(data) ? data : []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleCondition = (cond: string) => {
    setSelectedConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  const activeFilters = [
    ...selectedCategories.map((c) => ({ label: c, clear: () => toggleCategory(c) })),
    ...selectedConditions.map((c) => ({ label: c, clear: () => toggleCondition(c) })),
    ...(priceRange !== "any"
      ? [{ label: PRICE_RANGES.find((p) => p.value === priceRange)?.label || priceRange, clear: () => setPriceRange("any") }]
      : []),
  ];

  const clearAll = () => {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setPriceRange("any");
    setSearch("");
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Marketplace</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : `${listings.length} items available`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl"
                data-testid="marketplace-search"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 rounded-xl" data-testid="sort-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden rounded-xl"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="filter-toggle"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {activeFilters.map((f, i) => (
              <Badge key={i} variant="secondary" className="gap-1 rounded-lg">
                {f.label}
                <button onClick={f.clear} data-testid={`clear-filter-${i}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <button onClick={clearAll} className="text-xs text-primary hover:underline" data-testid="clear-all-filters">
              Clear all
            </button>
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar filters */}
          <aside className={`w-64 shrink-0 space-y-6 ${showFilters ? "block" : "hidden lg:block"}`}>
            <div>
              <h3 className="font-semibold text-sm mb-3">Category</h3>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <div key={cat} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${cat}`}
                      checked={selectedCategories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                      data-testid={`category-${cat}`}
                    />
                    <Label htmlFor={`cat-${cat}`} className="text-sm font-normal">{cat}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-3">Price Range (SB)</h3>
              <RadioGroup value={priceRange} onValueChange={setPriceRange}>
                {PRICE_RANGES.map((pr) => (
                  <div key={pr.value} className="flex items-center gap-2">
                    <RadioGroupItem value={pr.value} id={`price-${pr.value}`} data-testid={`price-${pr.value}`} />
                    <Label htmlFor={`price-${pr.value}`} className="text-sm font-normal">{pr.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-3">Condition</h3>
              <div className="space-y-2">
                {CONDITIONS.map((cond) => (
                  <div key={cond} className="flex items-center gap-2">
                    <Checkbox
                      id={`cond-${cond}`}
                      checked={selectedConditions.includes(cond.toLowerCase().replace(" ", "_"))}
                      onCheckedChange={() => toggleCondition(cond.toLowerCase().replace(" ", "_"))}
                      data-testid={`condition-${cond}`}
                    />
                    <Label htmlFor={`cond-${cond}`} className="text-sm font-normal">{cond}</Label>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border p-3">
                    <Skeleton className="aspect-[4/3] rounded-lg mb-3" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No listings found. Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing: any) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    seller={listing.seller}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
