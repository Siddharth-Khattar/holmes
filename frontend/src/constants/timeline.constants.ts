import { TimelineLayer, TimelineZoomLevel } from '@/types/timeline.types';

// Layer styling configuration
export const LAYER_CONFIG: Record<TimelineLayer, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  label: string;
}> = {
  evidence: {
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: 'FileText',
    label: 'Evidence',
  },
  legal: {
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    borderColor: 'border-purple-200 dark:border-purple-800',
    icon: 'Scale',
    label: 'Legal',
  },
  strategy: {
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: 'Target',
    label: 'Strategy',
  },
};

// Zoom level configuration
export const ZOOM_CONFIG: Record<TimelineZoomLevel, {
  dateFormat: string;
  groupingKey: (date: Date) => string;
  label: string;
}> = {
  day: {
    dateFormat: 'MMM d, yyyy',
    groupingKey: (date) => date.toISOString().split('T')[0],
    label: 'Daily',
  },
  week: {
    dateFormat: 'MMM d, yyyy',
    groupingKey: (date) => {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split('T')[0];
    },
    label: 'Weekly',
  },
  month: {
    dateFormat: 'MMMM yyyy',
    groupingKey: (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: 'Monthly',
  },
  year: {
    dateFormat: 'yyyy',
    groupingKey: (date) => String(date.getFullYear()),
    label: 'Yearly',
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
  TIMELINE_BASE_PATH: '/api/cases',
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  REQUEST_TIMEOUT: 30000, // 30 seconds
};
