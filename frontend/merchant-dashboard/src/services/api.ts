import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  Merchant,
  NFCCard,
  Customer,
  CardAssignment,
  LoginCredentials,
  OTPVerification,
  PasswordChange,
  MobileChange,
  DashboardStats,
  ApiResponse,
} from "../types";
import { mockApiService } from "./mockData";

// Use mock data for now (no API calls)
const USE_MOCK_DATA = true;

class ApiService {
  private api: AxiosInstance | null = null;
  private baseURL: string;

  constructor() {
    this.baseURL =
      process.env.REACT_APP_API_URL ||
      "https://ticketrunners.flokisystems.com/api";

    // Only create axios instance if not using mock data
    if (!USE_MOCK_DATA) {
      this.api = axios.create({
        baseURL: this.baseURL,
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Add request interceptor to include auth token
      this.api.interceptors.request.use(
        (config) => {
          const token = localStorage.getItem("authToken");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error) => {
          return Promise.reject(error);
        }
      );

      // Add response interceptor for error handling
      this.api.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response?.status === 401) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("merchantData");
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }
      );
    }
  }

  // Authentication
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<{ token: string; merchant: Merchant }>> {
    if (USE_MOCK_DATA) {
      return mockApiService.login(credentials);
    }
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse<
        ApiResponse<{ token: string; merchant: Merchant }>
      > = await this.api.post("/merchant/login", credentials);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async verifyOTP(
    verification: OTPVerification
  ): Promise<ApiResponse<{ token: string; merchant: Merchant }>> {
    if (USE_MOCK_DATA) {
      return mockApiService.verifyOTP(verification);
    }
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse<
        ApiResponse<{ token: string; merchant: Merchant }>
      > = await this.api.post("/merchant/verify-otp", verification);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    if (USE_MOCK_DATA) {
      return mockApiService.logout();
    }
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse<ApiResponse<void>> = await this.api.post(
        "/merchant/logout"
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Card Assignment
  async assignCard(
    assignment: CardAssignment
  ): Promise<ApiResponse<{ hashed_code: string }>> {
    if (USE_MOCK_DATA) {
      return mockApiService.assignCard(assignment);
    }
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse<ApiResponse<{ hashed_code: string }>> =
        await this.api.post("/merchant/assign-card", assignment);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async verifyCustomerMobile(mobile: string): Promise<ApiResponse<Customer>> {
    if (USE_MOCK_DATA) {
      return mockApiService.verifyCustomerMobile(mobile);
    }
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse<ApiResponse<Customer>> = await this.api.get(
        `/merchant/verify-customer/${mobile}`
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async sendCustomerOTP(
    mobile: string
  ): Promise<ApiResponse<{ message: string }>> {
    if (USE_MOCK_DATA) {
      return mockApiService.sendCustomerOTP(mobile);
    }
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> =
        await this.api.post("/merchant/send-customer-otp", {
          mobile_number: mobile,
        });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Card Inventory
  async getCards(): Promise<ApiResponse<NFCCard[]>> {
    if (USE_MOCK_DATA) {
      return mockApiService.getCards();
    }
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse<ApiResponse<NFCCard[]>> =
        await this.api.get("/merchant/cards");
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    if (USE_MOCK_DATA) {
      return mockApiService.getDashboardStats();
    }
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse<ApiResponse<DashboardStats>> =
        await this.api.get("/merchant/dashboard-stats");
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // User Settings
  async changePassword(
    passwordChange: PasswordChange
  ): Promise<ApiResponse<{ message: string }>> {
    if (USE_MOCK_DATA) {
      return mockApiService.changePassword(passwordChange);
    }
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> =
        await this.api.post("/merchant/change-password", passwordChange);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async changeMobile(
    mobileChange: MobileChange
  ): Promise<ApiResponse<{ message: string }>> {
    if (USE_MOCK_DATA) {
      return mockApiService.changeMobile(mobileChange);
    }
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> =
        await this.api.post("/merchant/change-mobile", mobileChange);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async sendMobileChangeOTP(
    newMobile: string
  ): Promise<ApiResponse<{ message: string }>> {
    if (USE_MOCK_DATA) {
      return mockApiService.sendMobileChangeOTP(newMobile);
    }
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> =
        await this.api.post("/merchant/send-mobile-change-otp", {
          new_mobile: newMobile,
        });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Error handling
  private handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    if (error.message) {
      return new Error(error.message);
    }
    return new Error("An unexpected error occurred");
  }
}

export const apiService = new ApiService();
export default apiService;
