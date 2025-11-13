import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { scanAPI, eventsAPI, leaveAPI, reportsAPI, authAPI } from "../lib/api/usherApi";
import { authService } from "../services/authService";
import { useScanLog } from "../contexts/ScanLogContext";
import {
  FaSearch,
  FaQrcode,
  FaList,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle,
  FaPhone,
  FaTint,
  FaTag,
  FaComment,
  FaSignOutAlt,
  FaChild,
} from "react-icons/fa";
import "./ScanScreen.css";

export default function ScanScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId: locationEventId, username: locationUsername } = location.state || {};
  const { addLog, refreshLogs } = useScanLog();
  const [cardId, setCardId] = useState("");
  const [attendee, setAttendee] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [inputVisible, setInputVisible] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [usherComment, setUsherComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [eventId, setEventId] = useState(locationEventId);
  const [username, setUsername] = useState(locationUsername);
  const [error, setError] = useState("");
  const attendeeInfoRef = useRef(null);

  // Load event data and check authentication
  useEffect(() => {
    const checkAuth = async () => {
      if (!authService.isAuthenticated()) {
        navigate("/login");
        return;
      }

      // Get event ID from location state or localStorage
      const storedEvent = authService.getEvent();
      const storedUsher = authService.getUsher();
      
      const finalEventId = locationEventId || storedEvent?.id;
      const finalUsername = locationUsername || storedUsher?.name;

      if (!finalEventId) {
        navigate("/login");
        return;
      }

      setEventId(finalEventId);
      setUsername(finalUsername);

      // Load event details
      try {
        const eventData = await eventsAPI.getDetail(finalEventId);
        setCurrentEvent(eventData);
      } catch (error) {
        console.error("Error loading event:", error);
      }
    };

    checkAuth();
  }, [navigate, locationEventId, locationUsername]);

  useEffect(() => {
    if (attendee && scanResult) {
      attendeeInfoRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [attendee, scanResult]);

  const handleSimulateScan = () => {
    setInputVisible(true);
    setAttendee(null);
    setScanResult(null);
    setCardId("");
  };

  const handleLookup = async () => {
    if (!cardId.trim()) {
      return;
    }

    setIsLoading(true);
    setAttendee(null);
    setScanResult(null);

    try {
      // Get attendee information from API
      const attendeeData = await scanAPI.getAttendee(cardId, eventId);
      
      // Map API response to component format
      // Format emergency contact display
      let emergencyContactDisplay = "Not provided";
      if (attendeeData.emergency_contact_name || attendeeData.emergency_contact) {
        const parts = [];
        if (attendeeData.emergency_contact_name) {
          parts.push(attendeeData.emergency_contact_name);
        }
        if (attendeeData.emergency_contact) {
          parts.push(attendeeData.emergency_contact);
        }
        emergencyContactDisplay = parts.join(" - ");
      }
      
      const mappedAttendee = {
        name: attendeeData.name,
        cardId: attendeeData.card_id,
        photo: attendeeData.photo,
        ticketValid: attendeeData.ticket_status === 'valid',
        scanned: attendeeData.scan_status === 'already_scanned',
        ticketTier: attendeeData.ticket_tier,
        emergencyContact: emergencyContactDisplay,
        emergencyContactName: attendeeData.emergency_contact_name,
        emergencyContactMobile: attendeeData.emergency_contact,
        bloodType: attendeeData.blood_type,
        labels: attendeeData.labels || [],
        dependents: attendeeData.children || [],
      };

      setAttendee(mappedAttendee);

      // Determine scan result
      let result = "valid";
      if (attendeeData.ticket_status !== 'valid') {
        result = "invalid";
      } else if (attendeeData.scan_status === 'already_scanned') {
        result = "already_scanned";
      }

      setScanResult(result);

      // Process scan result with backend
      try {
        await scanAPI.processResult(cardId, eventId, result);
      } catch (processError) {
        console.error("Error processing scan result:", processError);
      }

      // Add to local log context
      const logEntry = {
        cardId,
        eventId,
        username,
        time: new Date().toISOString(),
        result: result === "valid" ? "Valid" : 
                result === "invalid" ? "Invalid" :
                result === "already_scanned" ? "Already Scanned" : "Not Found",
        attendee: mappedAttendee,
      };
      addLog(logEntry);
      
      // Refresh logs from server
      if (refreshLogs) {
        refreshLogs();
      }
    } catch (error) {
      // Enhanced error logging
      console.error("Lookup error:", {
        error: error,
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });
      
      setAttendee(null);
      
      // Extract error message properly
      let errorMessage = "Error looking up attendee. Please try again.";
      if (error.response?.data?.error) {
        const errorData = error.response.data.error;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData && typeof errorData === 'object') {
          errorMessage = errorData.message || errorData.detail || errorMessage;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Set error state and scan result
      setError(errorMessage);
      
      if (error.response?.status === 404) {
        setScanResult("not_found");
        const logEntry = {
          cardId: cardId,
          eventId: eventId,
          username: username,
          time: new Date().toISOString(),
          result: "Not Found",
          attendee: null,
        };
        addLog(logEntry);
      } else {
        setScanResult("not_found");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportUser = () => {
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (attendee && usherComment.trim()) {
      try {
        await reportsAPI.create({
          event: eventId,
          report_type: 'other',
          description: usherComment,
          card_id: attendee.cardId,
          ticket_id: attendee.ticketId,
          customer_id: attendee.customerId,
        });
        
        // Update attendee with usher comment locally
        attendee.usherComments = usherComment;
        setAttendee({ ...attendee });
        setUsherComment("");
        setShowReportModal(false);
      } catch (error) {
        console.error("Error submitting report:", error);
        alert("Failed to submit report. Please try again.");
      }
    }
  };

  const handlePartTimeLeave = async () => {
    if (!attendee || !eventId) return;

    try {
      if (!attendee.partTimeLeave) {
        // Create leave
        await leaveAPI.create(eventId, "Part-time leave");
        attendee.partTimeLeave = true;
      } else {
        // Cancel leave (would need an endpoint for this)
        // For now, just toggle locally
        attendee.partTimeLeave = false;
      }
      setAttendee({ ...attendee });
    } catch (error) {
      console.error("Error handling part-time leave:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/login");
    }
  };

  const getStatusIcon = (result) => {
    switch (result) {
      case "valid":
        return { icon: FaCheckCircle, color: "#4CAF50", bg: "#E8F5E8" };
      case "invalid":
        return { icon: FaTimesCircle, color: "#E53935", bg: "#FFEBEE" };
      case "already_scanned":
        return { icon: FaClock, color: "#FF9800", bg: "#FFF3E0" };
      case "not_found":
        return { icon: FaExclamationTriangle, color: "#9E9E9E", bg: "#F5F5F5" };
      default:
        return { icon: FaUser, color: "hsl(81.8, 38.5%, 28%)", bg: "#E3F2FD" };
    }
  };

  const renderAttendeeInfo = () => {
    if (!attendee) return null;
    const statusInfo = getStatusIcon(scanResult);
    const StatusIcon = statusInfo.icon;

    return (
      <div className="attendee-card" ref={attendeeInfoRef}>
        <div className="card-header">
          <div className="header-icon">
            <FaUser size={24} color="hsl(81.8, 38.5%, 28%)" />
          </div>
          <h2 className="card-title">Attendee Information</h2>
        </div>

        {/* Full width photo */}
        <div className="attendee-photo-full">
          {attendee.photo ? (
            <img
              src={attendee.photo}
              alt={attendee.name}
              className="attendee-photo-large"
            />
          ) : (
            <div className="photo-placeholder-large">
              <FaUser size={80} color="#fff" />
            </div>
          )}
        </div>

        {/* Name and Card ID */}
        <div className="attendee-details">
          <h3 className="attendee-name">{attendee.name}</h3>
          <p className="attendee-card-id">Card ID: {attendee.cardId}</p>
        </div>

        {/* Ticket and Scan Status - Moved to top */}
        <div className="status-section">
          <div className="status-row">
            <div className="status-icon">
              <FaQrcode size={20} color="hsl(81.8, 38.5%, 28%)" />
            </div>
            <span className="status-label">Ticket Status</span>
            <div
              className={`status-badge ${
                attendee.ticketValid ? "status-valid" : "status-invalid"
              }`}
            >
              <span className="status-badge-text">
                {attendee.ticketValid ? "Valid" : "Invalid"}
              </span>
            </div>
          </div>

          <div className="status-row">
            <div className="status-icon">
              <FaClock size={20} color="hsl(81.8, 38.5%, 28%)" />
            </div>
            <span className="status-label">Scan Status</span>
            <div
              className={`status-badge ${
                attendee.scanned ? "status-warn" : "status-valid"
              }`}
            >
              <span className="status-badge-text">
                {attendee.scanned ? "Previously Scanned" : "Not Scanned"}
              </span>
            </div>
          </div>

          {attendee.partTimeLeave && (
            <div className="status-row">
              <div className="status-icon">
                <FaSignOutAlt size={20} color="hsl(81.8, 38.5%, 28%)" />
              </div>
              <span className="status-label">Part-Time Leave</span>
              <div className="status-badge status-warn">
                <span className="status-badge-text">Active</span>
              </div>
            </div>
          )}
        </div>

        {/* Ticket and Profile Labels */}
        {(attendee.ticketLabels?.length > 0 ||
          attendee.profileLabels?.length > 0) && (
          <div className="labels-section">
            {attendee.ticketLabels?.length > 0 && (
              <div className="label-group">
                <div className="label-header">
                  <FaTag size={16} color="hsl(81.8, 38.5%, 28%)" />
                  <span className="label-title">Ticket Labels</span>
                </div>
                <div className="label-container">
                  {attendee.ticketLabels.map((label, idx) => (
                    <span key={idx} className="label-badge ticket-label">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {attendee.profileLabels?.length > 0 && (
              <div className="label-group">
                <div className="label-header">
                  <FaUser size={16} color="hsl(81.8, 38.5%, 28%)" />
                  <span className="label-title">Profile Labels</span>
                </div>
                <div className="label-container">
                  {attendee.profileLabels.map((label, idx) => (
                    <span key={idx} className="label-badge profile-label">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emergency Contact and Blood Type */}
        <div className="info-section">
          <div className="info-row">
            <div className="info-icon">
              <FaPhone size={16} color="hsl(81.8, 38.5%, 28%)" />
            </div>
            <span className="info-label">Emergency Contact</span>
            <span className="info-value">
              {attendee.emergencyContact || "Not provided"}
            </span>
          </div>

          <div className="info-row">
            <div className="info-icon">
              <FaTint size={16} color="hsl(81.8, 38.5%, 28%)" />
            </div>
            <span className="info-label">Blood Type</span>
            <span className="info-value">
              {attendee.bloodType || "Not provided"}
            </span>
          </div>
        </div>

        {/* Children Section */}
        {attendee.dependents &&
          attendee.dependents.length > 0 && (
            <div className="children-section">
              <div className="section-header">
                <FaChild size={18} color="hsl(81.8, 38.5%, 28%)" />
                <h4 className="section-title">
                  Children ({attendee.dependents.length})
                </h4>
              </div>
              <div className="children-list">
                {attendee.dependents.map((child, idx) => (
                  <div key={idx} className="child-item">
                    <span className="child-name">{child.name}</span>
                    <div
                      className={`child-status ${
                        child.status === "Not Scanned"
                          ? "status-valid"
                          : "status-invalid"
                      }`}
                    >
                      <span className="child-status-text">{child.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            className="action-button report-button"
            onClick={handleReportUser}
          >
            <FaComment size={16} className="button-icon" />
            Report User
          </button>
          <button
            className={`action-button ${
              attendee.partTimeLeave ? "leave-active" : "leave-button"
            }`}
            onClick={handlePartTimeLeave}
          >
            <FaSignOutAlt size={16} className="button-icon" />
            {attendee.partTimeLeave ? "Cancel Leave" : "Part-Time Leave"}
          </button>
        </div>

        {/* Usher Comments */}
        {attendee.usherComments && (
          <div className="comments-section">
            <div className="comments-header">
              <FaComment size={16} color="hsl(81.8, 38.5%, 28%)" />
              <span className="comments-title">Usher Comments</span>
            </div>
            <p className="comments-text">{attendee.usherComments}</p>
          </div>
        )}

        {!attendee.ticketValid && (
          <div className="alert-section">
            <div className="alert-icon">
              <FaExclamationTriangle size={20} color="#fff" />
            </div>
            <p className="alert-text">
              Access Denied: {attendee.rejectionReason || "Invalid ticket"}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="scan-container">
      {/* Header Section */}
      <div className="header">
        <div className="logo-container">
          <img
            src="https://ticketrunners.flokisystems.com/src/assets/ticket-logo.png"
            alt="TicketRunners Logo"
            className="logo"
          />
        </div>
      </div>

      <div className="content">
        {/* Header Title */}
        <h1 className="header-title">NFC Scanning System</h1>

        {/* Main Action Card */}
        <div className="main-card">
          <div className="card-icon-container">
            <div className="card-icon">
              <FaQrcode size={32} color="#fff" />
            </div>
          </div>
          <h2 className="card-title">NFC Scanning System</h2>
          <p className="card-subtitle">
            {currentEvent ? `Event: ${currentEvent.title}` : "Scan NFC cards to verify attendees"}
          </p>

          <button 
            className="primary-button" 
            onClick={handleSimulateScan}
            disabled={isLoading}
          >
            <FaQrcode size={20} color="#fff" className="button-icon" />
            {isLoading ? "Loading..." : "Scan NFC Card"}
          </button>
          
          <button
            className="secondary-button"
            onClick={handleLogout}
            style={{ marginTop: '10px' }}
          >
            <FaSignOutAlt size={16} color="hsl(81.8, 38.5%, 28%)" />
            Logout
          </button>

          <button
            className="secondary-button"
            onClick={() => navigate("/logs")}
          >
            <FaList
              size={20}
              color="hsl(81.8, 38.5%, 28%)"
              className="button-icon"
            />
            View Scan Logs
          </button>
        </div>

        {/* Input Section */}
        {inputVisible && (
          <div className="input-card">
            <div className="input-header">
              <FaQrcode size={20} color="hsl(81.8, 38.5%, 28%)" />
              <h3 className="input-title">Enter Card ID</h3>
            </div>
            <input
              className="text-input"
              type="text"
              placeholder="Enter Card ID"
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLookup()}
              autoCapitalize="characters"
            />
            <button 
              className="lookup-button" 
              onClick={handleLookup}
              disabled={isLoading || !cardId.trim()}
            >
              <FaSearch size={20} color="#fff" className="button-icon" />
              {isLoading ? "Looking up..." : "Lookup Attendee"}
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-card">
            <FaExclamationTriangle size={24} color="#E53935" />
            <p className="error-text">
              {typeof error === 'string' ? error : 'An error occurred'}
            </p>
          </div>
        )}
        {scanResult === "not_found" && !error && (
          <div className="error-card">
            <FaExclamationTriangle size={24} color="#E53935" />
            <p className="error-text">
              Attendee not found for this card/event combination
            </p>
          </div>
        )}

        {/* Attendee Information */}
        {renderAttendeeInfo()}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Report User</h3>
            <textarea
              className="modal-textarea"
              placeholder="Enter your comment about this user..."
              value={usherComment}
              onChange={(e) => setUsherComment(e.target.value)}
              rows={4}
            />
            <div className="modal-buttons">
              <button
                className="modal-button cancel-button"
                onClick={() => setShowReportModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-button submit-button"
                onClick={handleSubmitReport}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
