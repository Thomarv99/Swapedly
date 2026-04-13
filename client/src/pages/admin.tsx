import { AuthenticatedLayout } from "@/components/layouts";
import { SwapBucksAmount, StatusBadge, UserAvatar } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Shield, Users, Package, Scale, Coins, Search, Ban,
  CheckCircle, Crown, Trash2, Eye, Star, PlusCircle, Share2, MousePointer, UserPlus,
  BarChart3, TrendingUp, Globe, Activity, RefreshCw,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import type { User, Listing, Dispute, EarnTask } from "@shared/schema";

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [listingSearch, setListingSearch] = useState("");

  // Data
  const { data: adminStats } = useQuery<{
    totalUsers: number;
    activeListings: number;
    totalTransactions: number;
    sbInCirculation: number;
  }>({
    queryKey: ["/api/admin/stats"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAdmin,
  });

  const { data: usersData } = useQuery<{ users: User[]; total: number }>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAdmin,
  });

  const { data: listingsData } = useQuery<{ listings: Listing[]; total: number }>({
    queryKey: ["/api/admin/listings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAdmin,
  });

  const { data: disputesData } = useQuery<Dispute[]>({
    queryKey: ["/api/admin/disputes"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAdmin,
  });

  const { data: earnTasksData } = useQuery<EarnTask[]>({
    queryKey: ["/api/admin/earn-tasks"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAdmin,
  });

  const users = usersData?.users ?? [];
  const listings = listingsData?.listings ?? [];
  const disputes = Array.isArray(disputesData) ? disputesData : [];
  const earnTasks = Array.isArray(earnTasksData) ? earnTasksData : [];

  // Mutations
  const userActionMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: number; action: string }) => {
      const body: Record<string, any> = {};
      if (action === "verify") body.isVerified = true;
      else if (action === "make-admin") body.role = "admin";
      else if (action === "ban") body.role = "banned";
      await apiRequest("PUT", `/api/admin/users/${userId}`, body);
    },
    onSuccess: () => {
      toast({ title: "Action completed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const listingActionMutation = useMutation({
    mutationFn: async ({ listingId, action }: { listingId: number; action: string }) => {
      const body: Record<string, any> = {};
      if (action === "feature") body.isFeatured = true;
      else if (action === "remove") body.status = "removed";
      await apiRequest("PUT", `/api/admin/listings/${listingId}`, body);
    },
    onSuccess: () => {
      toast({ title: "Action completed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const disputeActionMutation = useMutation({
    mutationFn: async ({ disputeId, action }: { disputeId: number; action: string }) => {
      const body: Record<string, any> = {};
      if (action === "resolve") body.status = "resolved_buyer";
      await apiRequest("PUT", `/api/admin/disputes/${disputeId}`, body);
    },
    onSuccess: () => {
      toast({ title: "Action completed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/disputes"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const taskToggleMutation = useMutation({
    mutationFn: async ({ taskId, isActive }: { taskId: number; isActive: boolean }) => {
      await apiRequest("PUT", `/api/admin/earn-tasks/${taskId}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/earn-tasks"] });
    },
  });

  // New task form
  const { register: regTask, handleSubmit: handleTaskSubmit, reset: resetTask } = useForm<{
    title: string; description: string; reward: number; type: string;
  }>();

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/admin/earn-tasks", { ...data, reward: Number(data.reward), isActive: true });
    },
    onSuccess: () => {
      toast({ title: "Task created" });
      resetTask();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/earn-tasks"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!isAdmin) {
    return (
      <AuthenticatedLayout>
        <div className="text-center py-20">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to view this page.</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  const stats = [
    { label: "Total Users", value: adminStats?.totalUsers ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Active Listings", value: adminStats?.activeListings ?? 0, icon: Package, color: "text-green-600 bg-green-50" },
    { label: "Total Transactions", value: adminStats?.totalTransactions ?? 0, icon: Coins, color: "text-purple-600 bg-purple-50" },
    { label: "SB in Circulation", value: adminStats?.sbInCirculation ?? 0, icon: Coins, color: "text-yellow-600 bg-yellow-50" },
  ];

  const filteredUsers = users.filter(
    (u) => u.username.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredListings = listings.filter(
    (l) => l.title.toLowerCase().includes(listingSearch.toLowerCase())
  );

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Platform management and moderation</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="rounded-xl">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="rounded-xl">
            <TabsTrigger value="users" className="rounded-lg" data-testid="admin-users-tab">Users</TabsTrigger>
            <TabsTrigger value="listings" className="rounded-lg" data-testid="admin-listings-tab">Listings</TabsTrigger>
            <TabsTrigger value="disputes" className="rounded-lg" data-testid="admin-disputes-tab">Disputes</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-lg" data-testid="admin-tasks-tab">Earn Tasks</TabsTrigger>
            <TabsTrigger value="referrals" className="rounded-lg" data-testid="admin-referrals-tab">Referrals</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg" data-testid="admin-analytics-tab">Analytics</TabsTrigger>
            <TabsTrigger value="affiliates" className="rounded-lg" data-testid="admin-affiliates-tab">Affiliates</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <Card className="rounded-xl">
              <CardHeader className="flex flex-row items-center gap-4">
                <CardTitle className="flex-1">Users Management</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10 rounded-xl"
                    data-testid="admin-user-search"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserAvatar user={u} size="sm" />
                            <span className="font-medium text-sm">{u.username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.isVerified ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-xs text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Verify"
                              onClick={() => userActionMutation.mutate({ userId: u.id, action: "verify" })}
                              data-testid={`verify-user-${u.id}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Make Admin"
                              onClick={() => userActionMutation.mutate({ userId: u.id, action: "make-admin" })}
                              data-testid={`admin-user-${u.id}`}
                            >
                              <Crown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ban"
                              onClick={() => userActionMutation.mutate({ userId: u.id, action: "ban" })}
                              data-testid={`ban-user-${u.id}`}
                            >
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings" className="mt-6">
            <Card className="rounded-xl">
              <CardHeader className="flex flex-row items-center gap-4">
                <CardTitle className="flex-1">Listings Management</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search listings..."
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                    className="pl-10 rounded-xl"
                    data-testid="admin-listing-search"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredListings.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium text-sm">{l.title}</TableCell>
                        <TableCell><SwapBucksAmount amount={l.price} size="sm" /></TableCell>
                        <TableCell><StatusBadge status={l.status} /></TableCell>
                        <TableCell className="text-sm">{format(new Date(l.createdAt), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Feature"
                              onClick={() => listingActionMutation.mutate({ listingId: l.id, action: "feature" })}
                              data-testid={`feature-listing-${l.id}`}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Remove"
                              onClick={() => listingActionMutation.mutate({ listingId: l.id, action: "remove" })}
                              data-testid={`remove-listing-${l.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes" className="mt-6">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Disputes Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Filed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disputes.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">#{d.id}</TableCell>
                        <TableCell className="text-sm">{d.reason.replace(/_/g, " ")}</TableCell>
                        <TableCell><StatusBadge status={d.status} /></TableCell>
                        <TableCell className="text-sm">{format(new Date(d.createdAt), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View"
                              data-testid={`view-dispute-${d.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => disputeActionMutation.mutate({ disputeId: d.id, action: "resolve" })}
                              data-testid={`resolve-dispute-${d.id}`}
                            >
                              Resolve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earn Tasks Tab */}
          <TabsContent value="tasks" className="mt-6">
            <div className="space-y-6">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Active Earn Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  {earnTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No tasks created yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {earnTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 rounded-xl border">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{task.title}</p>
                            <p className="text-xs text-muted-foreground">{task.description}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <SwapBucksAmount amount={task.reward} size="sm" />
                            <Badge variant="secondary">{task.type}</Badge>
                            <Switch
                              checked={task.isActive}
                              onCheckedChange={(checked) => taskToggleMutation.mutate({ taskId: task.id, isActive: checked })}
                              data-testid={`toggle-task-${task.id}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlusCircle className="h-5 w-5" />
                    Create New Task
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTaskSubmit((data) => createTaskMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input className="rounded-xl" data-testid="task-title" {...regTask("title", { required: true })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select onValueChange={(v) => regTask("type").onChange({ target: { value: v } })}>
                          <SelectTrigger className="rounded-xl" data-testid="task-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="survey">Survey</SelectItem>
                            <SelectItem value="app_download">App Download</SelectItem>
                            <SelectItem value="social_share">Social Share</SelectItem>
                            <SelectItem value="review_offer">Review Offer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea className="rounded-xl" data-testid="task-description" {...regTask("description", { required: true })} />
                    </div>
                    <div className="space-y-2 max-w-xs">
                      <Label>Reward (SB)</Label>
                      <Input type="number" min={1} className="rounded-xl" data-testid="task-reward" {...regTask("reward", { required: true })} />
                    </div>
                    <Button type="submit" className="rounded-xl gap-2" disabled={createTaskMutation.isPending} data-testid="create-task-btn">
                      <PlusCircle className="h-4 w-4" />
                      Create Task
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="mt-6">
            <ReferralStatsTab />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <AnalyticsTab />
          </TabsContent>

          {/* Affiliates Tab */}
          <TabsContent value="affiliates" className="mt-6">
            <AffiliatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}

function ReferralStatsTab() {
  const { data: stats, isLoading } = useQuery<Array<{
    userId: number;
    username: string;
    clicks: number;
    signups: number;
    creditsEarned: number;
  }>>({ 
    queryKey: ["/api/admin/referral-stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/referral-stats");
      return res.json();
    },
  });

  const totalClicks = (stats || []).reduce((s, r) => s + r.clicks, 0);
  const totalSignups = (stats || []).reduce((s, r) => s + r.signups, 0);
  const totalCredits = (stats || []).reduce((s, r) => s + r.creditsEarned, 0);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <MousePointer className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{totalClicks}</p>
            <p className="text-xs text-muted-foreground">Total Link Clicks</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <UserPlus className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold text-green-600">{totalSignups}</p>
            <p className="text-xs text-muted-foreground">Signups via Referral</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <Coins className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-2xl font-bold text-yellow-600">{totalCredits.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">SB Paid Out</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-user table */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Referral Activity by User
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !stats || stats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referral activity yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-center">Link Clicks</TableHead>
                  <TableHead className="text-center">Signups</TableHead>
                  <TableHead className="text-center">Conversion %</TableHead>
                  <TableHead className="text-center">SB Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map(r => (
                  <TableRow key={r.userId}>
                    <TableCell className="font-medium">{r.username}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1">
                        <MousePointer className="h-3 w-3 text-blue-400" />{r.clicks}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <UserPlus className="h-3 w-3" />{r.signups}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.clicks > 0 ? `${Math.round((r.signups / r.clicks) * 100)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-yellow-600">{r.creditsEarned.toFixed(1)} SB</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// ANALYTICS TAB
// ============================================================

type AnalyticsData = {
  totalViews: number;
  uniqueSessions: number;
  onlineUsers: number;
  topPages: Array<{ path: string; views: number }>;
  viewsByDay: Array<{ date: string; views: number }>;
  topReferrers: Array<{ referrer: string; views: number }>;
  newUsersByDay: Array<{ date: string; signups: number }>;
};

function AnalyticsTab() {
  const [days, setDays] = useState(30);

  const { data, isLoading, refetch, isFetching } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics", days],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics?days=${days}`);
      return res.json();
    },
    refetchInterval: 60_000, // auto-refresh every 60s
  });

  // Live online users — poll every 15s
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await apiRequest("GET", `/api/admin/analytics?days=1`);
        const d = await res.json();
        setOnlineUsers(d.onlineUsers ?? 0);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 15_000);
    return () => clearInterval(interval);
  }, []);

  const totalViews = data?.totalViews ?? 0;
  const uniqueSessions = data?.uniqueSessions ?? 0;
  const viewsByDay = data?.viewsByDay ?? [];
  const newUsersByDay = data?.newUsersByDay ?? [];
  const topPages = data?.topPages ?? [];
  const topReferrers = data?.topReferrers ?? [];

  // Merge viewsByDay + newUsersByDay for the combined chart
  const combinedByDay = (() => {
    const dateMap: Record<string, { date: string; views: number; signups: number }> = {};
    for (const v of viewsByDay) {
      dateMap[v.date] = { date: v.date, views: v.views, signups: 0 };
    }
    for (const s of newUsersByDay) {
      if (!dateMap[s.date]) dateMap[s.date] = { date: s.date, views: 0, signups: 0 };
      dateMap[s.date].signups = s.signups;
    }
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Site Analytics</h2>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-36 rounded-xl" data-testid="analytics-days-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="analytics-refresh-btn"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl border-2 border-green-100 bg-green-50/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-green-100">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Online Now</p>
              <p className="text-3xl font-bold text-green-600" data-testid="analytics-online">{onlineUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-blue-50">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Page Views</p>
              <p className="text-3xl font-bold" data-testid="analytics-total-views">{totalViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Last {days} days</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-purple-50">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Unique Sessions</p>
              <p className="text-3xl font-bold" data-testid="analytics-unique-sessions">{uniqueSessions.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Last {days} days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Chart */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Traffic & Signups Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
          ) : combinedByDay.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={combinedByDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => {
                    const dt = new Date(d + "T00:00:00");
                    return `${dt.getMonth() + 1}/${dt.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip
                  formatter={(value: number, name: string) => [value, name === "views" ? "Page Views" : "New Signups"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend formatter={(v) => v === "views" ? "Page Views" : "New Signups"} />
                <Line type="monotone" dataKey="views" stroke="#5A45FF" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="signups" stroke="#FF4D6D" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Pages + Top Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              Top Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No page view data yet.</p>
            ) : (
              <div className="space-y-2">
                {topPages.map((p, i) => (
                  <div key={p.path} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={p.path}>{p.path || "/"}</p>
                      <div className="h-1.5 rounded-full bg-muted mt-1">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${Math.round((p.views / (topPages[0]?.views || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{p.views.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="h-4 w-4" />
              Top Referrers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : topReferrers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No referrer data yet. Most traffic is direct.</p>
            ) : (
              <div className="space-y-2">
                {topReferrers.map((r, i) => (
                  <div key={r.referrer} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={r.referrer}>{r.referrer}</p>
                      <div className="h-1.5 rounded-full bg-muted mt-1">
                        <div
                          className="h-1.5 rounded-full bg-secondary"
                          style={{ width: `${Math.round((r.views / (topReferrers[0]?.views || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{r.views.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Users Bar Chart */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            New Signups by Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
          ) : newUsersByDay.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No signup data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={newUsersByDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => {
                    const dt = new Date(d + "T00:00:00");
                    return `${dt.getMonth() + 1}/${dt.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip
                  formatter={(value: number) => [value, "New Signups"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar dataKey="signups" fill="#FF4D6D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// AFFILIATES TAB
// ============================================================
function AffiliatesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [payoutModal, setPayoutModal] = useState<{ affiliateId: number; name: string } | null>(null);
  const [payoutForm, setPayoutForm] = useState({ amountUsd: "", method: "paypal", reference: "", note: "" });
  const [activeSubTab, setActiveSubTab] = useState<"affiliates" | "conversions">("affiliates");

  const { data: affiliates = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/affiliates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/affiliates");
      return res.json();
    },
  });

  const { data: conversions = [], isLoading: conversionsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/affiliates/conversions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/affiliates/conversions");
      return res.json();
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/affiliates/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      toast({ title: "Affiliate updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const payoutMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("POST", `/api/admin/affiliates/${id}/payout`, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Payout failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      setPayoutModal(null);
      setPayoutForm({ amountUsd: "", method: "paypal", reference: "", note: "" });
      toast({ title: "Payout recorded" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const totalPending = affiliates.reduce((s: number, a: any) => s + (a.pendingBalance ?? 0), 0);
  const totalPaid = affiliates.reduce((s: number, a: any) => s + (a.paidBalance ?? 0), 0);
  const totalCommission = conversions.reduce((s: number, c: any) => s + (c.commissionUsd ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="rounded-xl">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground mb-1">Total Affiliates</p>
            <p className="text-2xl font-bold">{affiliates.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground mb-1">Total Commissions Owed</p>
            <p className="text-2xl font-bold text-yellow-600">${totalPending.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground mb-1">Total Paid Out</p>
            <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeSubTab === "affiliates" ? "border-[#5A45FF] text-[#5A45FF]" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveSubTab("affiliates")}
        >
          Affiliates
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeSubTab === "conversions" ? "border-[#5A45FF] text-[#5A45FF]" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveSubTab("conversions")}
        >
          All Conversions
        </button>
      </div>

      {activeSubTab === "affiliates" && (
        <Card className="rounded-xl">
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#5A45FF] border-t-transparent" />
              </div>
            ) : affiliates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No affiliates yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Signups</TableHead>
                    <TableHead>Pending $</TableHead>
                    <TableHead>Paid $</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((aff: any) => (
                    <TableRow key={aff.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{aff.name}</p>
                          <p className="text-xs text-muted-foreground">{aff.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{aff.code}</span>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{aff.platform}</TableCell>
                      <TableCell className="text-sm">{aff.stats?.signups ?? 0}</TableCell>
                      <TableCell className="font-semibold text-yellow-600 text-sm">${(aff.pendingBalance ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="font-semibold text-green-600 text-sm">${(aff.paidBalance ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={aff.status === "active" ? "default" : "secondary"} className="text-xs">
                          {aff.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs rounded-lg h-7"
                            onClick={() => setPayoutModal({ affiliateId: aff.id, name: aff.name })}
                          >
                            Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`text-xs rounded-lg h-7 ${aff.status === "active" ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
                            onClick={() => suspendMutation.mutate({
                              id: aff.id,
                              status: aff.status === "active" ? "suspended" : "active",
                            })}
                          >
                            {aff.status === "active" ? "Suspend" : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeSubTab === "conversions" && (
        <Card className="rounded-xl">
          <CardContent className="pt-4">
            {conversionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#5A45FF] border-t-transparent" />
              </div>
            ) : conversions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No conversions yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Affiliate ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs font-mono">{c.affiliateId}</TableCell>
                      <TableCell className="text-xs capitalize">
                        {c.type === "sb_purchase" ? "SB Purchase" : c.type === "plus_subscription" ? "Plus Sub" : "Credits"}
                      </TableCell>
                      <TableCell className="text-sm">${c.revenueUsd?.toFixed(2)}</TableCell>
                      <TableCell className="text-sm font-semibold text-[#5A45FF]">${c.commissionUsd?.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{Math.round((c.commissionRate ?? 0) * 100)}%</TableCell>
                      <TableCell>
                        <Badge variant={c.paid ? "default" : "secondary"} className="text-xs">
                          {c.paid ? "Paid" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payout Modal */}
      {payoutModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-base mb-4">Record Payout — {payoutModal.name}</h3>
            <div className="space-y-4">
              <div>
                <Label>Amount (USD) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="25.00"
                  value={payoutForm.amountUsd}
                  onChange={e => setPayoutForm(f => ({ ...f, amountUsd: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label>Method</Label>
                <Input
                  placeholder="paypal"
                  value={payoutForm.method}
                  onChange={e => setPayoutForm(f => ({ ...f, method: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label>Reference (PayPal Transaction ID)</Label>
                <Input
                  placeholder="PAYPAL-123456"
                  value={payoutForm.reference}
                  onChange={e => setPayoutForm(f => ({ ...f, reference: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label>Note</Label>
                <Input
                  placeholder="Optional note"
                  value={payoutForm.note}
                  onChange={e => setPayoutForm(f => ({ ...f, note: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setPayoutModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-[#5A45FF] hover:bg-[#4835EF]"
                  disabled={payoutMutation.isPending || !payoutForm.amountUsd}
                  onClick={() => {
                    payoutMutation.mutate({
                      id: payoutModal.affiliateId,
                      data: {
                        amountUsd: parseFloat(payoutForm.amountUsd),
                        method: payoutForm.method,
                        reference: payoutForm.reference,
                        note: payoutForm.note,
                      },
                    });
                  }}
                >
                  {payoutMutation.isPending ? "Saving..." : "Record Payout"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
