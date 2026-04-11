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
  listingCredits: number;
  sbBalance: number;
  sbRequired: number;
  canAccessMarketplace: boolean;
  hasProfileImage: boolean;
};

// Pages that should bypass onboarding checks
const BYPASS_PATHS = [
  "/", "/signup", "/create-listing", "/edit-listing",
  "/membership", "/complete-profile", "/settings",
  "/notifications",
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

    // Route based on onboarding step
    switch (onboarding.step) {
      case "listings":
        // Need to create 3 listings first
        if (location !== "/create-listing") {
          navigate("/create-listing");
        }
        break;
      case "membership":
        // Need to get membership or credits
        if (location !== "/membership") {
          navigate("/membership");
        }
        break;
      case "profile":
        // Need to complete profile tasks
        if (location !== "/complete-profile") {
          navigate("/complete-profile");
        }
        break;
      // "complete" means done
    }
  }, [isAuthenticated, onboarding, location, navigate]);

  // For marketplace specifically, check the 30 SB gate
  useEffect(() => {
    if (!isAuthenticated || !onboarding) return;
    if (onboarding.onboardingComplete) return;
    if (location === "/marketplace" && !onboarding.canAccessMarketplace) {
      navigate("/complete-profile");
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
