import React, { createContext, useContext, useState, useEffect } from "react";
import { logsAPI } from "../lib/api/usherApi";
import { authService } from "../services/authService";

const ScanLogContext = createContext();

export function ScanLogProvider({ children }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load logs from server
  const refreshLogs = async () => {
    if (!authService.isAuthenticated()) {
      return;
    }

    setIsLoading(true);
    try {
      const event = authService.getEvent();
      const eventId = event?.id;
      const response = await logsAPI.list(eventId, 1);
      
      // Map server logs to component format
      const mappedLogs = response.results.map(log => ({
        cardId: log.card_id,
        eventId: log.event?.id || eventId,
        username: log.usher_name || "Unknown",
        time: log.scan_time,
        result: log.result === 'success' ? 'Valid' :
               log.result === 'invalid' ? 'Invalid' :
               log.result === 'duplicate' ? 'Already Scanned' : 'Not Found',
        attendee: log.customer_name ? {
          name: log.customer_name,
          photo: null,
          ticketValid: log.result === 'success',
          scanned: log.result === 'duplicate',
        } : null,
      }));
      
      setLogs(mappedLogs);
    } catch (error) {
      console.error("Error refreshing logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load logs on mount if authenticated
  useEffect(() => {
    if (authService.isAuthenticated()) {
      refreshLogs();
    }
  }, []);

  const addLog = (log) => {
    setLogs((prev) => [log, ...prev]);
  };

  return (
    <ScanLogContext.Provider value={{ logs, addLog, refreshLogs, isLoading }}>
      {children}
    </ScanLogContext.Provider>
  );
}

export function useScanLog() {
  return useContext(ScanLogContext);
}
