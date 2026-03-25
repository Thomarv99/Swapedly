import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, setAuthToken, getAuthToken } from "@/lib/queryClient";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: Infinity,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (userData) => {
      // Extract and store auth token
      if (userData.token) {
        setAuthToken(userData.token);
        const { token: _, ...userWithoutToken } = userData;
        queryClient.setQueryData(["/api/auth/me"], userWithoutToken);
      } else {
        queryClient.setQueryData(["/api/auth/me"], userData);
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; email: string; password: string; referralCode?: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: (userData) => {
      if (userData.token) {
        setAuthToken(userData.token);
        const { token: _, ...userWithoutToken } = userData;
        queryClient.setQueryData(["/api/auth/me"], userWithoutToken);
      } else {
        queryClient.setQueryData(["/api/auth/me"], userData);
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      setAuthToken(null);
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    registerPending: registerMutation.isPending,
  };
}
