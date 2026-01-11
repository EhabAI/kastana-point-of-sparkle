import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Eye, Download } from "lucide-react";

interface ReportSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onViewDetails?: () => void;
  onExport?: () => void;
  className?: string;
}

export function ReportSection({
  title,
  icon,
  children,
  onViewDetails,
  onExport,
  className = "",
}: ReportSectionProps) {
  const { t } = useLanguage();

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
              className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
            >
              <Eye className="h-3 w-3" />
              {t("view_details")}
            </Button>
          )}
          {onExport && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              className="h-7 px-2 text-xs gap-1"
            >
              <Download className="h-3 w-3" />
              {t("export")}
            </Button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
