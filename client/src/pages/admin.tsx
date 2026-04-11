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
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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
