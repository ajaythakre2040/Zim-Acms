import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useCrud<T>(endpoint: string, label: string) {
  const { toast } = useToast();

  const query = useQuery<T[]>({
    queryKey: [endpoint],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", endpoint, data);

      // ERROR HANDLING: Duplicate check ke liye zaroori hai
      if (!res.ok) {
        const errorData = await res.json();
        const error = new Error(errorData.message || "Failed");
        (error as any).response = { data: errorData };
        throw error;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({ title: `${label} created successfully` });
    },
    onError: (e: any) => {
      // Duplicate error ko silent rakhein taaki local catch block handle kare
      if (!e.response?.data?.isDuplicate) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    },
  });
  const updateMutation = useMutation({
    // FIX: Update hamesha PUT hota hai aur endpoint ke saath ID jaati hai
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `${endpoint}/${id}`, data);

      if (!res.ok) {
        const errorData = await res.json();
        const error = new Error(errorData.message || "Failed");
        (error as any).response = { data: errorData };
        throw error;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({ title: `${label} updated successfully` });
    },
    onError: (e: any) => {
      if (!e.response?.data?.isDuplicate) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `${endpoint}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({ title: `${label} deleted` });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    create: createMutation.mutateAsync, // MasterTab ke 'await' ke liye
    update: updateMutation.mutateAsync, // MasterTab ke 'await' ke liye
    remove: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}