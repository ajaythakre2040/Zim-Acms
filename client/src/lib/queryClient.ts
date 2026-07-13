import { QueryClient, QueryFunction } from "@tanstack/react-query";

// async function throwIfResNotOk(res: Response) {
//   if (!res.ok) {
//     const text = (await res.text()) || res.statusText;
//     throw new Error(`${res.status}: ${text}`);
//   }
// }
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Clone use karein taaki body ko doosri baar read kiya ja sake (useCrud mein)
    const clonedRes = res.clone();
    const text = await clonedRes.text();
    let cleanMessage = "";

    try {
      const parsed = JSON.parse(text);
      // Agar array hai (validation error), toh stringify karke throw karein
      // taaki error.message mein pura data mil sake
      if (Array.isArray(parsed)) {
        cleanMessage = JSON.stringify(parsed);
      } else {
        cleanMessage = parsed.message || text;
      }
    } catch (e) {
      cleanMessage = text || res.statusText;
    }

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
// export const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       queryFn: getQueryFn({ on401: "throw" }),

//       // --- Auto-refresh settings ---
//       refetchInterval: 3000,          // Har 3 second mein data refresh hoga
//       refetchIntervalInBackground: true, // Doosri tab open ho tab bhi sync chalta rahega
//       refetchOnWindowFocus: true,     // Tab par wapas aate hi refresh karega
//       refetchOnReconnect: true,      // Internet wapas aane par sync karega

//       staleTime: 0,                   // Data ko hamesha fresh rakhega
//       retry: false,
//     },
//     mutations: {
//       retry: false,
//     },
//   },
// });


// export const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       queryFn: getQueryFn({ on401: "throw" }),

//       // ⚡ REFETCH INTERVAL: Jismein bhi match milega, 2 second chalega
//       refetchInterval: (query) => {
//         const keys = query.queryKey.map(k => String(k));

//         const isLiveLogs = keys.some(k => k.includes('machine-logs'));
//         const isLiveDevices = keys.some(k => k.includes('live-status')); // 👈 Naya page add kiya
//         // const isNotifications = keys.some(k => k.includes('alerts')); // Future ke liye kuch bhi jod sakte ho

//         if (isLiveLogs || isLiveDevices) {
//           return 60000;
//         }
//         return false; // Baaki poori app shant
//       },

//       // ⚡ STALE TIME: Unhi special pages ke liye 0, baki sab ke liye Infinity
//       staleTime: (query) => {
//         const keys = query.queryKey.map(k => String(k));

//         const isLiveLogs = keys.some(k => k.includes('machine-logs'));
//         const isLiveDevices = keys.some(k => k.includes('live-status')); // 👈 Yahan bhi naya page add kiya

//         if (isLiveLogs || isLiveDevices) {
//           return 0;
//         }
//         return Infinity;
//       },

//       refetchOnWindowFocus: false,
//       retry: false,
//     },
//     mutations: {
//       retry: false,
//     },
//   },
// });


export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
