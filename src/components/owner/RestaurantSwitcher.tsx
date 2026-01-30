import { useRestaurantContext } from "@/contexts/RestaurantContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function RestaurantSwitcher() {
  const { restaurants, selectedRestaurant, setSelectedRestaurantId, isLoading, hasMultipleRestaurants } = useRestaurantContext();

  if (isLoading) {
    return <Skeleton className="h-6 w-32" />;
  }

  // If only one restaurant, show the name without dropdown
  if (!hasMultipleRestaurants) {
    return (
      <div className="flex items-center gap-2">
        {selectedRestaurant?.logo_url ? (
          <img
            src={selectedRestaurant.logo_url}
            alt={selectedRestaurant.name}
            className="h-6 w-6 object-contain rounded-md"
          />
        ) : selectedRestaurant?.name ? (
          <div className="h-6 w-6 rounded-md bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">
              {selectedRestaurant.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        ) : (
          <div className="h-6 w-6 rounded-md bg-blue-200 dark:bg-blue-800" />
        )}
        {selectedRestaurant?.name && (
          <span className="text-xs font-semibold text-blue-900 dark:text-blue-100 truncate max-w-[120px] sm:max-w-[200px]">
            {selectedRestaurant.name}
          </span>
        )}
      </div>
    );
  }

  // Multiple restaurants - show dropdown
  return (
    <div className="flex items-center gap-1.5">
      {selectedRestaurant?.logo_url ? (
        <img
          src={selectedRestaurant.logo_url}
          alt={selectedRestaurant.name}
          className="h-6 w-6 object-contain rounded-md"
        />
      ) : selectedRestaurant?.name ? (
        <div className="h-6 w-6 rounded-md bg-blue-600 dark:bg-blue-500 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-white">
            {selectedRestaurant.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
      ) : (
        <Building2 className="h-5 w-5 text-blue-700 dark:text-blue-300 shrink-0" />
      )}

      <Select
        value={selectedRestaurant?.id || ""}
        onValueChange={setSelectedRestaurantId}
      >
        <SelectTrigger className="h-6 w-auto min-w-[100px] max-w-[180px] border-0 bg-transparent hover:bg-blue-200/50 dark:hover:bg-blue-800/50 focus:ring-0 focus:ring-offset-0 px-1.5 text-xs font-semibold text-blue-900 dark:text-blue-100">
          <SelectValue placeholder="اختر المطعم" />
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-50">
          {restaurants.map((restaurant) => (
            <SelectItem key={restaurant.id} value={restaurant.id}>
              <div className="flex items-center gap-2">
                {restaurant.logo_url ? (
                  <img
                    src={restaurant.logo_url}
                    alt={restaurant.name}
                    className="h-4 w-4 object-contain rounded"
                  />
                ) : (
                  <div className="h-4 w-4 rounded bg-blue-500 flex items-center justify-center">
                    <span className="text-[7px] font-bold text-white">
                      {restaurant.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="truncate">{restaurant.name}</span>
                {!restaurant.is_active && (
                  <span className="text-xs text-destructive">(معطل)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
