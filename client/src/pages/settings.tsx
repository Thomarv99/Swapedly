import { AuthenticatedLayout } from "@/components/layouts";
import { UserAvatar } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User, Lock, Bell, Link2, Trash2, Camera, Save, Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { useState } from "react";

type ProfileForm = {
  displayName: string;
  username: string;
  bio: string;
  location: string;
  avatarUrl: string;
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notifPrefs, setNotifPrefs] = useState({
    purchases: true,
    messages: true,
    disputes: true,
    promotions: false,
  });

  const { register, handleSubmit } = useForm<ProfileForm>({
    defaultValues: {
      displayName: user?.displayName || "",
      username: user?.username || "",
      bio: user?.bio || "",
      location: user?.location || "",
      avatarUrl: user?.avatarUrl || "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      await apiRequest("PUT", "/api/users/me", data);
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await apiRequest("POST", "/api/auth/change-password", data);
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    passwordMutation.mutate({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
  };

  const notifMutation = useMutation({
    mutationFn: async (prefs: typeof notifPrefs) => {
      await apiRequest("PUT", "/api/users/me", { notificationPrefs: prefs });
    },
    onSuccess: () => {
      toast({ title: "Notification preferences updated" });
    },
  });

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Profile Info */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your public profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((data) => profileMutation.mutate(data))} className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <UserAvatar user={user || {}} size="lg" />
                <div className="space-y-2 flex-1">
                  <Label htmlFor="avatarUrl">Avatar URL</Label>
                  <Input id="avatarUrl" placeholder="https://..." className="rounded-xl" data-testid="settings-avatar" {...register("avatarUrl")} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input id="displayName" className="rounded-xl" data-testid="settings-display-name" {...register("displayName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" className="rounded-xl" data-testid="settings-username" {...register("username")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" placeholder="Tell others about yourself..." rows={3} className="rounded-xl" data-testid="settings-bio" {...register("bio")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="City, State" className="rounded-xl" data-testid="settings-location" {...register("location")} />
              </div>
              <Button type="submit" className="rounded-xl gap-2" disabled={profileMutation.isPending} data-testid="save-profile-btn">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Account Security
            </CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                className="rounded-xl max-w-md"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                data-testid="current-password"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  className="rounded-xl"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  data-testid="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  className="rounded-xl"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  data-testid="confirm-password"
                />
              </div>
            </div>
            <Button
              onClick={handlePasswordChange}
              variant="outline"
              className="rounded-xl gap-2"
              disabled={passwordMutation.isPending}
              data-testid="change-password-btn"
            >
              <Lock className="h-4 w-4" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Choose what email notifications you receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "purchases" as const, label: "Purchases & Sales", desc: "Notifications about transactions" },
              { key: "messages" as const, label: "Messages", desc: "New message notifications" },
              { key: "disputes" as const, label: "Disputes", desc: "Dispute status updates" },
              { key: "promotions" as const, label: "Promotions", desc: "Deals and special offers" },
            ].map((pref) => (
              <div key={pref.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.desc}</p>
                </div>
                <Switch
                  checked={notifPrefs[pref.key]}
                  onCheckedChange={(checked) => {
                    const updated = { ...notifPrefs, [pref.key]: checked };
                    setNotifPrefs(updated);
                    notifMutation.mutate(updated);
                  }}
                  data-testid={`notif-${pref.key}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Connected Accounts */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Connected Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Google", "Apple", "Facebook"].map((provider) => {
              const connected = user?.oauthProvider === provider.toLowerCase();
              return (
                <div key={provider} className="flex items-center justify-between p-3 rounded-xl border">
                  <span className="font-medium text-sm">{provider}</span>
                  {connected ? (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Connected
                    </span>
                  ) : (
                    <Button variant="outline" size="sm" className="rounded-lg" data-testid={`connect-${provider.toLowerCase()}`}>
                      Connect
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="rounded-xl border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="rounded-xl" data-testid="delete-account-btn">
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account, all listings, and transaction history.
                    Your Swap Bucks balance will be forfeited. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground" data-testid="confirm-delete-account">
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
