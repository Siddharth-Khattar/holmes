import { TimelineLayer, TimelineZoomLevel } from "@/types/timeline.types";

// Layer styling configuration - Warm brown palette matching Knowledge Graph
export const LAYER_CONFIG: Record<
  TimelineLayer,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    hexColor: string;
    icon: string;
    label: string;
  }
> = {
  evidence: {
    color: "text-[#B89968]",
    bgColor: "bg-[#B89968]/10",
    borderColor: "border-[#B89968]/30",
    hexColor: "#B89968", // Golden brown
    icon: "FileText",
    label: "Evidence",
  },
  legal: {
    color: "text-[#8B7355]",
    bgColor: "bg-[#8B7355]/10",
    borderColor: "border-[#8B7355]/30",
    hexColor: "#8B7355", // Warm brown
    icon: "Scale",
    label: "Legal",
  },
  strategy: {
    color: "text-[#A68A6A]",
    bgColor: "bg-[#A68A6A]/10",
    borderColor: "border-[#A68A6A]/30",
    hexColor: "#A68A6A", // Tan brown
    icon: "Target",
    label: "Strategy",
  },
};

// Zoom level configuration
export const ZOOM_CONFIG: Record<
  TimelineZoomLevel,
  {
    dateFormat: string;
    groupingKey: (date: Date) => string;
    label: string;
  }
> = {
  day: {
    dateFormat: "MMM d, yyyy",
    groupingKey: (date) => date.toISOString().split("T")[0],
    label: "Daily",
  },
  week: {
    dateFormat: "MMM d, yyyy",
    groupingKey: (date) => {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split("T")[0];
    },
    label: "Weekly",
  },
  month: {
    dateFormat: "MMMM yyyy",
    groupingKey: (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    label: "Monthly",
  },
  year: {
    dateFormat: "yyyy",
    groupingKey: (date) => String(date.getFullYear()),
    label: "Yearly",
  },
};

// Performance thresholds
export const PERFORMANCE_CONFIG = {
  VIRTUALIZATION_THRESHOLD: 50, // Enable virtualization above this many events
  DEBOUNCE_DELAY: 300, // ms for filter changes
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 10, // Max cached timeline responses
  SSE_RECONNECT_DELAY: 1000, // ms before SSE reconnection
  MAX_SSE_RECONNECT_ATTEMPTS: 5,
};

// API configuration
export const API_CONFIG = {
  TIMELINE_BASE_PATH: (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080") + "/api/cases",
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  REQUEST_TIMEOUT: 30000, // 30 seconds
};
