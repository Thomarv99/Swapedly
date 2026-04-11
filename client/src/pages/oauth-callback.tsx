/**
 * OAuth callback handler — receives token from Google redirect
 * URL format: /#/oauth-callback?token=xxx&userId=yyy
 * Wouter hash router gives us path=/oauth-callback, but params are in window.location.hash
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { setAuthToken, queryClient } from "@/lib/queryClient";

export default function OAuthCallbackPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // The full hash is like: #/oauth-callback?token=xxx&userId=yyy
    // Split on ? to get the query string part
    const hash = window.location.hash; // e.g. "#/oauth-callback?token=abc&userId=1"
    const queryString = hash.includes("?") ? hash.split("?")[1] : "";
    const params = new URLSearchParams(queryString);

    const token = params.get("token");
    const error = params.get("error");

    if (error || !token) {
      navigate("/");
      return;
    }

    // Store token exactly like a normal login
    setAuthToken(token);
    // Force re-fetch of user
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    // Small delay to let auth state settle, then go to dashboard
    setTimeout(() => navigate("/dashboard"), 100);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Signing you in with Google...</p>
      </div>
    </div>
  );
}
