import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock, Users, Combine, MoveRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TableStatus = "free" | "active" | "held";

interface TableCardProps {
  tableName: string;
  capacity: number;
  tableStatus: TableStatus;
  orderNumber?: number;
  orderCount?: number;
  orderCreatedAt?: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
  onMergeClick?: () => void;
  showMergeButton?: boolean;
  onMoveClick?: () => void;
  showMoveButton?: boolean;
}

function formatDuration(startTime: string, language: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diffMs = now - start;
  
  if (diffMs < 0) {
    return language === "ar" ? "0 س 00 د" : "0h 00m";
  }
  
  // Calculate duration in minutes from milliseconds
  let durationValue = Math.floor(diffMs / 60000);
  
  // Normalize: if value > 1440 (24 hours in minutes), it's likely in seconds
  const totalMinutes = durationValue > 1440 
    ? Math.floor(durationValue / 60) 
    : Math.floor(durationValue);
  
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const paddedMins = mins.toString().padStart(2, "0");
  
  if (language === "ar") {
    return `${hours} س ${paddedMins} د`;
  }
  return `${hours}h ${paddedMins}m`;
}

export function TableCard({
  tableName,
  capacity,
  tableStatus,
  orderNumber,
  orderCount,
  orderCreatedAt,
  onClick,
  disabled,
  selected,
  onMergeClick,
  showMergeButton,
  onMoveClick,
  showMoveButton,
}: TableCardProps) {
  const { t, language } = useLanguage();
  const effectiveCapacity = capacity || 4;
  const defaultDuration = language === "ar" ? "0 س 00 د" : "0h 00m";
  const [duration, setDuration] = useState(() => 
    orderCreatedAt ? formatDuration(orderCreatedAt, language) : defaultDuration
  );
  
  const hasMergedOrders = orderCount && orderCount > 1;
  const isOccupied = tableStatus !== "free";
  
  // Update timer every minute
  useEffect(() => {
    if (!isOccupied || !orderCreatedAt) return;
    
    setDuration(formatDuration(orderCreatedAt, language));
    
    const interval = setInterval(() => {
      setDuration(formatDuration(orderCreatedAt, language));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [isOccupied, orderCreatedAt, language]);

  // Status-based styling
  const getStatusStyles = () => {
    if (selected) {
      return "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2";
    }
    switch (tableStatus) {
      case "active":
        return "border-blue-500 bg-blue-50/95 dark:bg-blue-950/40 dark:border-blue-400 shadow-lg ring-2 ring-blue-400/50";
      case "held":
        return "border-amber-500 bg-amber-50/95 dark:bg-amber-950/40 dark:border-amber-500 shadow-lg";
      case "free":
      default:
        return "border-emerald-300/80 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-700/60 hover:border-emerald-400";
    }
  };

  const getStatusBadge = () => {
    switch (tableStatus) {
      case "active":
        return { label: t("table_active"), className: "bg-blue-500 text-white" };
      case "held":
        return { label: t("table_held"), className: "bg-amber-500 text-white" };
      case "free":
      default:
        return { label: t("free"), className: "bg-emerald-500 text-white" };
    }
  };

  const getTimerStyles = () => {
    if (tableStatus === "active") {
      return "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300";
    }
    return "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300";
  };

  const getSeatsIconColor = () => {
    switch (tableStatus) {
      case "active":
        return "text-blue-600 dark:text-blue-400";
      case "held":
        return "text-amber-600 dark:text-amber-400";
      case "free":
      default:
        return "text-emerald-600 dark:text-emerald-400";
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 min-w-[160px] min-h-[180px] group",
        "hover:shadow-lg active:scale-[0.98]",
        getStatusStyles(),
        disabled && "opacity-50 cursor-not-allowed hover:shadow-none"
      )}
    >
      {/* Status Badge - Top Left with Color Legend Tooltip */}
      <div className="absolute top-2.5 left-2.5">
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-help",
                  statusBadge.className
                )}
              >
                {statusBadge.label}
              </span>
            </TooltipTrigger>
            <TooltipContent 
              side="bottom" 
              align="start"
              className="z-50 max-w-[200px] p-3 text-xs leading-relaxed bg-popover border shadow-lg rounded-lg"
            >
              <p className="font-semibold mb-1.5 text-foreground">
                {language === "ar" ? "معاني ألوان الطاولات:" : "Table Color Legend:"}
              </p>
              <div className="space-y-1 text-muted-foreground">
                <p>🟢 {language === "ar" ? "أخضر: طاولة فارغة" : "Green: Free table"}</p>
                <p>🔵 {language === "ar" ? "أزرق: طاولة نشطة / عليها طلب" : "Blue: Active / has order"}</p>
                <p>🟠 {language === "ar" ? "برتقالي: طاولة معلّقة (Hold)" : "Orange: On hold"}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Top Right Section: Merged Badge OR Action Buttons (Move/Merge) */}
      {hasMergedOrders ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-violet-500 text-white cursor-help">
                <span>{t("merged")}</span>
                <span className="opacity-80">×{orderCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>{t("mergedOrdersTooltip") || "Merged Orders - Multiple orders on this table"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (showMergeButton || showMoveButton) ? (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {/* Move Order Button */}
          {showMoveButton && onMoveClick && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveClick();
                    }}
                    className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-100 flex items-center justify-center transition-colors shadow-sm"
                  >
                    <MoveRight className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  نقل الطلب إلى طاولة أخرى
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* Merge Button */}
          {showMergeButton && onMergeClick && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMergeClick();
                    }}
                    className="w-7 h-7 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors shadow-sm"
                  >
                    <Combine className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {t("merge_tables")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ) : null}

      {/* Table with Chairs Visualization */}
      <div className="flex-1 flex items-center justify-center py-2">
        <TableWithChairs 
          tableName={tableName} 
          capacity={effectiveCapacity} 
          tableStatus={tableStatus}
          orderNumber={orderNumber}
        />
      </div>

      {/* Bottom Info */}
      <div className="w-full flex items-center justify-between gap-2 mt-1">
        {/* Seats Count with colored icon */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <Users className={cn("h-3.5 w-3.5", getSeatsIconColor())} />
          <span>{effectiveCapacity} {t("seats")}</span>
        </div>

        {/* Timer for Occupied */}
        {isOccupied && orderCreatedAt && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
            getTimerStyles()
          )}>
            <Clock className="h-3 w-3" />
            {duration}
          </div>
        )}
      </div>
    </button>
  );
}

// Table visualization with chair indicators
function TableWithChairs({ 
  tableName, 
  capacity,
  tableStatus,
  orderNumber 
}: { 
  tableName: string; 
  capacity: number; 
  tableStatus: TableStatus;
  orderNumber?: number;
}) {
  const getTableSurfaceStyles = () => {
    switch (tableStatus) {
      case "active":
        return "bg-blue-200 dark:bg-blue-800/80 border-blue-500 dark:border-blue-400";
      case "held":
        return "bg-amber-200 dark:bg-amber-800/80 border-amber-500 dark:border-amber-400";
      case "free":
      default:
        return "bg-emerald-200 dark:bg-emerald-800/80 border-emerald-500 dark:border-emerald-400";
    }
  };

  // Chair indicator color based on status (enhanced visibility)
  const getChairStyles = () => {
    switch (tableStatus) {
      case "active":
        return "bg-blue-400/85 dark:bg-blue-400/80 border-blue-500/60 dark:border-blue-300/50";
      case "held":
        return "bg-amber-400/85 dark:bg-amber-400/80 border-amber-500/60 dark:border-amber-300/50";
      case "free":
      default:
        return "bg-emerald-400/85 dark:bg-emerald-400/80 border-emerald-500/60 dark:border-emerald-300/50";
    }
  };

  // Calculate chair positions in a circular layout
  const renderChairs = () => {
    if (!capacity || capacity <= 0) return null;
    
    const chairs = [];
    const angleStep = 360 / capacity;
    const radius = 50; // Distance from center to chair
    const chairSize = 10; // Increased size for better visibility (+20%)
    
    for (let i = 0; i < capacity; i++) {
      // Start from top (-90 degrees) and go clockwise
      const angleDeg = -90 + (i * angleStep);
      const angleRad = (angleDeg * Math.PI) / 180;
      
      // Calculate position relative to center
      const x = Math.cos(angleRad) * radius;
      const y = Math.sin(angleRad) * radius;
      
      chairs.push(
        <div
          key={i}
          className={cn(
            "absolute rounded-full border",
            getChairStyles(),
            "animate-[chair-pop_150ms_ease-out_forwards]",
            "shadow-sm"
          )}
          style={{
            width: chairSize,
            height: chairSize,
            left: `calc(50% + ${x}px - ${chairSize / 2}px)`,
            top: `calc(50% + ${y}px - ${chairSize / 2}px)`,
            animationDelay: `${i * 20}ms`,
          }}
        />
      );
    }
    
    return chairs;
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
      {/* Chair indicators around the table */}
      {renderChairs()}
      
      {/* Square Table Surface */}
      <div
        className={cn(
          "w-20 h-20 rounded-xl flex flex-col items-center justify-center border-2 shadow-sm z-10",
          getTableSurfaceStyles()
        )}
      >
        {/* Table Name - Large */}
        <span className="text-lg font-bold text-foreground leading-none">
          {tableName}
        </span>
        
        {/* Order Number if occupied */}
        {tableStatus !== "free" && orderNumber && (
          <span className="text-[10px] font-semibold text-muted-foreground mt-1">
            #{orderNumber}
          </span>
        )}
      </div>
    </div>
  );
}
