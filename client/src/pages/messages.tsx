import { AuthenticatedLayout } from "@/components/layouts";
import { UserAvatar } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Send, Paperclip, ArrowLeft, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link, useParams, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Conversation, Message } from "@shared/schema";

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversationsData } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const conversations = Array.isArray(conversationsData) ? conversationsData : [];

  const { data: messagesData } = useQuery<any>({
    queryKey: [`/api/conversations/${conversationId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!conversationId,
    refetchInterval: 5000,
  });

  const messages: Message[] = Array.isArray(messagesData?.messages) ? messagesData.messages : (Array.isArray(messagesData) ? messagesData : []);
  const activeConv = messagesData?.conversation || conversations.find((c: any) => c.id === Number(conversationId));

  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/conversations/${conversationId}/messages`, { content: newMessage });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredConvs = conversations.filter((c: any) => {
    if (!searchQuery) return true;
    const name = c.otherUser?.displayName || c.otherUser?.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <AuthenticatedLayout>
      <div className="h-[calc(100vh-8rem)] flex rounded-xl border overflow-hidden bg-white">
        {/* Conversation list */}
        <div className={cn(
          "w-80 border-r flex flex-col shrink-0",
          conversationId ? "hidden md:flex" : "flex"
        )}>
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-muted border-none h-9"
                data-testid="messages-search"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filteredConvs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No conversations</p>
            ) : (
              filteredConvs.map((conv: any) => (
                <Link key={conv.id} href={`/messages/${conv.id}`}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                      Number(conversationId) === conv.id && "bg-muted"
                    )}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <UserAvatar user={conv.otherUser || {}} size="sm" showOnline />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {conv.otherUser?.displayName || conv.otherUser?.username || "User"}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {conv.lastMessageAt ? formatMsgTime(conv.lastMessageAt) : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || "No messages"}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge className="h-5 min-w-[20px] text-[10px] px-1.5 justify-center bg-primary">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat area */}
        <div className={cn(
          "flex-1 flex flex-col",
          !conversationId ? "hidden md:flex" : "flex"
        )}>
          {!conversationId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground">Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-3 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => navigate("/messages")}
                  data-testid="back-to-conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <UserAvatar user={activeConv?.otherUser || {}} size="sm" showOnline />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {activeConv?.otherUser?.displayName || activeConv?.otherUser?.username || "User"}
                  </p>
                </div>
                {activeConv?.listing && (
                  <Link href={`/listing/${activeConv.listing.id}`}>
                    <Badge variant="secondary" className="gap-1 cursor-pointer" data-testid="listing-context">
                      <Package className="h-3 w-3" />
                      {activeConv.listing.title}
                    </Badge>
                  </Link>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg: Message) => {
                    const isSent = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex", isSent ? "justify-end" : "justify-start")}
                        data-testid={`message-${msg.id}`}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                            isSent
                              ? "bg-primary text-white rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          )}
                        >
                          <p>{msg.content}</p>
                          <p className={cn(
                            "text-[10px] mt-1",
                            isSent ? "text-white/60" : "text-muted-foreground"
                          )}>
                            {format(new Date(msg.createdAt), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Composer */}
              <div className="p-3 border-t">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="shrink-0" data-testid="attach-btn">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
                        e.preventDefault();
                        sendMutation.mutate();
                      }
                    }}
                    className="rounded-xl"
                    data-testid="message-input"
                  />
                  <Button
                    size="icon"
                    className="rounded-xl shrink-0"
                    onClick={() => sendMutation.mutate()}
                    disabled={!newMessage.trim() || sendMutation.isPending}
                    data-testid="send-message-btn"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
