import {
  TimelineApiResponse,
  TimelineApiResponseSchema,
  TimelineEvent,
  TimelineEventSchema,
  TimelineFilters,
} from '@/types/timeline.types';
import { API_CONFIG } from '@/constants/timeline.constants';

class TimelineApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.TIMELINE_BASE_PATH;
  }

  /**
   * Fetch timeline events with filters
   */
  async getTimelineEvents(
    caseId: string,
    filters: TimelineFilters
  ): Promise<TimelineApiResponse> {
    const params = new URLSearchParams();

    if (filters.layers && filters.layers.length > 0) {
      params.append('layers', filters.layers.join(','));
    }
    if (filters.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate);
    }
    if (filters.searchQuery) {
      params.append('q', filters.searchQuery);
    }
    if (filters.minConfidence !== undefined) {
      params.append('minConfidence', String(filters.minConfidence));
    }
    if (filters.showUserCorrectedOnly) {
      params.append('userCorrectedOnly', 'true');
    }

    const url = `${this.baseUrl}/${caseId}/timeline?${params.toString()}`;

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch timeline events: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response schema
    const validated = TimelineApiResponseSchema.parse(data);
    return validated;
  }

  /**
   * Create a new timeline event
   */
  async createTimelineEvent(
    caseId: string,
    event: Omit<TimelineEvent, 'id' | 'caseId' | 'createdAt' | 'updatedAt'>
  ): Promise<TimelineEvent> {
    const url = `${this.baseUrl}/${caseId}/timeline`;

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Failed to create timeline event: ${response.statusText}`);
    }

    const data = await response.json();
    return TimelineEventSchema.parse(data.event);
  }

  /**
   * Update an existing timeline event
   */
  async updateTimelineEvent(
    caseId: string,
    event: TimelineEvent
  ): Promise<TimelineEvent> {
    const url = `${this.baseUrl}/${caseId}/timeline/${event.id}`;

    const response = await this.fetchWithTimeout(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Failed to update timeline event: ${response.statusText}`);
    }

    const data = await response.json();
    return TimelineEventSchema.parse(data.event);
  }

  /**
   * Delete a timeline event
   */
  async deleteTimelineEvent(caseId: string, eventId: string): Promise<void> {
    const url = `${this.baseUrl}/${caseId}/timeline/${eventId}`;

    const response = await this.fetchWithTimeout(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete timeline event: ${response.statusText}`);
    }
  }

  /**
   * Trigger automated timeline extraction
   */
  async extractTimelineEvents(
    caseId: string,
    options?: {
      fileIds?: string[];
      forceReprocess?: boolean;
    }
  ): Promise<{ taskId: string; estimatedDuration: number; filesQueued: number }> {
    const url = `${this.baseUrl}/${caseId}/timeline/extract`;

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options || {}),
    });

    if (!response.ok) {
      throw new Error(`Failed to start extraction: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get extraction task status
   */
  async getExtractionStatus(
    caseId: string,
    taskId: string
  ): Promise<{
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    filesProcessed: number;
    eventsExtracted: number;
    errors?: string[];
  }> {
    const url = `${this.baseUrl}/${caseId}/timeline/extract/${taskId}`;

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to get extraction status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const timelineApi = new TimelineApiClient();
