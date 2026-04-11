import { AuthenticatedLayout } from "@/components/layouts";
import { SwapBucksAmount, StatusBadge } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  Package,
  Send,
  Archive,
  FileEdit,
  ShoppingBag,
  Loader2,
  Star,
  StarOff,
  Crown,
  Sparkles,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn, resolveImageUrl } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import type { Listing } from "@shared/schema";

type ListingWithStatus = Listing;

function ListingRow({
  listing,
  onDelete,
  onStatusChange,
  onToggleHighlight,
  isPlus,
  highlightPending,
}: {
  listing: ListingWithStatus;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  onToggleHighlight: (id: number, isHighlighted: boolean) => void;
  isPlus: boolean;
  highlightPending: boolean;
}) {
  const images = listing.images ? JSON.parse(listing.images) : [];
  const thumbUrl =
    images[0] ? resolveImageUrl(images[0]) : "https://placehold.co/80x80/e2e8f0/94a3b8?text=No+Image";
  const createdDate = new Date(listing.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card
      className="rounded-xl overflow-hidden"
      data-testid={`listing-row-${listing.id}`}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-4">
          {/* Thumbnail */}
          <Link href={`/listing/${listing.id}`} className="shrink-0">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
              <img
                src={thumbUrl}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            </div>
          </Link>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <Link href={`/listing/${listing.id}`}>
              <h3 className="font-medium text-sm line-clamp-1 hover:text-primary transition-colors">
                {listing.title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={listing.status} />
              {listing.isHighlighted && (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Star className="h-2.5 w-2.5 fill-white" />
                  FEATURED
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {listing.category}
              </span>
              <span className="text-xs text-muted-foreground">
                · {createdDate}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <SwapBucksAmount
                amount={listing.price}
                size="sm"
                className="font-semibold"
              />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {listing.views} views
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {listing.status === "draft" && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg gap-1.5 text-xs hidden sm:flex"
                onClick={() => onStatusChange(listing.id, "active")}
                data-testid={`publish-listing-${listing.id}`}
              >
                <Send className="h-3 w-3" />
                Publish
              </Button>
            )}
            {listing.status === "active" && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg gap-1.5 text-xs hidden sm:flex"
                onClick={() => onStatusChange(listing.id, "draft")}
                data-testid={`unpublish-listing-${listing.id}`}
              >
                <Archive className="h-3 w-3" />
                Unpublish
              </Button>
            )}
            {listing.status === "active" && isPlus && (
              <Button
                variant={listing.isHighlighted ? "default" : "outline"}
                size="sm"
                className={`rounded-lg gap-1.5 text-xs hidden sm:flex ${listing.isHighlighted ? "bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 border-0" : ""}`}
                onClick={() => onToggleHighlight(listing.id, !!listing.isHighlighted)}
                disabled={highlightPending}
                data-testid={`highlight-listing-${listing.id}`}
              >
                {listing.isHighlighted ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                {listing.isHighlighted ? "Unfeature" : "Feature"}
              </Button>
            )}
            <Link href={`/edit-listing/${listing.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg gap-1.5 text-xs"
                data-testid={`edit-listing-${listing.id}`}
              >
                <Edit className="h-3 w-3" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  data-testid={`listing-menu-${listing.id}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/listing/${listing.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Listing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/edit-listing/${listing.id}`}>
                    <FileEdit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                {listing.status === "draft" && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(listing.id, "active")}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Publish
                  </DropdownMenuItem>
                )}
                {listing.status === "active" && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(listing.id, "draft")}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Unpublish
                  </DropdownMenuItem>
                )}
                {listing.status === "active" && isPlus && (
                  <DropdownMenuItem
                    onClick={() => onToggleHighlight(listing.id, !!listing.isHighlighted)}
                  >
                    {listing.isHighlighted ? (
                      <><StarOff className="h-4 w-4 mr-2" />Remove Feature</>
                    ) : (
                      <><Star className="h-4 w-4 mr-2" />Feature Listing</>
                    )}
                  </DropdownMenuItem>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete listing?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove "{listing.title}" from
                        Swapedly. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => onDelete(listing.id)}
                        data-testid={`confirm-delete-${listing.id}`}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Package;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
      <Link href="/create-listing">
        <Button className="rounded-xl gap-2 mt-4" size="sm">
          <Plus className="h-4 w-4" />
          Create a Listing
        </Button>
      </Link>
    </div>
  );
}

function ListingSkeleton() {
  return (
    <Card className="rounded-xl overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyListingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const {
    data: listings,
    isLoading,
    error,
  } = useQuery<ListingWithStatus[]>({
    queryKey: ["/api/listings/user", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/listings/user/${user!.id}`);
      return res.json();
    },
    enabled: !!user,
  });

  // Membership info for highlight credits
  const { data: membership } = useQuery<{
    tier: string;
    isPlus: boolean;
    highlightsRemaining: number;
    listingCredits: number;
  }>({
    queryKey: ["/api/membership"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/membership");
      return res.json();
    },
    enabled: !!user,
  });

  const userIsPlus = membership?.isPlus ?? false;

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/listings/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Listing deleted" });
      queryClient.invalidateQueries({
        queryKey: ["/api/listings/user", user?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
    },
    onError: (e: Error) => {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: string;
    }) => {
      await apiRequest("PUT", `/api/listings/${id}`, { status });
    },
    onSuccess: (_, vars) => {
      toast({
        title:
          vars.status === "active" ? "Listing published" : "Listing unpublished",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/listings/user", user?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
    },
    onError: (e: Error) => {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const highlightMutation = useMutation({
    mutationFn: async ({ id, isHighlighted }: { id: number; isHighlighted: boolean }) => {
      if (isHighlighted) {
        await apiRequest("DELETE", `/api/listings/${id}/highlight`);
      } else {
        await apiRequest("POST", `/api/listings/${id}/highlight`);
      }
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.isHighlighted ? "Highlight removed" : "Listing featured!",
        description: vars.isHighlighted ? "Highlight credit refunded" : "Your listing is now highlighted in the marketplace",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/listings/user", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/membership"] });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const activeListings = (listings || []).filter(
    (l) => l.status === "active"
  );
  const draftListings = (listings || []).filter(
    (l) => l.status === "draft"
  );
  const soldListings = (listings || []).filter(
    (l) => l.status === "sold" || l.status === "removed"
  );

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleStatusChange = (id: number, status: string) => {
    statusMutation.mutate({ id, status });
  };

  const handleToggleHighlight = (id: number, isHighlighted: boolean) => {
    highlightMutation.mutate({ id, isHighlighted });
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" data-testid="my-listings-title">
              My Listings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your active, draft, and past listings
            </p>
          </div>
          <Link href="/create-listing">
            <Button
              className="rounded-xl gap-2"
              data-testid="create-listing-btn"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Listing</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>

        {/* Stats strip */}
        {!isLoading && listings && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="rounded-xl">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {activeListings.length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Active</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-500">
                  {draftListings.length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Drafts</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {soldListings.length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sold / Past
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Product Highlights credit counter - Plus members only */}
        {userIsPlus && membership && (
          <Card className="rounded-xl border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50" data-testid="highlights-credits-box">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Product Highlights</p>
                    <p className="text-xs text-muted-foreground">Feature your listings to stand out in the marketplace</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-amber-600" data-testid="highlights-remaining">{membership.highlightsRemaining}</span>
                    <span className="text-sm text-muted-foreground">/ 5</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">credits left this month</p>
                </div>
              </div>
              {membership.highlightsRemaining === 0 && (
                <p className="text-xs text-amber-700 mt-2 bg-amber-100 rounded-lg px-3 py-1.5">
                  All highlight credits used this month. Credits reset on your next billing cycle.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full grid grid-cols-3 rounded-xl">
            <TabsTrigger
              value="active"
              className="rounded-lg gap-1.5 text-xs sm:text-sm"
              data-testid="tab-active"
            >
              <Package className="h-3.5 w-3.5 hidden sm:block" />
              Active
              {activeListings.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 text-[10px] px-1.5"
                >
                  {activeListings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="drafts"
              className="rounded-lg gap-1.5 text-xs sm:text-sm"
              data-testid="tab-drafts"
            >
              <FileEdit className="h-3.5 w-3.5 hidden sm:block" />
              Drafts
              {draftListings.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 text-[10px] px-1.5"
                >
                  {draftListings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="sold"
              className="rounded-lg gap-1.5 text-xs sm:text-sm"
              data-testid="tab-sold"
            >
              <ShoppingBag className="h-3.5 w-3.5 hidden sm:block" />
              Sold / Past
              {soldListings.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 text-[10px] px-1.5"
                >
                  {soldListings.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-3">
            {isLoading ? (
              <>
                <ListingSkeleton />
                <ListingSkeleton />
                <ListingSkeleton />
              </>
            ) : activeListings.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No active listings"
                description="Create your first listing to start swapping. Items you publish will appear here."
              />
            ) : (
              activeListings.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onToggleHighlight={handleToggleHighlight}
                  isPlus={userIsPlus}
                  highlightPending={highlightMutation.isPending}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="drafts" className="mt-4 space-y-3">
            {isLoading ? (
              <>
                <ListingSkeleton />
                <ListingSkeleton />
              </>
            ) : draftListings.length === 0 ? (
              <EmptyState
                icon={FileEdit}
                title="No drafts"
                description="Listings you save as draft will show up here. You can finish and publish them anytime."
              />
            ) : (
              draftListings.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onToggleHighlight={handleToggleHighlight}
                  isPlus={userIsPlus}
                  highlightPending={highlightMutation.isPending}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="sold" className="mt-4 space-y-3">
            {isLoading ? (
              <>
                <ListingSkeleton />
              </>
            ) : soldListings.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No sold or past listings"
                description="Once an item sells or you remove a listing, it will appear here."
              />
            ) : (
              soldListings.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onToggleHighlight={handleToggleHighlight}
                  isPlus={userIsPlus}
                  highlightPending={highlightMutation.isPending}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}
