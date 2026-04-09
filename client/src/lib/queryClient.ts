import { QueryClient, QueryFunction } from "@tanstack/react-query";

// async function throwIfResNotOk(res: Response) {
//   if (!res.ok) {
//     const text = (await res.text()) || res.statusText;
//     throw new Error(`${res.status}: ${text}`);
//   }
// }
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let cleanMessage = "";

    try {
      // Agar backend ne JSON bheja hai, toh uska sirf message nikal lo
      const parsed = JSON.parse(text);
      cleanMessage = parsed.message || text;
    } catch (e) {
      // Agar JSON nahi hai, toh raw text use karein
      cleanMessage = text || res.statusText;
    }

    // IMPORTANT: Yahan se `${res.status}:` hata dein
    // Sirf clean message throw karein
    throw new Error(cleanMessage);
  }
}
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),

      // --- Auto-refresh settings ---
      refetchInterval: 3000,          // Har 3 second mein data refresh hoga
      refetchIntervalInBackground: true, // Doosri tab open ho tab bhi sync chalta rahega
      refetchOnWindowFocus: true,     // Tab par wapas aate hi refresh karega
      refetchOnReconnect: true,      // Internet wapas aane par sync karega

      staleTime: 0,                   // Data ko hamesha fresh rakhega
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
// export const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       queryFn: getQueryFn({ on401: "throw" }),
//       refetchInterval: false,
//       refetchOnWindowFocus: false,
//       staleTime: Infinity,
//       retry: false,
//     },
//     mutations: {
//       retry: false,
//     },
//   },
// });
