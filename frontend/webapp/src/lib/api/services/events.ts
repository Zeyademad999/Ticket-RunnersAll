import {
  apiClient,
  handleApiResponse,
  retryRequest,
  buildQueryParams,
} from "../config";
import {
  ApiResponse,
  PaginatedResponse,
  EventData,
  FeaturedEvent,
  EventFilters,
  EventAnalytics,
  EventImage,
  Facility,
  TicketCategory,
  SearchEventsRequest,
  SearchEventsResponse,
  FilterEventsRequest,
  FilterEventsResponse,
} from "../types";

export class EventsService {
  /**
   * Get all events with pagination and filtering
   */
  static async getEvents(
    page: number = 1,
    limit: number = 10,
    filters?: EventFilters
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = {
        page,
        limit,
        ...filters,
      };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get event by ID
   */
  static async getEventById(id: string): Promise<EventData> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<EventData>>(
        `/events/${id}`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get individual event details by ID
   * This is a more detailed version for event detail pages
   * Returns comprehensive event details including gallery, venue, organizer, tickets, gates, and personalized card/wallet requirements
   */
  static async getEventDetails(eventId: string): Promise<EventData> {
    return retryRequest(async () => {
      // Validate eventId parameter
      const eventIdNumber = parseInt(eventId, 10);
      if (isNaN(eventIdNumber) || eventIdNumber < 1) {
        throw new Error("Event ID must be a valid integer >= 1");
      }

      const response = await apiClient.get<any>(`/events/${eventId}/details`, {
        params: {
          event_id: eventIdNumber,
        },
      });
      const apiData = handleApiResponse(response);

      // Transform API response to EventData format
      return this.transformEventDetails(apiData);
    });
  }

  /**
   * Get full image URL from relative path
   */
  private static getFullImageUrl(path: string): string {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `https://trapi.flokisystems.com/storage/${path}`;
  }

  /**
   * Transform API event details response to EventData format
   */
  private static transformEventDetails(apiData: any): EventData {
    return {
      id: apiData.id?.toString(),
      title: apiData.title || "",
      videoUrl: undefined, // Not provided in API
      images:
        apiData.gallery?.map((img: any) => ({
          url: this.getFullImageUrl(img.path || img.url || ""),
          isPrimary: false,
        })) ||
        (apiData.thumbnail
          ? [
              {
                url: this.getFullImageUrl(
                  apiData.thumbnail.path || apiData.thumbnail.url || ""
                ),
                isPrimary: true,
              },
            ]
          : []),
      layoutImageUrl: apiData.venue?.layout_image?.path
        ? this.getFullImageUrl(apiData.venue.layout_image.path)
        : undefined,
      date: apiData.event_date || "",
      time: apiData.event_time || "",
      location: apiData.event_location || "",
      price: parseFloat(apiData.starting_price) || 0,
      originalPrice: undefined, // Not provided in API
      category: apiData.category?.name || "",
      rating: apiData.ratings?.event_rating || 0,
      attendees: 0, // Not provided in API
      description: apiData.about_event_html || "",
      venueInfo: apiData.venue?.about_html || "",
      facilities:
        apiData.venue?.facilities?.map((facility: any) => ({
          name: facility.name || facility,
          icon: facility.icon || "info",
          available: true,
        })) || [],
      isFeatured: apiData.featured || false,
      organizer: {
        id: apiData.organizer?.id?.toString() || "",
        name: apiData.organizer?.name || "",
        logoUrl:
          apiData.organizer?.logo?.path || apiData.organizer?.logo?.url || "",
        bio: "", // Not provided in API
        events: [], // Not provided in API
      },
      totalTickets: apiData.venue?.capacity || 0,
      ticketsSold: 0, // Not provided in API
      ticketsAvailable: apiData.venue?.capacity || 0,
      peopleAdmitted: 0, // Not provided in API
      peopleRemaining: apiData.venue?.capacity || 0,
      totalPayoutPending: 0, // Not provided in API
      totalPayoutPaid: 0, // Not provided in API
      ticketCategories:
        apiData.tickets?.map((ticket: any) => ({
          name: ticket.title || "",
          price: parseFloat(ticket.price) || 0,
          totalTickets: 0, // Not provided in API
          ticketsSold: 0, // Not provided in API
          ticketsAvailable: 0, // Not provided in API
        })) || [],
      gallery:
        apiData.gallery?.map((img: any) => ({
          url: img.path || img.url || "",
          isPrimary: false,
        })) || [],
      venue: apiData.venue
        ? {
            id: apiData.venue.id?.toString() || "",
            name: apiData.venue.name || "",
            address: apiData.venue.address || "",
            city: apiData.venue.city || "",
            country: "", // Not provided in API
            capacity: apiData.venue.capacity || 0,
            facilities: apiData.venue.facilities || [],
            coordinates: undefined, // Not provided in API
            images: apiData.venue.layout_image
              ? [
                  {
                    url: this.getFullImageUrl(
                      apiData.venue.layout_image.path ||
                        apiData.venue.layout_image.url ||
                        ""
                    ),
                    isPrimary: true,
                  },
                ]
              : [],
            description: apiData.venue.about_html || "",
            contactInfo: {
              phone: apiData.venue.mobile_number || "",
              email: undefined, // Not provided in API
              website: apiData.venue.website || "",
            },
          }
        : undefined,
      gates:
        apiData.gates?.map((gate: any) => ({
          id: gate.id?.toString() || "",
          name: gate.name || "",
          location: gate.location || "",
          type: gate.type || "main",
          status: gate.status || "open",
          capacity: gate.capacity || 0,
          currentOccupancy: gate.current_occupancy || 0,
          openingTime: gate.opening_time || undefined,
          closingTime: gate.closing_time || undefined,
          requirements: gate.requirements || [],
        })) || [],
      personalizedCardRequirements: apiData.card_wallet_requirements
        ? {
            required: apiData.policies?.require_card || false,
            cardTypes: [], // Not provided in API
            minimumBalance: undefined, // Not provided in API
            specialAccess: false, // Not provided in API
            description: undefined, // Not provided in API
          }
        : undefined,
      walletRequirements: apiData.card_wallet_requirements
        ? {
            required: apiData.policies?.require_card || false,
            supportedWallets: [], // Not provided in API
            minimumBalance: undefined, // Not provided in API
            specialFeatures: [], // Not provided in API
            description: undefined, // Not provided in API
          }
        : undefined,
    };
  }

  /**
   * Create new event
   */
  static async createEvent(eventData: Partial<EventData>): Promise<EventData> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<EventData>>(
        "/events",
        eventData
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Update event
   */
  static async updateEvent(
    id: string,
    eventData: Partial<EventData>
  ): Promise<EventData> {
    return retryRequest(async () => {
      const response = await apiClient.put<ApiResponse<EventData>>(
        `/events/${id}`,
        eventData
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Delete event
   */
  static async deleteEvent(
    id: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.delete<ApiResponse<{ message: string }>>(
        `/events/${id}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get featured events
   */
  static async getFeaturedEvents(): Promise<FeaturedEvent[]> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<FeaturedEvent[]>>(
        "/events/featured"
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get events by category
   */
  static async getEventsByCategory(
    category: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = { page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events/category/${category}?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get events by organizer
   */
  static async getEventsByOrganizer(
    organizerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = { page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events/organizer/${organizerId}?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Search events by title
   * Search for events matching the provided query string in the title
   * Returns lightweight event cards with thumbnail and category information
   */
  static async searchEvents(
    query: string,
    page: number = 1,
    limit: number = 10
  ): Promise<SearchEventsResponse> {
    return retryRequest(async () => {
      // Validate query string length (2-100 characters)
      if (query.length < 2 || query.length > 100) {
        throw new Error("Query string must be between 2 and 100 characters");
      }

      // Validate limit (1-50)
      if (limit < 1 || limit > 50) {
        throw new Error("Limit must be between 1 and 50");
      }

      // Validate page (>= 1)
      if (page < 1) {
        throw new Error("Page must be 1 or greater");
      }

      const params = { q: query, page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<SearchEventsResponse>(
        `/search/events?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get event analytics
   */
  static async getEventAnalytics(eventId: string): Promise<EventAnalytics> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<EventAnalytics>>(
        `/events/${eventId}/analytics`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Upload event image
   */
  static async uploadEventImage(
    eventId: string,
    file: File,
    isPrimary: boolean = false
  ): Promise<EventImage> {
    return retryRequest(async () => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("isPrimary", String(isPrimary));

      const response = await apiClient.post<ApiResponse<EventImage>>(
        `/events/${eventId}/images`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Delete event image
   */
  static async deleteEventImage(
    eventId: string,
    imageId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.delete<ApiResponse<{ message: string }>>(
        `/events/${eventId}/images/${imageId}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Update event facilities
   */
  static async updateEventFacilities(
    eventId: string,
    facilities: Facility[]
  ): Promise<Facility[]> {
    return retryRequest(async () => {
      const response = await apiClient.put<ApiResponse<Facility[]>>(
        `/events/${eventId}/facilities`,
        { facilities }
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get event ticket categories
   */
  static async getEventTicketCategories(
    eventId: string
  ): Promise<TicketCategory[]> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<TicketCategory[]>>(
        `/events/${eventId}/ticket-categories`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Update event ticket categories
   */
  static async updateEventTicketCategories(
    eventId: string,
    categories: TicketCategory[]
  ): Promise<TicketCategory[]> {
    return retryRequest(async () => {
      const response = await apiClient.put<ApiResponse<TicketCategory[]>>(
        `/events/${eventId}/ticket-categories`,
        { categories }
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Toggle event featured status
   */
  static async toggleEventFeatured(eventId: string): Promise<EventData> {
    return retryRequest(async () => {
      const response = await apiClient.patch<ApiResponse<EventData>>(
        `/events/${eventId}/featured`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get upcoming events
   */
  static async getUpcomingEvents(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = { page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events/upcoming?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get events by date range
   */
  static async getEventsByDateRange(
    startDate: string,
    endDate: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = { startDate, endDate, page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events/date-range?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get events by location
   */
  static async getEventsByLocation(
    location: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = { location, page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events/location?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get events by price range
   */
  static async getEventsByPriceRange(
    minPrice: number,
    maxPrice: number,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = { minPrice, maxPrice, page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events/price-range?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get event statistics
   */
  static async getEventStatistics(): Promise<{
    totalEvents: number;
    upcomingEvents: number;
    ongoingEvents: number;
    completedEvents: number;
    totalRevenue: number;
  }> {
    return retryRequest(async () => {
      const response = await apiClient.get<
        ApiResponse<{
          totalEvents: number;
          upcomingEvents: number;
          ongoingEvents: number;
          completedEvents: number;
          totalRevenue: number;
        }>
      >("/events/statistics");
      return handleApiResponse(response).data;
    });
  }

  /**
   * Filter events with advanced filtering options
   * Filter events by category, date range, venue, organizer, and price range
   * Returns event cards with thumbnail, category, and starting price information
   */
  static async filterEvents(
    filters: FilterEventsRequest
  ): Promise<FilterEventsResponse> {
    return retryRequest(async () => {
      // Validate parameters
      if (filters.limit && (filters.limit < 1 || filters.limit > 50)) {
        throw new Error("Limit must be between 1 and 50");
      }
      if (filters.page && filters.page < 1) {
        throw new Error("Page must be 1 or greater");
      }
      if (filters.category_id && filters.category_id < 1) {
        throw new Error("Category ID must be 1 or greater");
      }
      if (filters.organizer_id && filters.organizer_id < 1) {
        throw new Error("Organizer ID must be 1 or greater");
      }
      if (filters.venue_id && filters.venue_id < 1) {
        throw new Error("Venue ID must be 1 or greater");
      }
      if (filters.price_min && filters.price_min < 0) {
        throw new Error("Minimum price must be 0 or greater");
      }
      if (filters.price_max && filters.price_max < 0) {
        throw new Error("Maximum price must be 0 or greater");
      }

      const queryString = buildQueryParams(filters);
      const response = await apiClient.get<FilterEventsResponse>(
        `/events/filter?${queryString}`
      );
      return handleApiResponse(response);
    });
  }
}
