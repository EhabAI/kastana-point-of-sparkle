import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Category {
  id: string;
  name: string;
}

interface CategoryListProps {
  categories: Category[];
  selectedCategoryId: string | undefined;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryList({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryListProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              selectedCategoryId === category.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {category.name}
          </button>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No categories found
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
