import React, { useState, useMemo, useEffect } from "react";
import { useScanLog } from "../contexts/ScanLogContext";
import { useNavigate } from "react-router-dom";
import { logsAPI } from "../lib/api/usherApi";
import { authService } from "../services/authService";
import {
  FaSearch,
  FaTimes,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaFileAlt,
} from "react-icons/fa";
import "./LogsScreen.css";

const ITEMS_PER_PAGE = 10;

export default function LogsScreen() {
  const { logs, refreshLogs } = useScanLog();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [serverLogs, setServerLogs] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  // Load logs from server on mount
  useEffect(() => {
    const loadLogs = async () => {
      if (!authService.isAuthenticated()) {
        navigate("/login");
        return;
      }

      setIsLoading(true);
      try {
        const event = authService.getEvent();
        const eventId = event?.id;
        const response = await logsAPI.list(eventId, currentPage);
        
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
        
        setServerLogs(mappedLogs);
        setTotalPages(response.total_pages || 1);
        
        // Refresh context logs
        if (refreshLogs) {
          refreshLogs();
        }
      } catch (error) {
        console.error("Error loading logs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [currentPage, navigate, refreshLogs]);

  // Search logs on server
  useEffect(() => {
    if (searchQuery.trim()) {
      const searchLogs = async () => {
        setIsLoading(true);
        try {
          const event = authService.getEvent();
          const searchParams = {
            attendee_name: searchQuery,
            event_id: event?.id,
          };
          
          const response = await logsAPI.search(searchParams);
          const mappedLogs = response.map(log => ({
            cardId: log.card_id,
            eventId: log.event?.id,
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
          
          setServerLogs(mappedLogs);
        } catch (error) {
          console.error("Error searching logs:", error);
        } finally {
          setIsLoading(false);
        }
      };

      const debounceTimer = setTimeout(searchLogs, 500);
      return () => clearTimeout(debounceTimer);
    } else {
      // Reload all logs when search is cleared
      setCurrentPage(1);
    }
  }, [searchQuery]);

  // Use server logs if available, otherwise fall back to context logs
  const displayLogs = searchQuery.trim() ? serverLogs : (serverLogs.length > 0 ? serverLogs : logs);
  
  // Paginate logs (server-side pagination already handled, but for local logs)
  const paginatedLogs = useMemo(() => {
    if (serverLogs.length > 0) {
      return serverLogs;
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return logs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [serverLogs, logs, currentPage]);

  const finalTotalPages = serverLogs.length > 0 ? totalPages : Math.ceil(logs.length / ITEMS_PER_PAGE);

  const getStatusIcon = (result) => {
    switch (result) {
      case "Valid":
        return { icon: FaCheckCircle, color: "#4CAF50", bg: "#E8F5E8" };
      case "Invalid":
        return { icon: FaTimesCircle, color: "#E53935", bg: "#FFEBEE" };
      case "Already Scanned":
        return { icon: FaClock, color: "#FF9800", bg: "#FFF3E0" };
      case "Not Found":
        return { icon: FaExclamationTriangle, color: "#9E9E9E", bg: "#F5F5F5" };
      default:
        return {
          icon: FaUser,
          color: "hsl(81.8, 38.5%, 28%)",
          bg: "#E3F2FD",
        };
    }
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleString();
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page) => {
    setIsLoading(true);
    setCurrentPage(page);
    // Simulate loading delay for better UX
    setTimeout(() => setIsLoading(false), 300);
  };

  const renderLogItem = (item) => {
    const statusInfo = getStatusIcon(item.result);
    const StatusIcon = statusInfo.icon;

    return (
      <div className="log-card" key={`${item.cardId}-${item.time}`}>
        <div className="log-header">
          <div
            className="status-icon"
            style={{ backgroundColor: statusInfo.bg }}
          >
            <StatusIcon size={20} color={statusInfo.color} />
          </div>
          <div className="log-header-info">
            <p className="log-time">{formatTime(item.time)}</p>
            <p className="log-card-id">Card: {item.cardId}</p>
          </div>
          <div
            className="status-badge"
            style={{ backgroundColor: statusInfo.color }}
          >
            <span className="status-text">{item.result}</span>
          </div>
        </div>

        <div className="log-details">
          {item.attendee && (
            <div className="attendee-section">
              <div className="section-header">
                <FaUser size={16} color="hsl(81.8, 38.5%, 28%)" />
                <h4 className="section-title">Attendee Information</h4>
              </div>
              <div className="attendee-info">
                <div className="attendee-photo">
                  {item.attendee.photo ? (
                    <img
                      src={item.attendee.photo}
                      alt={item.attendee.name}
                      className="photo"
                    />
                  ) : (
                    <div className="photo-placeholder">
                      <FaUser size={20} color="#fff" />
                    </div>
                  )}
                </div>
                <div className="attendee-details">
                  <h5 className="attendee-name">{item.attendee.name}</h5>
                  <p className="attendee-status">
                    Ticket: {item.attendee.ticketValid ? "Valid" : "Invalid"}
                  </p>
                  <p className="attendee-status">
                    Scanned: {item.attendee.scanned ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="scan-info">
            <div className="info-row">
              <FaUser size={16} color="hsl(81.8, 38.5%, 28%)" />
              <span className="info-label">Scanned by: </span>
              <span className="info-value">{item.username}</span>
            </div>
            <div className="info-row">
              <FaFileAlt size={16} color="hsl(81.8, 38.5%, 28%)" />
              <span className="info-label">Event ID: </span>
              <span className="info-value">{item.eventId}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (finalTotalPages <= 1) return null;

      const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (finalTotalPages <= maxVisible) {
          for (let i = 1; i <= finalTotalPages; i++) {
            pages.push(i);
          }
        } else {
          if (currentPage <= 3) {
            for (let i = 1; i <= 4; i++) {
              pages.push(i);
            }
            pages.push("...");
            pages.push(finalTotalPages);
          } else if (currentPage >= finalTotalPages - 2) {
            pages.push(1);
            pages.push("...");
            for (let i = finalTotalPages - 3; i <= finalTotalPages; i++) {
              pages.push(i);
            }
          } else {
            pages.push(1);
            pages.push("...");
            for (let i = currentPage - 1; i <= currentPage + 1; i++) {
              pages.push(i);
            }
            pages.push("...");
            pages.push(finalTotalPages);
          }
        }

        return pages;
      };

    return (
      <div className="pagination-container">
        <button
          className={`page-button ${
            currentPage === 1 ? "page-button-disabled" : ""
          }`}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <FaChevronLeft
            size={20}
            color={currentPage === 1 ? "#E0E0E0" : "hsl(81.8, 38.5%, 28%)"}
          />
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            className={`page-button ${
              page === currentPage ? "page-button-active" : ""
            } ${page === "..." ? "page-button-ellipsis" : ""}`}
            onClick={() => typeof page === "number" && handlePageChange(page)}
            disabled={page === "..."}
          >
            <span
              className={`page-button-text ${
                page === currentPage ? "page-button-text-active" : ""
              } ${page === "..." ? "page-button-text-ellipsis" : ""}`}
            >
              {page}
            </span>
          </button>
        ))}

        <button
          className={`page-button ${
            currentPage === finalTotalPages ? "page-button-disabled" : ""
          }`}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === finalTotalPages}
        >
          <FaChevronRight
            size={20}
            color={
              currentPage === finalTotalPages ? "#E0E0E0" : "hsl(81.8, 38.5%, 28%)"
            }
          />
        </button>
      </div>
    );
  };

  return (
    <div className="logs-container">
      {/* Header Section */}
      <div className="header">
        <button className="back-button" onClick={() => navigate("/scan")}>
          <FaChevronLeft size={20} style={{ marginRight: 8 }} /> Back to Scan
        </button>
        <div className="logo-container">
          <img
            src="https://ticketrunners.flokisystems.com/src/assets/ticket-logo.png"
            alt="TicketRunners Logo"
            className="logo"
          />
        </div>
      </div>

      {/* Title Section */}
      <div className="title-container">
        <h1 className="header-title">Scan Logs</h1>
        <p className="header-subtitle">
          {displayLogs.length} scan{displayLogs.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-box">
          <FaSearch
            size={20}
            color="hsl(81.8, 38.5%, 28%)"
            className="search-icon"
          />
          <input
            className="search-input"
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchQuery.length > 0 && (
            <button onClick={() => handleSearch("")} className="clear-button">
              <FaTimes size={20} color="#E0E0E0" />
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {searchQuery.length > 0 && (
        <div className="results-summary">
          <p className="results-text">
            Showing {paginatedLogs.length} of {displayLogs.length} results
          </p>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      )}

      {/* Logs List */}
      <div className="logs-list">
        {paginatedLogs.length > 0 ? (
          paginatedLogs.map(renderLogItem)
        ) : (
          <div className="empty-container">
            <div className="empty-icon">
              <FaFileAlt size={48} color="#E0E0E0" />
            </div>
            <h3 className="empty-title">
              {searchQuery.length > 0
                ? "No matching logs found"
                : "No Scan Logs"}
            </h3>
            <p className="empty-subtitle">
              {searchQuery.length > 0
                ? "Try adjusting your search terms"
                : "Scan logs will appear here once you start scanning NFC cards"}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}
