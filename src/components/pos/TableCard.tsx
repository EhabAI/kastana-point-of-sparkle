import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TableCardProps {
  tableName: string;
  capacity: number;
  isOccupied: boolean;
  orderNumber?: number;
  orderCount?: number;
  orderCreatedAt?: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
}

function formatDuration(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diffMs = now - start;
  
  if (diffMs < 0) return "0m";
  
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes}m`;
}

export function TableCard({
  tableName,
  capacity,
  isOccupied,
  orderNumber,
  orderCount,
  orderCreatedAt,
  onClick,
  disabled,
  selected,
}: TableCardProps) {
  const { t } = useLanguage();
  const effectiveCapacity = capacity || 4;
  const [duration, setDuration] = useState(() => 
    orderCreatedAt ? formatDuration(orderCreatedAt) : "0m"
  );
  
  const hasMergedOrders = orderCount && orderCount > 1;
  
  // Update timer every minute
  useEffect(() => {
    if (!isOccupied || !orderCreatedAt) return;
    
    setDuration(formatDuration(orderCreatedAt));
    
    const interval = setInterval(() => {
      setDuration(formatDuration(orderCreatedAt));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [isOccupied, orderCreatedAt]);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 min-w-[160px] min-h-[180px] group",
        "hover:shadow-lg active:scale-[0.98]",
        selected
          ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2"
          : isOccupied
            ? "border-amber-500 bg-amber-50/95 dark:bg-amber-950/40 dark:border-amber-500 shadow-lg"
            : "border-emerald-300/80 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-700/60 hover:border-emerald-400",
        disabled && "opacity-50 cursor-not-allowed hover:shadow-none"
      )}
    >
      {/* Status Badge - Top Left */}
      <div className="absolute top-2.5 left-2.5">
        <span
          className={cn(
            "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
            isOccupied
              ? "bg-amber-500 text-white"
              : "bg-emerald-500 text-white"
          )}
        >
          {isOccupied ? t("occupied") : t("free")}
        </span>
      </div>

      {/* Merged Orders Badge - Top Right */}
      {hasMergedOrders && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-primary text-primary-foreground cursor-help">
                <span>M</span>
                <span className="text-primary-foreground/80">×{orderCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>{t("mergedOrdersTooltip") || "Merged Orders - Multiple orders on this table"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Table with Chairs Visualization */}
      <div className="flex-1 flex items-center justify-center py-2">
        <TableWithChairs 
          tableName={tableName} 
          capacity={effectiveCapacity} 
          isOccupied={isOccupied}
          orderNumber={orderNumber}
        />
      </div>

      {/* Bottom Info */}
      <div className="w-full flex items-center justify-between gap-2 mt-1">
        {/* Seats Count */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{effectiveCapacity} {t("seats")}</span>
        </div>

        {/* Timer for Occupied */}
        {isOccupied && orderCreatedAt && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            {duration}
          </div>
        )}
      </div>
    </button>
  );
}

// Chair dot component - subtle circular indicator
function ChairDot({ className, position }: { className?: string; position: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <div
      className={cn(
        "w-3 h-3 rounded-full bg-muted-foreground/30 dark:bg-muted-foreground/40 border border-muted-foreground/20",
        className
      )}
    />
  );
}

// Unified table with chairs visualization
function TableWithChairs({ 
  tableName, 
  capacity, 
  isOccupied,
  orderNumber 
}: { 
  tableName: string; 
  capacity: number; 
  isOccupied: boolean;
  orderNumber?: number;
}) {
  // Calculate chair distribution
  const chairsTop = Math.ceil(capacity / 4);
  const chairsBottom = Math.ceil(capacity / 4);
  const chairsLeft = Math.floor((capacity - chairsTop - chairsBottom) / 2);
  const chairsRight = capacity - chairsTop - chairsBottom - chairsLeft;

  return (
    <div className="relative flex items-center justify-center">
      {/* Top Chairs */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
        {Array.from({ length: Math.max(1, chairsTop) }).map((_, i) => (
          <ChairDot key={`top-${i}`} position="top" />
        ))}
      </div>

      {/* Bottom Chairs */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {Array.from({ length: Math.max(1, chairsBottom) }).map((_, i) => (
          <ChairDot key={`bottom-${i}`} position="bottom" />
        ))}
      </div>

      {/* Left Chairs */}
      {chairsLeft > 0 && (
        <div className="absolute top-1/2 -left-4 -translate-y-1/2 flex flex-col gap-2">
          {Array.from({ length: chairsLeft }).map((_, i) => (
            <ChairDot key={`left-${i}`} position="left" />
          ))}
        </div>
      )}

      {/* Right Chairs */}
      {chairsRight > 0 && (
        <div className="absolute top-1/2 -right-4 -translate-y-1/2 flex flex-col gap-2">
          {Array.from({ length: chairsRight }).map((_, i) => (
            <ChairDot key={`right-${i}`} position="right" />
          ))}
        </div>
      )}

      {/* Square Table Surface */}
      <div
        className={cn(
          "w-20 h-20 rounded-xl flex flex-col items-center justify-center border-2 shadow-sm",
          isOccupied
            ? "bg-amber-200 dark:bg-amber-800/80 border-amber-500 dark:border-amber-400"
            : "bg-emerald-200 dark:bg-emerald-800/80 border-emerald-500 dark:border-emerald-400"
        )}
      >
        {/* Table Name - Large */}
        <span className="text-lg font-bold text-foreground leading-none">
          {tableName}
        </span>
        
        {/* Order Number if occupied */}
        {isOccupied && orderNumber && (
          <span className="text-[10px] font-semibold text-muted-foreground mt-1">
            #{orderNumber}
          </span>
        )}
      </div>
    </div>
  );
}
