import { AuthenticatedLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, XCircle, Clock, MessageSquare, Package,
  MapPin, ArrowRight, Coins, AlertCircle, Send, User,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest, resolveImageUrl } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { Transaction, Listing, User as UserType } from "@shared/schema";

type TxnDetail = Transaction & {
  listing?: Listing;
  buyer?: UserType;
  seller?: UserType;
};

type Message = {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  awaiting_acceptance: { label: "Awaiting Seller", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  accepted: { label: "Accepted", color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800", icon: Package },
  exchange_requested: { label: "Exchange Requested", color: "bg-purple-100 text-purple-800", icon: ArrowRight },
  completed: { label: "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "Declined / Cancelled", color: "bg-red-100 text-red-800", icon: XCircle },
  disputed: { label: "Disputed", color: "bg-orange-100 text-orange-800", icon: AlertCircle },
};

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const { data: txn, isLoading } = useQuery<TxnDetail>({
    queryKey: [`/api/transactions/${id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 10_000, // poll for new messages
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/transactions/${id}/messages`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 5_000,
    enabled: !!txn,
  });

  const acceptMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/transactions/${id}/accept`, {}),
    onSuccess: () => {
      toast({ title: "Purchase accepted!", description: "The buyer has been notified." });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${id}`] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const declineMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/transactions/${id}/decline`, {}),
    onSuccess: () => {
      toast({ title: "Purchase declined", description: "The buyer's SB has been refunded." });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${id}`] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const completeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/transactions/${id}/complete`, {}),
    onSuccess: () => {
      toast({ title: "Exchange complete!", description: "SB has been transferred to the seller." });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${id}`] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/transactions/${id}/messages`, { content });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${id}/messages`] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return (
    <AuthenticatedLayout>
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </AuthenticatedLayout>
  );

  if (!txn) return (
    <AuthenticatedLayout>
      <div className="text-center py-20 text-muted-foreground">Transaction not found.</div>
    </AuthenticatedLayout>
  );

  const isBuyer = user?.id === txn.buyerId;
  const isSeller = user?.id === txn.sellerId;
  const otherUser = isBuyer ? txn.seller : txn.buyer;
  const status = STATUS_CONFIG[txn.status] || STATUS_CONFIG.awaiting_acceptance;
  const StatusIcon = status.icon;

  const images = txn.listing?.images ? JSON.parse(txn.listing.images) : [];
  const coverImg = images[0] ? resolveImageUrl(images[0]) : null;

  return (
    <AuthenticatedLayout>
      <div className="max-w-2xl space-y-5">
        {/* Header */}
        <div>
          <Link href="/wallet"><span className="text-xs text-primary hover:underline">← Back to Wallet</span></Link>
          <h1 className="text-xl font-bold mt-1">Transaction #{txn.id}</h1>
        </div>

        {/* Status card */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${status.color}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </div>
            </div>

            {/* Listing summary */}
            <div className="flex gap-3">
              {coverImg && (
                <img src={coverImg} alt={txn.listing?.title} className="h-16 w-16 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{txn.listing?.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Coins className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="text-sm font-bold text-yellow-600">{txn.amount} SB</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {txn.deliveryMethod === "local_pickup" ? "📍 Local Pickup" : "📦 Shipping"}
                </p>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Parties */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Buyer</p>
                <p className="font-medium flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {txn.buyer?.displayName || txn.buyer?.username}
                  {isBuyer && <span className="text-primary text-[10px]">(you)</span>}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Seller</p>
                <p className="font-medium flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {txn.seller?.displayName || txn.seller?.username}
                  {isSeller && <span className="text-primary text-[10px]">(you)</span>}
                </p>
              </div>
            </div>

            {/* Action buttons for seller */}
            {isSeller && txn.status === "awaiting_acceptance" && (
              <div className="flex gap-2 mt-4">
                <Button
                  className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 gap-1.5"
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                  data-testid="accept-purchase-btn"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Accept Purchase
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                  onClick={() => declineMutation.mutate()}
                  disabled={declineMutation.isPending}
                  data-testid="decline-purchase-btn"
                >
                  <XCircle className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            )}

            {/* SB escrow notice for buyer */}
            {isBuyer && txn.status === "awaiting_acceptance" && (
              <div className="mt-4 bg-yellow-50 rounded-xl p-3 flex items-start gap-2">
                <Clock className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-yellow-800">Your SB is held in escrow</p>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    {txn.amount} SB has been reserved from your wallet. It will be transferred to the seller once the exchange is confirmed, or refunded if declined.
                  </p>
                </div>
              </div>
            )}

            {/* Mark as complete */}
            {["accepted", "in_progress"].includes(txn.status) && (isBuyer || isSeller) && (
              <div className="mt-4">
                <div className="bg-blue-50 rounded-xl p-3 mb-3">
                  <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Coordinate the exchange in the chat below
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Use the messages to arrange where and when to meet. Once both of you have completed the exchange, click the button below.
                  </p>
                </div>
                <Button
                  className="w-full rounded-xl bg-green-600 hover:bg-green-700 gap-1.5"
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  data-testid="complete-exchange-btn"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {completeMutation.isPending ? "Processing..." : "✓ Exchange Complete — Transfer SB to Seller"}
                </Button>
              </div>
            )}

            {txn.status === "completed" && (
              <div className="mt-4 bg-green-50 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-green-800">Exchange Complete!</p>
                  <p className="text-xs text-green-700">
                    {txn.amount} SB was transferred to {txn.seller?.displayName || txn.seller?.username}.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Chat */}
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-primary" />
              Transaction Chat
              <span className="text-xs text-muted-foreground font-normal">— coordinate your exchange here</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages */}
            <div className="px-4 pb-2 space-y-3 max-h-80 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No messages yet. Start coordinating with {otherUser?.displayName || otherUser?.username}!
                </p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        isMe
                          ? "bg-primary text-white rounded-br-sm"
                          : "bg-slate-100 text-slate-800 rounded-bl-sm"
                      }`}>
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-0.5 ${isMe ? "text-white/60" : "text-muted-foreground"}`}>
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message input */}
            {["awaiting_acceptance", "accepted", "in_progress"].includes(txn.status) && (
              <div className="border-t p-3 flex gap-2">
                <Textarea
                  placeholder={`Message ${otherUser?.displayName || otherUser?.username}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-xl text-sm min-h-0 h-10 resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (message.trim()) sendMessageMutation.mutate(message.trim());
                    }
                  }}
                  data-testid="transaction-message-input"
                />
                <Button
                  size="icon"
                  className="rounded-xl shrink-0"
                  onClick={() => { if (message.trim()) sendMessageMutation.mutate(message.trim()); }}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  data-testid="send-message-btn"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
