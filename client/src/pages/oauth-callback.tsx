/**
 * OAuth callback handler — receives token from Google redirect
 * and stores it in the app, then redirects to dashboard.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { setAuthToken } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function OAuthCallbackPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const token = params.get("token");
    const error = params.get("error");

    if (error || !token) {
      navigate("/login?error=oauth_failed");
      return;
    }

    // Store the token exactly like a normal login
    setAuthToken(token);
    // Force re-fetch of user
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    navigate("/dashboard");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
