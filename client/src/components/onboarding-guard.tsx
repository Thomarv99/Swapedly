import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ReactNode, useEffect } from "react";

type OnboardingStatus = {
  onboardingComplete: boolean;
  step: string;
  listingsCreated: number;
  listingsRequired: number;
  hasMembership: boolean;
  isPlus: boolean;
  purchaseCredits: number;
  sbBalance: number;
  sbRequired: number;
  canAccessMarketplace: boolean;
  hasProfileImage: boolean;
};

// Pages that should bypass onboarding checks
const BYPASS_PATHS = [
  "/", "/signup", "/create-listing", "/edit-listing",
  "/membership", "/complete-profile", "/settings",
  "/notifications", "/listing", "/leaderboard", "/login", "/gift-card",
  "/pricing", "/terms", "/privacy", "/refunds",
];

function shouldBypass(path: string): boolean {
  return BYPASS_PATHS.some((bp) => path === bp || path.startsWith(bp + "/"));
}

/**
 * OnboardingGuard wraps authenticated routes and redirects users
 * to the correct onboarding step if they haven't completed onboarding.
 */
export function OnboardingGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();

  const { data: onboarding } = useQuery<OnboardingStatus>({
    queryKey: ["/api/onboarding"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/onboarding");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 10000, // cache for 10s to avoid flashing
  });

  useEffect(() => {
    if (!isAuthenticated || !onboarding) return;
    if (onboarding.onboardingComplete) return;
    if (shouldBypass(location)) return;

    // Gate 1: must create a listing first
    if (onboarding.step === "listings") {
      if (location !== "/create-listing") navigate("/create-listing");
      return;
    }

    // Gate 2: marketplace requires 30 SB earned — redirect to dashboard to show progress
    if (location === "/marketplace" && !onboarding.canAccessMarketplace) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, onboarding, location, navigate]);

  return <>{children}</>;
}

/**
 * Hook to get onboarding status for use in components
 */
export function useOnboarding() {
  const { isAuthenticated } = useAuth();

  return useQuery<OnboardingStatus>({
    queryKey: ["/api/onboarding"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/onboarding");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 10000,
  });
}
