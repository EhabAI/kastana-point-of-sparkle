import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  
  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {categories.map((category) => {
          const isSelected = selectedCategoryId === category.id;
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                "relative w-full text-left px-4 py-3 rounded-lg text-sm transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "font-medium hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active indicator line */}
              {isSelected && (
                <span className="absolute inset-y-1 ltr:left-0 rtl:right-0 w-1 bg-primary-foreground/40 rounded-full" />
              )}
              {category.name}
            </button>
          );
        })}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("no_categories_found")}
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
