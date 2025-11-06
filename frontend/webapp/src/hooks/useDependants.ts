import { useState, useEffect } from "react";
import { BookingsService } from "@/lib/api/services/bookings";
import { CustomerBookingItem } from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";
import { getSecureToken } from "@/lib/secureStorage";

interface DependantTicket {
  id: number;
  eventTitle: string;
  date: string;
  time: string;
  location: string;
  ticketPrice: number;
  quantity: number;
  qrEnabled: boolean;
  status: "pending" | "claimed";
}

interface UseDependantsReturn {
  dependants: DependantTicket[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDependants = (): UseDependantsReturn => {
  const [dependants, setDependants] = useState<DependantTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDependants = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if user is authenticated using secure storage
      const token = await getSecureToken();
      if (!token) {
        console.warn("No auth token found, skipping dependants fetch");
        setDependants([]);
        return;
      }

      // For now, we'll use the customer bookings and filter for dependant tickets
      // In the future, this should be a dedicated API endpoint
      const response = await BookingsService.getCustomerBookings(1, 50);

      // Check if response and items exist
      if (!response || !response.items || !Array.isArray(response.items)) {
        console.warn("Invalid response structure for dependants");
        setDependants([]);
        return;
      }

      // Transform booking items to dependant tickets
      const dependantTickets: DependantTicket[] = response.items
        .filter((item) => (item.quantity || 0) > 1) // Only show bookings with multiple tickets (dependants)
        .map((item, index) => ({
          id: index + 1,
          eventTitle: item.event_title || "",
          date: item.event_date || "",
          time: item.event_time || "",
          location: item.event_location || "TBD",
          ticketPrice: (item.total_amount || 0) / (item.quantity || 1),
          quantity: (item.quantity || 1) - 1, // Exclude the main ticket holder
          qrEnabled: item.status === "confirmed",
          status: item.status === "confirmed" ? "claimed" : "pending",
        }));

      setDependants(dependantTickets);
    } catch (err: any) {
      console.error("Error fetching dependants:", err);
      setError(err.message || "Failed to fetch dependant tickets");

      // Don't show toast for authentication errors or server errors
      if (err.status !== 401 && err.status !== 403 && err.status !== 500) {
        toast({
          title: "Error",
          description:
            err.message ||
            "Failed to fetch dependant tickets. Please try again.",
          variant: "destructive",
        });
      } else if (err.status === 500) {
        console.warn(
          "Server error fetching dependants - this may be a temporary issue"
        );
        // Trigger server error banner
        window.dispatchEvent(new CustomEvent("server-error"));
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDependants();
  }, []);

  return {
    dependants,
    loading,
    error,
    refetch: fetchDependants,
  };
};
