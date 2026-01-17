import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ToggleFavoriteParams {
  itemId: string;
  isFavorite: boolean;
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, isFavorite }: ToggleFavoriteParams) => {
      const { data, error } = await supabase
        .from("menu_items")
        .update({ is_favorite: isFavorite })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ itemId, isFavorite }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["cashier-menu-items"] });
      await queryClient.cancelQueries({ queryKey: ["cashier-all-menu-items"] });
      await queryClient.cancelQueries({ queryKey: ["cashier-favorite-items"] });

      // Snapshot the previous values
      const previousMenuItems = queryClient.getQueriesData({ queryKey: ["cashier-menu-items"] });
      const previousAllMenuItems = queryClient.getQueriesData({ queryKey: ["cashier-all-menu-items"] });
      const previousFavorites = queryClient.getQueriesData({ queryKey: ["cashier-favorite-items"] });

      // Optimistically update menu items
      queryClient.setQueriesData({ queryKey: ["cashier-menu-items"] }, (old: any) => {
        if (!old) return old;
        return old.map((item: any) =>
          item.id === itemId ? { ...item, is_favorite: isFavorite } : item
        );
      });

      // Optimistically update all menu items
      queryClient.setQueriesData({ queryKey: ["cashier-all-menu-items"] }, (old: any) => {
        if (!old) return old;
        return old.map((item: any) =>
          item.id === itemId ? { ...item, is_favorite: isFavorite } : item
        );
      });

      // Optimistically update favorites (add or remove)
      queryClient.setQueriesData({ queryKey: ["cashier-favorite-items"] }, (old: any) => {
        if (!old) return old;
        if (isFavorite) {
          // Item being added to favorites - will be refetched properly
          return old;
        } else {
          // Item being removed from favorites
          return old.filter((item: any) => item.id !== itemId);
        }
      });

      return { previousMenuItems, previousAllMenuItems, previousFavorites };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousMenuItems) {
        context.previousMenuItems.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousAllMenuItems) {
        context.previousAllMenuItems.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousFavorites) {
        context.previousFavorites.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["cashier-menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-all-menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-favorite-items"] });
    },
  });
}
