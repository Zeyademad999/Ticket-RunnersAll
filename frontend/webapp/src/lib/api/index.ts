// Export all types
export * from "./types";

// Export configuration
export * from "./config";

// Import services
import { AuthService } from "./services/auth";
import { EventsService } from "./services/events";
import { BookingsService } from "./services/bookings";
import { AdminService } from "./services/admin";

// Export all services
export { AuthService } from "./services/auth";
export { EventsService } from "./services/events";
export { BookingsService } from "./services/bookings";
export { AdminService } from "./services/admin";

// Export hooks
export { useEventFilters } from "./hooks/useEventFilters";
export { useEventDetails } from "./hooks/useEventDetails";

// Main API client class that provides access to all services
export class ApiClient {
  // Authentication services
  static auth = AuthService;

  // Event management services
  static events = EventsService;

  // Booking and ticket services
  static bookings = BookingsService;

  // Admin services
  static admin = AdminService;
}

// Default export for convenience
export default ApiClient;

// Utility functions for common API operations
export const apiUtils = {
  /**
   * Check if the API is available
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
        }/health`
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Get API version
   */
  async getApiVersion(): Promise<string> {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
        }/version`
      );
      const data = await response.json();
      return data.version || "unknown";
    } catch {
      return "unknown";
    }
  },

  /**
   * Clear all cached data
   */
  clearCache(): void {
    // Clear any cached data from localStorage or sessionStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("api_cache_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  },

  /**
   * Set API base URL
   */
  setBaseUrl(url: string): void {
    // This would need to be implemented in the config file
    // For now, we'll just update the environment variable
    if (typeof window !== "undefined") {
      (window as any).__API_BASE_URL__ = url;
    }
  },

  /**
   * Get current API base URL
   */
  getBaseUrl(): string {
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
  },
};

// Export individual services for direct import
export const authService = AuthService;
export const eventsService = EventsService;
export const bookingsService = BookingsService;
export const adminService = AdminService;
