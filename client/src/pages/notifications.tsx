import { AuthenticatedLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell, ShoppingCart, MessageSquare, Scale, Star, Users,
  Package, Truck, Coins, Info, CheckCheck,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Notification } from "@shared/schema";

const typeIcons: Record<string, any> = {
  purchase: ShoppingCart,
  sale: Package,
  message: MessageSquare,
  dispute_update: Scale,
  review: Star,
  referral: Users,
  listing_sold: ShoppingCart,
  shipping_update: Truck,
  earn_reward: Coins,
  system: Info,
};

const typeColors: Record<string, string> = {
  purchase: "bg-blue-50 text-blue-600",
  sale: "bg-green-50 text-green-600",
  message: "bg-purple-50 text-purple-600",
  dispute_update: "bg-yellow-50 text-yellow-600",
  review: "bg-orange-50 text-orange-600",
  referral: "bg-pink-50 text-pink-600",
  listing_sold: "bg-emerald-50 text-emerald-600",
  shipping_update: "bg-indigo-50 text-indigo-600",
  earn_reward: "bg-yellow-50 text-yellow-600",
  system: "bg-gray-50 text-gray-600",
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: notificationsData } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const notifications = Array.isArray(notificationsData) ? notificationsData : [];

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const handleClick = (notif: Notification) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              <p className="text-muted-foreground text-sm">{unreadCount} unread</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="rounded-xl gap-2"
              data-testid="mark-all-read"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const Icon = typeIcons[notif.type] || Bell;
              const color = typeColors[notif.type] || "bg-gray-50 text-gray-600";
              return (
                <Card
                  key={notif.id}
                  className={cn(
                    "rounded-xl cursor-pointer hover:shadow-sm transition-shadow",
                    !notif.isRead && "border-l-4 border-l-primary"
                  )}
                  onClick={() => handleClick(notif)}
                  data-testid={`notification-${notif.id}`}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", !notif.isRead && "font-semibold")}>{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
