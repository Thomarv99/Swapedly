import { PublicLayout } from "@/components/layouts";
import { SwapBucksAmount, StatusBadge, UserAvatar, RatingStars, DeliveryBadge, VerifiedBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronLeft, ChevronRight, Clock, Coins, MessageSquare, ShoppingCart, Star, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams, useLocation } from "wouter";
import { useState } from "react";
import type { Listing, User, Question, Review } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState(0);
  const [newQuestion, setNewQuestion] = useState("");

  const { data: listing, isLoading } = useQuery<Listing & { seller?: User; questions?: Question[]; reviews?: Review[] }>({
    queryKey: [`/api/listings/${id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const buyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/transactions/buy`, {
        listingId: Number(id),
        deliveryMethod: "shipping",
      });
    },
    onSuccess: () => {
      toast({ title: "Purchase initiated!", description: "Check your wallet for the transaction." });
      queryClient.invalidateQueries({ queryKey: [`/api/listings/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: (e: Error) => {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    },
  });

  const askMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/questions`, { listingId: Number(id), question: newQuestion });
    },
    onSuccess: () => {
      setNewQuestion("");
      queryClient.invalidateQueries({ queryKey: [`/api/listings/${id}`] });
    },
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!listing) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Listing not found.</p>
          <Link href="/marketplace">
            <Button className="mt-4" data-testid="back-to-marketplace">Back to Marketplace</Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const images = listing.images ? JSON.parse(listing.images) : [];
  const deliveryOptions = listing.deliveryOptions ? JSON.parse(listing.deliveryOptions) : {};
  const tags = listing.tags ? JSON.parse(listing.tags) : [];
  const questions = listing.questions || [];
  const reviews = listing.reviews || [];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink asChild><Link href="/marketplace">Marketplace</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink>{listing.category}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="text-foreground font-medium">{listing.title}</BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image gallery */}
          <div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted mb-3">
              <img
                src={images[selectedImage] || "https://placehold.co/600x600/e2e8f0/94a3b8?text=No+Image"}
                alt={listing.title}
                className="object-cover w-full h-full"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((p) => (p - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur hover:bg-white"
                    data-testid="prev-image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage((p) => (p + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur hover:bg-white"
                    data-testid="next-image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${
                      i === selectedImage ? "border-primary" : "border-transparent"
                    }`}
                    data-testid={`thumbnail-${i}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={listing.status} />
              <StatusBadge status={listing.condition} />
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
              </span>
            </div>

            <h1 className="text-2xl font-bold">{listing.title}</h1>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
              <Coins className="h-8 w-8 text-yellow-600" />
              <div>
                <SwapBucksAmount amount={listing.price} size="xl" />
                <p className="text-sm text-muted-foreground">or open to swap offers</p>
              </div>
            </div>

            {/* Seller card */}
            {listing.seller && (
              <Card className="rounded-xl">
                <CardContent className="p-4 flex items-center gap-4">
                  <UserAvatar user={listing.seller} size="lg" showVerified />
                  <div className="flex-1">
                    <p className="font-semibold">{listing.seller.displayName || listing.seller.username}</p>
                    {listing.seller.isVerified && <VerifiedBadge />}
                    <RatingStars rating={4.5} count={12} />
                  </div>
                  <Link href={`/user/${listing.seller.id}`}>
                    <Button variant="outline" size="sm" className="rounded-xl" data-testid="view-seller-profile">
                      View Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
            </div>

            {/* Item specifics */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <span className="text-muted-foreground">Category</span>
                <p className="font-medium">{listing.category}</p>
              </div>
              {listing.subcategory && (
                <div className="bg-muted rounded-lg p-3">
                  <span className="text-muted-foreground">Subcategory</span>
                  <p className="font-medium">{listing.subcategory}</p>
                </div>
              )}
              <div className="bg-muted rounded-lg p-3">
                <span className="text-muted-foreground">Condition</span>
                <p className="font-medium capitalize">{listing.condition.replace("_", " ")}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <span className="text-muted-foreground">Delivery</span>
                <DeliveryBadge options={deliveryOptions} />
              </div>
            </div>

            {tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="rounded-lg">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1 rounded-xl h-12 text-base"
                onClick={() => buyMutation.mutate()}
                disabled={buyMutation.isPending || listing.status !== "active"}
                data-testid="buy-now-btn"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Buy Now for {listing.price} SB
              </Button>
              <Link href={user ? "/messages" : "/"}>
                <Button variant="outline" className="rounded-xl h-12" data-testid="message-seller-btn">
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Q&A */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Questions & Answers</h2>
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground mb-4">No questions yet. Be the first to ask!</p>
          )}
          <div className="space-y-4 mb-6">
            {questions.map((q: Question) => (
              <Card key={q.id} className="rounded-xl">
                <CardContent className="p-4">
                  <p className="font-medium text-sm">Q: {q.question}</p>
                  {q.answer && <p className="text-sm text-muted-foreground mt-2">A: {q.answer}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
          {user && (
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask a question about this item..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="rounded-xl"
                data-testid="question-input"
              />
              <Button
                onClick={() => askMutation.mutate()}
                disabled={!newQuestion.trim() || askMutation.isPending}
                className="rounded-xl"
                data-testid="ask-question-btn"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Seller Reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
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
        </div>
      </div>
    </PublicLayout>
  );
}
