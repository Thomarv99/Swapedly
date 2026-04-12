import { Switch, Route, Router, Redirect, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

// Pages
import WelcomePage from "@/pages/welcome";
import SignUpPage from "@/pages/signup";
import MarketplacePage from "@/pages/marketplace";
import ListingDetailPage from "@/pages/listing-detail";
import UserProfilePage from "@/pages/user-profile";
import DashboardPage from "@/pages/dashboard";
import WalletPage from "@/pages/wallet";
import CreateEditListingPage from "@/pages/create-listing";
import MyListingsPage from "@/pages/my-listings";
import MessagesPage from "@/pages/messages";
import EarnPage from "@/pages/earn";
import ShareEarnPage from "@/pages/share-earn";
import MembershipPage from "@/pages/membership";
import DisputesPage from "@/pages/disputes";
import SettingsPage from "@/pages/settings";
import NotificationsPage from "@/pages/notifications";
import AdminPage from "@/pages/admin";
import CompleteProfilePage from "@/pages/complete-profile";
import PricingPage from "@/pages/pricing";
import LeaderboardPage from "@/pages/leaderboard";
import TransactionDetailPage from "@/pages/transaction-detail";
import OAuthCallbackPage from "@/pages/oauth-callback";
import LoginPage from "@/pages/login";
import GiftCardPage from "@/pages/gift-card";
import GiftCardSharePage from "@/pages/gift-card-share";
import GiftCardWallPage from "@/pages/gift-card-wall";
import OnboardingPage from "@/pages/onboarding";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import RefundsPage from "@/pages/refunds";
import NotFound from "@/pages/not-found";
import { OnboardingGuard } from "@/components/onboarding-guard";

// Generates a random session ID persisted for the tab's lifetime
function getSessionId(): string {
  // Use a module-level variable — not storage (blocked in sandbox)
  if (!(window as any).__swapedly_sid__) {
    (window as any).__swapedly_sid__ = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return (window as any).__swapedly_sid__;
}

// Tracks page views and sends heartbeats — rendered inside the Router so useLocation works
function AnalyticsTracker() {
  const [location] = useLocation();
  const sessionId = getSessionId();
  const lastPath = useRef<string | null>(null);

  // Track page view on every route change
  useEffect(() => {
    if (location === lastPath.current) return;
    lastPath.current = location;
    apiRequest("POST", "/api/analytics/pageview", {
      path: location,
      referrer: document.referrer || "",
      sessionId,
    }).catch(() => {});
  }, [location, sessionId]);

  // Heartbeat every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      apiRequest("POST", "/api/analytics/heartbeat", { sessionId }).catch(() => {});
    }, 30_000);
    // Initial heartbeat
    apiRequest("POST", "/api/analytics/heartbeat", { sessionId }).catch(() => {});
    return () => clearInterval(interval);
  }, [sessionId]);

  return null;
}

function AppRouter() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={WelcomePage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
        <Route path="/transactions/:id" component={TransactionDetailPage} />
        <Route path="/oauth-callback" component={OAuthCallbackPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/gift-card" component={GiftCardPage} />
        <Route path="/gift-card/share" component={GiftCardSharePage} />
        <Route path="/gift-card/wall" component={GiftCardWallPage} />
        <Route path="/welcome-tour" component={OnboardingPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/refunds" component={RefundsPage} />
      <Route path="/signup" component={SignUpPage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/listing/:id" component={ListingDetailPage} />
      <Route path="/user/:id" component={UserProfilePage} />

      {/* Authenticated */}
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/my-listings" component={MyListingsPage} />
      <Route path="/create-listing" component={CreateEditListingPage} />
      <Route path="/edit-listing/:id" component={CreateEditListingPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/messages/:conversationId" component={MessagesPage} />
      <Route path="/earn" component={EarnPage} />
      <Route path="/share-earn" component={ShareEarnPage} />
      <Route path="/membership" component={MembershipPage} />
      <Route path="/complete-profile" component={CompleteProfilePage} />
      <Route path="/disputes" component={DisputesPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/admin" component={AdminPage} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AnalyticsTracker />
          <OnboardingGuard>
            <AppRouter />
          </OnboardingGuard>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
