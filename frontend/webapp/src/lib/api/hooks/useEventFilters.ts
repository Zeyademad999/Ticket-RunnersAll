import { useState, useCallback } from "react";
import { EventsService } from "../services/events";
import { FilterEventsRequest, FilterEventsResponse } from "../types";

export interface UseEventFiltersReturn {
  events: FilterEventsResponse["events"];
  pagination: FilterEventsResponse["pagination"];
  loading: boolean;
  error: string | null;
  filterEvents: (filters: FilterEventsRequest) => Promise<void>;
  clearFilters: () => void;
}

export function useEventFilters(): UseEventFiltersReturn {
  const [events, setEvents] = useState<FilterEventsResponse["events"]>([]);
  const [pagination, setPagination] = useState<
    FilterEventsResponse["pagination"]
  >({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
    has_more: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterEvents = useCallback(async (filters: FilterEventsRequest) => {
    setLoading(true);
    setError(null);

    try {
      console.log("Filtering events with:", filters);
      const response = await EventsService.filterEvents(filters);
      console.log("API response:", response);
      setEvents(response.events);
      setPagination(response.pagination);
    } catch (err) {
      console.error("Filter events error:", err);
      setError(err instanceof Error ? err.message : "Failed to filter events");
      setEvents([]);
      setPagination({
        current_page: 1,
        per_page: 20,
        total: 0,
        last_page: 1,
        has_more: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setEvents([]);
    setPagination({
      current_page: 1,
      per_page: 20,
      total: 0,
      last_page: 1,
      has_more: false,
    });
    setError(null);
  }, []);

  return {
    events,
    pagination,
    loading,
    error,
    filterEvents,
    clearFilters,
  };
}
