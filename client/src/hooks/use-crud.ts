import { useState } from "react"; 
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
export function useCrud<T>(endpoint: string, label: string) {
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const query = useQuery<T[]>({
    queryKey: [endpoint],
  });
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      setErrors({}); 
      const res = await apiRequest("POST", endpoint, data);
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
      const errorData = e.response?.data;
      if (errorData?.isDuplicate) {
        const field = errorData.message.toLowerCase().includes("code") ? "code" : "name";
        setErrors({ [field]: errorData.message });
        toast({
          title: "Duplicate Entry",
          description: errorData.message,
          variant: "destructive"
        });
      } else {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    },
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      setErrors({});
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
      const errorData = e.response?.data;
      if (errorData?.isDuplicate) {
        const field = errorData.message.toLowerCase().includes("code") ? "code" : "name";
        setErrors({ [field]: errorData.message });
        toast({ title: "Duplicate Entry", description: errorData.message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `${endpoint}/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete");
      }
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
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutate,
    errors,        
    setErrors,     
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}