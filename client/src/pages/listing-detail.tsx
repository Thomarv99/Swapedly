import { PublicLayout } from "@/components/layouts";
import { SwapBucksAmount, StatusBadge, UserAvatar, RatingStars, DeliveryBadge, VerifiedBadge } from "@/components/shared";
import { resolveImageUrl } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronLeft, ChevronRight, Clock, Coins, MessageSquare, ShoppingCart, Star, Send, Share2, HelpCircle, CheckCircle2, Eye } from "lucide-react";
import { ShareDialog } from "@/pages/share-earn";
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

  const isSeller = user && listing && listing.seller?.id === user.id;

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
                src={images[selectedImage] ? resolveImageUrl(images[selectedImage]) : "https://placehold.co/600x600/e2e8f0/94a3b8?text=No+Image"}
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
                    <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
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
            {listing.views > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />{listing.views.toLocaleString()} views
              </p>
            )}

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
              {user && (
                <ShareDialog
                  listingId={listing.id}
                  trigger={
                    <Button variant="outline" className="rounded-xl h-12" data-testid="share-listing-btn">
                      <Share2 className="h-5 w-5" />
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* Q&A */}
        <QASection
          listingId={Number(id)}
          sellerId={listing.seller?.id}
          questions={questions}
          user={user}
          newQuestion={newQuestion}
          setNewQuestion={setNewQuestion}
          askMutation={askMutation}
          queryClient={queryClient}
        />

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

// ─── Q&A Section ─────────────────────────────────────────────────────────────
function QASection({
  listingId,
  sellerId,
  questions,
  user,
  newQuestion,
  setNewQuestion,
  askMutation,
  queryClient,
}: {
  listingId: number;
  sellerId?: number;
  questions: any[];
  user: any;
  newQuestion: string;
  setNewQuestion: (v: string) => void;
  askMutation: any;
  queryClient: any;
}) {
  const { toast } = useToast();
  const [answeringId, setAnsweringId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");

  const isSeller = user?.id === sellerId;

  const answerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: number; answer: string }) => {
      await apiRequest("PUT", `/api/questions/${questionId}/answer`, { answer });
    },
    onSuccess: () => {
      toast({ title: "Answer posted!" });
      setAnsweringId(null);
      setAnswerText("");
      queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}`] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="mt-12">
      <div className="flex items-center gap-2 mb-6">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Questions & Answers</h2>
        {questions.length > 0 && (
          <span className="text-sm text-muted-foreground">({questions.length})</span>
        )}
      </div>

      {questions.length === 0 && (
        <div className="bg-slate-50 rounded-xl p-6 text-center mb-6">
          <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No questions yet. Be the first to ask!</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {questions.map((q: any) => (
          <Card key={q.id} className="rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {/* Question */}
              <div className="p-4 flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">Q</span>
                </div>
                <p className="text-sm font-medium flex-1">{q.question}</p>
              </div>

              {/* Answer */}
              {q.answer ? (
                <div className="bg-green-50 border-t border-green-100 p-4 flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-green-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-green-700 font-semibold mb-0.5">Seller's Answer</p>
                    <p className="text-sm text-slate-700">{q.answer}</p>
                  </div>
                </div>
              ) : isSeller ? (
                answeringId === q.id ? (
                  <div className="border-t p-4 space-y-2">
                    <Textarea
                      placeholder="Write your answer..."
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      className="rounded-xl text-sm"
                      rows={2}
                      data-testid={`answer-input-${q.id}`}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl gap-1"
                        onClick={() => answerMutation.mutate({ questionId: q.id, answer: answerText })}
                        disabled={!answerText.trim() || answerMutation.isPending}
                        data-testid={`submit-answer-${q.id}`}
                      >
                        <Send className="h-3 w-3" />
                        Post Answer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-xs"
                        onClick={() => { setAnsweringId(null); setAnswerText(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() => setAnsweringId(q.id)}
                      data-testid={`answer-btn-${q.id}`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Answer this question
                    </Button>
                  </div>
                )
              ) : (
                <div className="bg-slate-50 border-t px-4 py-2.5">
                  <p className="text-xs text-muted-foreground italic">Awaiting seller's answer</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ask a question form */}
      {user ? (
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-sm font-medium mb-3 flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-primary" />
            Ask the seller a question
          </p>
          <div className="flex gap-2">
            <Textarea
              placeholder="e.g. Does this include all accessories?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="rounded-xl text-sm flex-1"
              rows={2}
              data-testid="question-input"
            />
            <Button
              onClick={() => askMutation.mutate()}
              disabled={!newQuestion.trim() || askMutation.isPending}
              className="rounded-xl self-end"
              data-testid="ask-question-btn"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            <a href="/#/signup" className="text-primary hover:underline font-medium">Sign in</a> to ask the seller a question
          </p>
        </div>
      )}
    </div>
  );
}
