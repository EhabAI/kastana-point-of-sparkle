import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

export type DateRangePreset = "today" | "yesterday" | "this_week" | "this_month" | "last_7_days" | "last_30_days" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
}

export function getDateRangeForPreset(preset: DateRangePreset, customRange?: DateRange): DateRange {
  const now = new Date();
  
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 0 }), to: endOfDay(now) };
    case "this_month":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "last_7_days":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "last_30_days":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "custom":
      return customRange || { from: startOfDay(now), to: endOfDay(now) };
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export function DateRangeFilter({ dateRange, onDateRangeChange, preset, onPresetChange }: DateRangeFilterProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const presetButtons: { value: DateRangePreset; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "last_7_days", label: "Last 7 Days" },
    { value: "last_30_days", label: "Last 30 Days" },
  ];

  const handlePresetClick = (newPreset: DateRangePreset) => {
    onPresetChange(newPreset);
    onDateRangeChange(getDateRangeForPreset(newPreset));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presetButtons.map((btn) => (
        <Button
          key={btn.value}
          variant={preset === btn.value ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick(btn.value)}
        >
          {btn.label}
        </Button>
      ))}
      
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={preset === "custom" ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            {preset === "custom" 
              ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`
              : "Custom"
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onPresetChange("custom");
                onDateRangeChange({ from: startOfDay(range.from), to: endOfDay(range.to) });
                setCalendarOpen(false);
              } else if (range?.from) {
                onPresetChange("custom");
                onDateRangeChange({ from: startOfDay(range.from), to: endOfDay(range.from) });
              }
            }}
            numberOfMonths={2}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
