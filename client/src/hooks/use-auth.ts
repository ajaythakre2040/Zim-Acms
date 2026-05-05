import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

// async function fetchUser(): Promise<User | null> {
//   const response = await fetch("/api/auth/user", {
//     credentials: "include",
//   });

//   if (response.status === 401) {
//     return null;
//   }

//   if (!response.ok) {
//     throw new Error(`${response.status}: ${response.statusText}`);
//   }

//   return response.json();
// }

// export function useAuth() {
//   const queryClient = useQueryClient();
//   const { data: user, isLoading } = useQuery<User | null>({
//     queryKey: ["/api/auth/user"],
//     queryFn: fetchUser,
//     retry: false,
//     staleTime: 1000 * 60 * 5,
//   });
async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/user", { // API endpoint ko storage.ts ke route se match karein
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    // Agar server down hai ya koi aur error hai, toh loop se bachne ke liye null return karein
    return null;
  }

  return response.json();
}

export function useAuth() {
    const queryClient = useQueryClient();

    const { data: user, isLoading, error } = useQuery<User | null>({
      queryKey: ["/api/user"],
      queryFn: fetchUser,
      retry: false, // Bahut zaroori: Failed auth ko baar-baar retry na karein
      staleTime: 1000 * 60 * 5, // 5 minutes tak data ko fresh maane
      refetchOnWindowFocus: false, // Window focus par baar-baar fetch na karein
    });
  
  
  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; email?: string; firstName?: string; lastName?: string }) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error?.message,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    registerError: registerMutation.error?.message,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
