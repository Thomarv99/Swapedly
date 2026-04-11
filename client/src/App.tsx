import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

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
import NotFound from "@/pages/not-found";
import { OnboardingGuard } from "@/components/onboarding-guard";

function AppRouter() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={WelcomePage} />
      <Route path="/pricing" component={PricingPage} />
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
          <OnboardingGuard>
            <AppRouter />
          </OnboardingGuard>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
