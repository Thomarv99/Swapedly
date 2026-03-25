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
import MessagesPage from "@/pages/messages";
import EarnPage from "@/pages/earn";
import DisputesPage from "@/pages/disputes";
import SettingsPage from "@/pages/settings";
import NotificationsPage from "@/pages/notifications";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={WelcomePage} />
      <Route path="/signup" component={SignUpPage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/listing/:id" component={ListingDetailPage} />
      <Route path="/user/:id" component={UserProfilePage} />

      {/* Authenticated */}
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/create-listing" component={CreateEditListingPage} />
      <Route path="/edit-listing/:id" component={CreateEditListingPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/messages/:conversationId" component={MessagesPage} />
      <Route path="/earn" component={EarnPage} />
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
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
