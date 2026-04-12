import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { SwapBucksAmount, UserAvatar } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  ArrowLeftRight,
  Search,
  Bell,
  LayoutDashboard,
  Mail,
  Wallet,
  Package,
  Coins,
  Scale,
  Settings,
  Shield,
  Menu,
  LogOut,
  Home,
  ShoppingBag,
  HelpCircle,
  UserPlus,
  LogIn,
  Share2,
  Crown,
  Trophy,
  Gift,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOnboarding } from "@/components/onboarding-guard";
import { ReactNode, useState } from "react";

// ============================
// Logo Component
// ============================
export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" data-testid="logo">
      <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-white">
        <ArrowLeftRight className="h-5 w-5" />
      </div>
      {!collapsed && <span className="font-bold text-xl tracking-tight">Swapedly</span>}
    </Link>
  );
}

// ============================
// Public Layout
// ============================
export function PublicLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/marketplace" className={cn("text-sm font-medium transition-colors hover:text-primary", location === "/marketplace" && "text-primary")}>
                Marketplace
              </Link>
              <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                How it Works
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="signin-nav-btn" className="gap-1.5">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" data-testid="signup-nav-btn">
                <UserPlus className="h-4 w-4 mr-1" />
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Logo />
              <p className="mt-2 text-sm text-muted-foreground">Trade smarter with Swap Bucks.</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/marketplace" className="hover:text-foreground">Marketplace</Link></li>
                <li><a href="#" className="hover:text-foreground">How it Works</a></li>
                <li><a href="#" className="hover:text-foreground">Categories</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground">Safety Tips</a></li>
                <li><a href="#" className="hover:text-foreground">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <Separator />
          <div className="pt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Swapedly. All rights reserved.</p>
            <PerplexityAttribution />
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================
// Sidebar Nav Items
// ============================
// Base items always shown
const BASE_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/messages", label: "Messages", icon: Mail, badgeKey: "unreadMessages" as const },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/my-listings", label: "My Listings", icon: Package },
  { href: "/earn", label: "Earn Swap Bucks", icon: Coins },
  { href: "/gift-card/share", label: "Send Gift Card", icon: Gift },
  { href: "/share-earn", label: "Share & Earn", icon: Share2 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

// Items that unlock after the user creates their first listing
const UNLOCKED_ITEMS = [
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag, requiresMarketplace: true },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/membership", label: "Membership", icon: Crown },
  { href: "/disputes", label: "Disputes", icon: Scale },
  { href: "/admin", label: "Admin Console", icon: Shield, adminOnly: true },
] as const;

function SidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  const [location] = useLocation();
  const { user, isAdmin } = useAuth();
  const { data: onboarding } = useOnboarding();

  // Marketplace (and rest of sidebar) unlocks after user creates their first listing
  const hasListed = !!(onboarding?.listingsCreated && onboarding.listingsCreated >= 1) || !!onboarding?.onboardingComplete;
  const canAccessMarketplace = !!onboarding?.canAccessMarketplace;

  const sidebarItems = [
    ...BASE_ITEMS,
    ...(hasListed ? UNLOCKED_ITEMS.filter((item: any) => !item.requiresMarketplace || canAccessMarketplace) : []),
  ] as any[];

  const { data: unreadCount } = useQuery<number>({
    queryKey: ["/api/messages/unread-count"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
    refetchInterval: 30000,
  });

  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {sidebarItems
        .filter((item: any) => !item.adminOnly || isAdmin)
        .map((item: any) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const badge = item.badgeKey === "unreadMessages" ? unreadCount : undefined;
          return (
            <Link key={item.href} href={item.href} onClick={onNavClick}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span className="flex-1">{item.label}</span>
                {badge !== undefined && badge > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] text-[10px] px-1.5 justify-center">
                    {badge}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
    </nav>
  );
}

// ============================
// Authenticated Layout
// ============================
export function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: wallet } = useQuery<{ balance: number }>({
    queryKey: ["/api/wallet"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const { data: notifCount } = useQuery<number>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center h-16 px-4 gap-4">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" data-testid="mobile-menu-btn">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="p-4 border-b">
                <Logo />
              </div>
              <ScrollArea className="h-[calc(100vh-65px)]">
                <SidebarNav onNavClick={() => setMobileOpen(false)} />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="hidden lg:block">
            <Logo />
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search marketplace..."
                className="pl-10 h-9 rounded-xl bg-muted border-none"
                data-testid="header-search"
              />
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className={cn(location === "/dashboard" && "text-primary")}>
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" className={cn(location === "/marketplace" && "text-primary")}>
                <ShoppingBag className="h-4 w-4" />
              </Button>
            </Link>
          </nav>

          {/* Wallet badge */}
          <Link href="/wallet">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" data-testid="wallet-badge">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold">{wallet?.balance?.toLocaleString() ?? "0"}</span>
              <span className="text-muted-foreground text-xs">SB</span>
            </Button>
          </Link>

          {/* Notifications */}
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="relative" data-testid="notification-bell">
              <Bell className="h-5 w-5" />
              {(notifCount ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {notifCount}
                </span>
              )}
            </Button>
          </Link>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none" data-testid="user-menu-trigger">
                <UserAvatar user={user || {}} size="sm" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">{user?.displayName || user?.username}</p>
                  {(user as any)?.membershipTier === "plus" && (
                    <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">PLUS</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/user/${user?.id}`} className="cursor-pointer">
                  View Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="text-destructive cursor-pointer" data-testid="logout-btn">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r bg-white shrink-0">
          <ScrollArea className="flex-1 pt-4">
            <SidebarNav />
          </ScrollArea>
          <div className="p-3 border-t">
            <PerplexityAttribution />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 md:p-6 max-w-7xl">
            {children}
          </div>
          <div className="lg:hidden">
            <PerplexityAttribution />
          </div>
        </main>
      </div>
    </div>
  );
}
