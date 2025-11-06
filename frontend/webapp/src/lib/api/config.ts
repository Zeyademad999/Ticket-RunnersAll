import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { ApiError } from "./types";
import { AuthService } from "./services/auth";
import {
  getSecureToken,
  getSecureRefreshToken,
  setSecureToken,
  clearSecureAuth,
} from "../secureStorage";
import { tokenManager } from "../tokenManager";
import { ValidationService } from "../validation";

// API Configuration
export const API_CONFIG = {
  BASE_URL:
    import.meta.env.VITE_API_BASE_URL ||
    "https://trapi.flokisystems.com/api/v1",
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Create axios instance
export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor with enhanced token handling
  client.interceptors.request.use(
    async (config) => {
      // Skip token for refresh endpoint to avoid infinite loops
      if (config.url?.includes("/auth/refresh")) {
        return config;
      }

      // Get valid token using token manager
      try {
        const token = await tokenManager.getValidToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        // Continue without token - let the response interceptor handle 401s
        console.warn("Failed to get valid token for request:", config.url);
      }

      // Add request timestamp and ID for debugging
      config.metadata = {
        startTime: new Date(),
        requestId: `req_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      };

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor with race condition protection
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Add response time for debugging
      const endTime = new Date();
      const startTime = response.config.metadata?.startTime;
      if (startTime) {
        response.config.metadata.responseTime =
          endTime.getTime() - startTime.getTime();
      }

      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Skip refresh logic for refresh endpoint to avoid infinite loops
      if (originalRequest.url?.includes("/auth/refresh")) {
        return Promise.reject(error);
      }

      // Handle token refresh with race condition protection
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          console.log("401 error detected, attempting token refresh...");

          // Check if we have a valid refresh token before attempting refresh
          const refreshToken = await getSecureRefreshToken();
          if (!refreshToken) {
            console.log("No refresh token available, clearing auth");
            clearSecureAuth();
            window.dispatchEvent(
              new CustomEvent("auth-required", {
                detail: { reason: "No refresh token available" },
              })
            );
            throw new Error("Authentication failed");
          }

          // Log refresh token expiration details
          ValidationService.logRefreshTokenExpiration(refreshToken);

          // Check if refresh token is expired before attempting refresh
          if (ValidationService.isTokenExpired(refreshToken)) {
            console.log("Refresh token is expired, clearing auth");
            clearSecureAuth();
            window.dispatchEvent(
              new CustomEvent("auth-required", {
                detail: { reason: "Refresh token expired" },
              })
            );
            throw new Error("Authentication failed");
          }

          const newToken = await tokenManager.refreshAccessToken();

          if (newToken) {
            // Update the original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            console.log("Token refreshed successfully, retrying request...");
            return client(originalRequest);
          } else {
            // Token refresh failed, clear auth
            console.warn("Token refresh failed, clearing authentication");
            clearSecureAuth();

            // Dispatch auth-required event
            window.dispatchEvent(
              new CustomEvent("auth-required", {
                detail: { reason: "Token refresh failed" },
              })
            );

            throw new Error("Authentication failed");
          }
        } catch (refreshError: any) {
          console.error("Token refresh failed:", refreshError);

          // Clear auth for any refresh error
          clearSecureAuth();

          // Dispatch auth-required event
          window.dispatchEvent(
            new CustomEvent("auth-required", {
              detail: {
                reason: "Token refresh failed",
                error: refreshError.message,
              },
            })
          );

          throw refreshError;
        }
      }

      // Transform error response
      const apiError: ApiError = {
        message:
          error.response?.data?.message ||
          error.message ||
          "An unexpected error occurred",
        code: error.response?.data?.code,
        field: error.response?.data?.field,
        status: error.response?.status,
      };

      // Handle 500 errors with better user experience
      if (error.response?.status === 500) {
        const errorMessage = error.response?.data?.message || "";
        const errorDetails = error.response?.data || {};

        console.error("500 Error Details:", {
          message: errorMessage,
          details: errorDetails,
          url: error.config?.url,
          method: error.config?.method,
        });

        // Check for VERY specific authentication-related errors
        // Only clear tokens for explicit authentication failures, not general server errors
        const isAuthError =
          (errorMessage.includes("authentication") &&
            errorMessage.includes("failed")) ||
          (errorMessage.includes("unauthorized") &&
            errorMessage.includes("token")) ||
          (errorMessage.includes("token") &&
            errorMessage.includes("invalid")) ||
          (errorMessage.includes("JWT") && errorMessage.includes("invalid")) ||
          (errorMessage.includes("invalid") &&
            errorMessage.includes("token")) ||
          (errorMessage.includes("expired") && errorMessage.includes("token"));

        if (isAuthError) {
          console.warn("Backend authentication error detected:", errorMessage);

          // Clear auth data and trigger re-authentication using secure storage
          clearSecureAuth();

          // Dispatch event to trigger login modal
          window.dispatchEvent(
            new CustomEvent("auth-required", {
              detail: {
                reason: "Backend authentication error",
                message: errorMessage,
              },
            })
          );

          // Show user-friendly error message
          apiError.message = "Authentication error. Please log in again.";
        } else {
          // For other 500 errors, show user-friendly error message without clearing tokens
          console.warn(
            "Backend 500 error (not authentication related):",
            errorMessage
          );

          // Show user-friendly error message for server errors
          if (
            errorMessage.includes("property") &&
            errorMessage.includes("null")
          ) {
            apiError.message =
              "Server error: Data synchronization issue. Please try again in a moment.";
          } else if (
            errorMessage.includes("database") ||
            errorMessage.includes("connection")
          ) {
            apiError.message =
              "Server temporarily unavailable. Please try again later.";
          } else {
            apiError.message =
              "Server error occurred. Please try again or contact support if the issue persists.";
          }

          // Dispatch error event for global error handling
          window.dispatchEvent(
            new CustomEvent("api-error", {
              detail: {
                message: apiError.message,
                status: 500,
                url: error.config?.url,
                method: error.config?.method,
              },
            })
          );
        }
      }

      return Promise.reject(apiError);
    }
  );

  return client;
};

// Default API client instance
export const apiClient = createApiClient();

// Utility functions for API calls
export const handleApiResponse = <T>(response: AxiosResponse<T>) => {
  return response.data;
};

export const handleApiError = (error: any): never => {
  if (error.response) {
    // Server responded with error status
    throw {
      message: error.response.data?.message || "Server error",
      status: error.response.status,
      code: error.response.data?.code,
    };
  } else if (error.request) {
    // Network error
    throw {
      message: "Network error. Please check your connection.",
      status: 0,
    };
  } else {
    // Other error
    throw {
      message: error.message || "An unexpected error occurred",
      status: 500,
    };
  }
};

// Retry utility for failed requests
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = API_CONFIG.RETRY_ATTEMPTS,
  delay: number = API_CONFIG.RETRY_DELAY
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // For rate limiting (429), use exponential backoff with jitter
      if (error.status === 429) {
        const baseDelay = delay * Math.pow(2, attempt - 1); // Exponential backoff
        const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
        const totalDelay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds

        console.warn(
          `Rate limited. Retrying in ${Math.round(
            totalDelay
          )}ms (attempt ${attempt}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      } else {
        // For other retryable errors, use linear backoff
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
};

// File upload configuration
export const createUploadConfig = (
  file: File,
  onProgress?: (progress: number) => void
): AxiosRequestConfig => {
  const formData = new FormData();
  formData.append("file", file);

  return {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(progress);
      }
    },
  };
};

// Query parameter builder
export const buildQueryParams = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
};
