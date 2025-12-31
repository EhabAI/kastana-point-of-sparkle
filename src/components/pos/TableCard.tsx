import { cn } from "@/lib/utils";

interface TableCardProps {
  tableName: string;
  capacity: number;
  isOccupied: boolean;
  orderNumber?: number;
  onClick: () => void;
  disabled?: boolean;
}

export function TableCard({
  tableName,
  capacity,
  isOccupied,
  orderNumber,
  onClick,
  disabled,
}: TableCardProps) {
  const effectiveCapacity = capacity || 4;
  
  // Determine table shape based on capacity
  const tableType = effectiveCapacity <= 2 ? "round-small" : effectiveCapacity <= 4 ? "round" : "rectangular";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 min-h-[140px] group",
        "hover:scale-105 hover:shadow-lg active:scale-95",
        isOccupied
          ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600 shadow-amber-200/50 dark:shadow-amber-900/30 shadow-md"
          : "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-600 hover:shadow-emerald-200/50 dark:hover:shadow-emerald-900/30",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100"
      )}
    >
      {/* Table SVG */}
      <div className="relative mb-2">
        {tableType === "round-small" && <RoundTableSmall isOccupied={isOccupied} />}
        {tableType === "round" && <RoundTable isOccupied={isOccupied} />}
        {tableType === "rectangular" && <RectangularTable isOccupied={isOccupied} capacity={effectiveCapacity} />}
      </div>

      {/* Table Name */}
      <span className="font-bold text-sm text-foreground">{tableName}</span>

      {/* Capacity */}
      <span className="text-xs text-muted-foreground">{effectiveCapacity} seats</span>

      {/* Status Badge */}
      <div
        className={cn(
          "absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
          isOccupied
            ? "bg-amber-500 text-white"
            : "bg-emerald-500 text-white"
        )}
      >
        {isOccupied ? `#${orderNumber}` : "Free"}
      </div>
    </button>
  );
}

// Chair component
function Chair({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("w-4 h-4 text-gray-500 dark:text-gray-400", className)}
      fill="currentColor"
    >
      <ellipse cx="12" cy="12" rx="8" ry="6" />
    </svg>
  );
}

// Small round table (2 seats)
function RoundTableSmall({ isOccupied }: { isOccupied: boolean }) {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      {/* Chairs */}
      <Chair className="absolute -top-3 left-1/2 -translate-x-1/2" />
      <Chair className="absolute -bottom-3 left-1/2 -translate-x-1/2" />
      
      {/* Table */}
      <svg viewBox="0 0 60 60" className="w-12 h-12">
        <circle
          cx="30"
          cy="30"
          r="24"
          className={cn(
            "stroke-2",
            isOccupied
              ? "fill-amber-200 dark:fill-amber-800 stroke-amber-600 dark:stroke-amber-400"
              : "fill-emerald-200 dark:fill-emerald-800 stroke-emerald-600 dark:stroke-emerald-400"
          )}
        />
        {/* Table surface pattern */}
        <circle
          cx="30"
          cy="30"
          r="18"
          className={cn(
            "stroke-1 fill-none",
            isOccupied
              ? "stroke-amber-300 dark:stroke-amber-700"
              : "stroke-emerald-300 dark:stroke-emerald-700"
          )}
        />
      </svg>
    </div>
  );
}

// Round table (4 seats)
function RoundTable({ isOccupied }: { isOccupied: boolean }) {
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      {/* Chairs */}
      <Chair className="absolute -top-3 left-1/2 -translate-x-1/2" />
      <Chair className="absolute -bottom-3 left-1/2 -translate-x-1/2" />
      <Chair className="absolute top-1/2 -left-3 -translate-y-1/2 rotate-90" />
      <Chair className="absolute top-1/2 -right-3 -translate-y-1/2 -rotate-90" />
      
      {/* Table */}
      <svg viewBox="0 0 60 60" className="w-14 h-14">
        <circle
          cx="30"
          cy="30"
          r="26"
          className={cn(
            "stroke-2",
            isOccupied
              ? "fill-amber-200 dark:fill-amber-800 stroke-amber-600 dark:stroke-amber-400"
              : "fill-emerald-200 dark:fill-emerald-800 stroke-emerald-600 dark:stroke-emerald-400"
          )}
        />
        {/* Table surface pattern */}
        <circle
          cx="30"
          cy="30"
          r="18"
          className={cn(
            "stroke-1 fill-none",
            isOccupied
              ? "stroke-amber-300 dark:stroke-amber-700"
              : "stroke-emerald-300 dark:stroke-emerald-700"
          )}
        />
      </svg>
    </div>
  );
}

// Rectangular table (6+ seats)
function RectangularTable({ isOccupied, capacity }: { isOccupied: boolean; capacity: number }) {
  const chairsPerSide = Math.ceil((capacity - 2) / 2);
  
  return (
    <div className="relative w-28 h-20 flex items-center justify-center">
      {/* Top chairs */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-3">
        {Array.from({ length: chairsPerSide }).map((_, i) => (
          <Chair key={`top-${i}`} />
        ))}
      </div>
      
      {/* Bottom chairs */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-3">
        {Array.from({ length: chairsPerSide }).map((_, i) => (
          <Chair key={`bottom-${i}`} />
        ))}
      </div>
      
      {/* Left chair */}
      <Chair className="absolute top-1/2 -left-2 -translate-y-1/2 rotate-90" />
      
      {/* Right chair */}
      <Chair className="absolute top-1/2 -right-2 -translate-y-1/2 -rotate-90" />
      
      {/* Table */}
      <svg viewBox="0 0 100 50" className="w-24 h-12">
        <rect
          x="4"
          y="4"
          width="92"
          height="42"
          rx="8"
          className={cn(
            "stroke-2",
            isOccupied
              ? "fill-amber-200 dark:fill-amber-800 stroke-amber-600 dark:stroke-amber-400"
              : "fill-emerald-200 dark:fill-emerald-800 stroke-emerald-600 dark:stroke-emerald-400"
          )}
        />
        {/* Table surface pattern */}
        <rect
          x="12"
          y="10"
          width="76"
          height="30"
          rx="4"
          className={cn(
            "stroke-1 fill-none",
            isOccupied
              ? "stroke-amber-300 dark:stroke-amber-700"
              : "stroke-emerald-300 dark:stroke-emerald-700"
          )}
        />
      </svg>
    </div>
  );
}
