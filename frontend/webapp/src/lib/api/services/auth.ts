import { apiClient, handleApiResponse, retryRequest } from "../config";
import {
  setSecureToken,
  setSecureRefreshToken,
  clearSecureAuth,
  getSecureToken,
  getSecureRefreshToken,
} from "../../secureStorage";
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  OtpLoginRequest,
  SendOtpRequest,
  SendOtpResponse,
  SignupRequest,
  SignupStartRequest,
  SignupStartResponse,
  SendMobileOtpRequest,
  SendMobileOtpResponse,
  VerifyMobileOtpRequest,
  VerifyMobileOtpResponse,
  SendEmailOtpRequest,
  SendEmailOtpResponse,
  VerifyEmailOtpRequest,
  VerifyEmailOtpResponse,
  SetPasswordRequest,
  SetPasswordResponse,
  UploadProfileImageRequest,
  UploadProfileImageResponse,
  SaveOptionalInfoRequest,
  SaveOptionalInfoResponse,
  CompleteSignupRequest,
  CompleteSignupResponse,
  RefreshTokenResponse,
  LogoutResponse,
  LogoutAllResponse,
  GetCurrentUserResponse,
  PasswordResetOtpResponse,
  VerifyPasswordResetOtpResponse,
  ConfirmPasswordResetResponse,
} from "../types";

// Utility function to generate device fingerprint
const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("Device fingerprint", 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join("|");

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
};

export class AuthService {
  /**
   * Customer login with email/mobile and password
   * Auto-detects login type (email or mobile)
   */
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        "/auth/login",
        credentials
      );
      const data = handleApiResponse(response);

      // Handle different possible response structures
      let authData: AuthResponse;

      if (data.data && typeof data.data === "object" && "token" in data.data) {
        // Standard nested structure: { success: true, data: { token: "...", user: {...} } }
        authData = data.data as AuthResponse;
      } else if ("token" in data) {
        // Direct structure: { token: "...", user: {...} }
        authData = data as unknown as AuthResponse;
      } else if ("access_token" in data && "customer" in data) {
        // API structure: { customer: {...}, access_token: "...", refresh_token: "..." }
        const customerData = data.customer as any;
        authData = {
          token: data.access_token as string,
          user: {
            id: customerData.id,
            name: `${customerData.first_name} ${customerData.last_name}`,
            email: customerData.email,
            phone: customerData.mobile_number,
            CardActive:
              customerData.type === "vip" || customerData.status === "vip",
            emergencyContact: "",
            emergencyContactName: "",
            bloodType: "",
            profileImage: "",
          },
          refreshToken: (data as any).refresh_token,
        };
      } else {
        // Fallback: try to extract from the response directly
        console.error("Unexpected response structure:", data);
        throw new Error("Invalid response structure from login API");
      }

      // Store tokens securely
      console.log("AuthService.login - Storing tokens:", {
        hasToken: !!authData.token,
        hasRefreshToken: !!authData.refreshToken,
        tokenPreview: authData.token?.substring(0, 20) + "...",
        refreshTokenPreview: authData.refreshToken?.substring(0, 20) + "...",
      });

      if (authData.token) {
        console.log("AuthService.login - Storing access token");
        await setSecureToken(authData.token);
      }
      if (authData.refreshToken) {
        console.log("AuthService.login - Storing refresh token");
        await setSecureRefreshToken(authData.refreshToken);
      }

      return authData;
    });
  }

  /**
   * Helper method to create login request with device fingerprint
   */
  static createLoginRequest(login: string, password: string): LoginRequest {
    return {
      login,
      password,
      device_fingerprint: generateDeviceFingerprint(),
    };
  }

  /**
   * Send OTP for login (mobile or email)
   */
  static async sendLoginOtp(otpData: SendOtpRequest): Promise<SendOtpResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<SendOtpResponse>>(
        "/auth/send-otp",
        otpData
      );
      const data = handleApiResponse(response);

      // Handle different possible response structures
      let otpResponse: SendOtpResponse;

      if (
        data.data &&
        typeof data.data === "object" &&
        "message" in data.data
      ) {
        // Standard nested structure: { success: true, data: { message: "...", expires_at: "..." } }
        otpResponse = data.data as SendOtpResponse;
      } else if ("message" in data) {
        // Direct structure: { message: "...", expires_at: "..." }
        otpResponse = data as unknown as SendOtpResponse;
      } else {
        // Fallback: try to extract from the response directly
        console.error("Unexpected Send OTP response structure:", data);
        throw new Error("Invalid response structure from Send OTP API");
      }

      return otpResponse;
    });
  }

  /**
   * Login with OTP verification
   */
  static async loginWithOtp(
    credentials: OtpLoginRequest
  ): Promise<AuthResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        "/auth/login/otp",
        credentials
      );
      const data = handleApiResponse(response);

      // Handle different possible response structures
      let authData: AuthResponse;

      if (data.data && typeof data.data === "object" && "token" in data.data) {
        // Standard nested structure: { success: true, data: { token: "...", user: {...} } }
        authData = data.data as AuthResponse;
      } else if ("token" in data) {
        // Direct structure: { token: "...", user: {...} }
        authData = data as unknown as AuthResponse;
      } else if ("access_token" in data && "customer" in data) {
        // API structure: { customer: {...}, access_token: "...", refresh_token: "..." }
        const customerData = data.customer as any;
        authData = {
          token: data.access_token as string,
          user: {
            id: customerData.id,
            name: `${customerData.first_name} ${customerData.last_name}`,
            email: customerData.email,
            phone: customerData.mobile_number,
            CardActive:
              customerData.type === "vip" || customerData.status === "vip",
            emergencyContact: "",
            emergencyContactName: "",
            bloodType: "",
            profileImage: "",
          },
          refreshToken: (data as any).refresh_token,
        };
      } else {
        // Fallback: try to extract from the response directly
        console.error("Unexpected OTP login response structure:", data);
        throw new Error("Invalid response structure from OTP login API");
      }

      // Store tokens securely
      if (authData.token) {
        setSecureToken(authData.token);
      }
      if (authData.refreshToken) {
        setSecureRefreshToken(authData.refreshToken);
      }

      return authData;
    });
  }

  /**
   * Helper method to create OTP login request with device fingerprint
   */
  static createOtpLoginRequest(
    mobile: string | undefined,
    email: string | undefined,
    otpCode: string
  ): OtpLoginRequest {
    return {
      mobile,
      email,
      otp_code: otpCode,
      device_fingerprint: generateDeviceFingerprint(),
    };
  }

  /**
   * Start signup process - create pending customer
   */
  static async signupStart(
    userData: SignupStartRequest
  ): Promise<SignupStartResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<SignupStartResponse>(
        "/signup/start",
        userData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Send mobile OTP for signup verification
   */
  static async sendMobileOtp(
    otpData: SendMobileOtpRequest
  ): Promise<SendMobileOtpResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<SendMobileOtpResponse>(
        "/signup/otp/mobile/send",
        otpData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Verify mobile OTP for signup verification
   */
  static async verifyMobileOtp(
    otpData: VerifyMobileOtpRequest
  ): Promise<VerifyMobileOtpResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<VerifyMobileOtpResponse>(
        "/signup/otp/mobile/verify",
        otpData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Send email OTP for signup verification
   */
  static async sendEmailOtp(
    otpData: SendEmailOtpRequest
  ): Promise<SendEmailOtpResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<SendEmailOtpResponse>(
        "/signup/otp/email/send",
        otpData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Verify email OTP for signup verification
   */
  static async verifyEmailOtp(
    otpData: VerifyEmailOtpRequest
  ): Promise<VerifyEmailOtpResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<VerifyEmailOtpResponse>(
        "/signup/otp/email/verify",
        otpData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Set password for signup account
   */
  static async setPassword(
    passwordData: SetPasswordRequest
  ): Promise<SetPasswordResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<SetPasswordResponse>(
        "/signup/password",
        passwordData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Upload profile image for signup account
   */
  static async uploadProfileImage(
    imageData: UploadProfileImageRequest
  ): Promise<UploadProfileImageResponse> {
    return retryRequest(async () => {
      const formData = new FormData();
      formData.append("signup_id", imageData.signup_id.toString());
      formData.append("file", imageData.file);

      const response = await apiClient.post<UploadProfileImageResponse>(
        "/signup/profile-image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Save optional information for signup account
   */
  static async saveOptionalInfo(
    optionalData: SaveOptionalInfoRequest
  ): Promise<SaveOptionalInfoResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<SaveOptionalInfoResponse>(
        "/signup/optional",
        optionalData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Complete signup and activate account
   */
  static async completeSignup(
    signupData: CompleteSignupRequest
  ): Promise<CompleteSignupResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<CompleteSignupResponse>(
        "/signup/complete",
        signupData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * User signup
   */
  static async signup(userData: SignupRequest): Promise<AuthResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        "/auth/signup",
        userData
      );
      const data = handleApiResponse(response);

      // Store tokens securely
      if (data.data.token) {
        setSecureToken(data.data.token);
      }
      if (data.data.refreshToken) {
        setSecureRefreshToken(data.data.refreshToken);
      }

      return data.data;
    });
  }

  /**
   * Refresh access token using the API specification
   * POST /auth/refresh with refresh_token in body
   */
  static async refreshToken(
    refreshToken: string
  ): Promise<RefreshTokenResponse> {
    // Validate refresh token format before making the request
    if (!this.isValidRefreshToken(refreshToken)) {
      throw new Error("Invalid refresh token format");
    }

    return retryRequest(async () => {
      try {
        const response = await apiClient.post<
          ApiResponse<RefreshTokenResponse>
        >("/auth/refresh", {
          refresh_token: refreshToken,
        });
        const data = handleApiResponse(response);

        // Handle the API response structure according to spec: { access_token: string, expires_at: string }
        let refreshResponse: RefreshTokenResponse;

        if (data.data && data.data.access_token && data.data.expires_at) {
          // Nested structure: { success: true, data: { access_token: "...", expires_at: "..." } }
          refreshResponse = data.data as RefreshTokenResponse;
        } else if ((data as any).access_token && (data as any).expires_at) {
          // Direct structure: { access_token: "...", expires_at: "..." }
          refreshResponse = data as unknown as RefreshTokenResponse;
        } else {
          console.error("Unexpected refresh token response structure:", data);
          throw new Error("Invalid response structure from refresh token API");
        }

        // Validate response structure according to API spec
        if (!refreshResponse.access_token || !refreshResponse.expires_at) {
          throw new Error("Missing required fields in refresh token response");
        }

        // Update stored access token
        if (refreshResponse.access_token) {
          setSecureToken(refreshResponse.access_token);
        }

        return refreshResponse;
      } catch (error: any) {
        // Handle specific HTTP status codes from the API specification
        if (error.status === 401) {
          throw new Error("Refresh token is invalid or expired");
        } else if (error.status === 422) {
          throw new Error(
            "Invalid refresh token format or missing required field"
          );
        } else {
          throw error;
        }
      }
    });
  }

  /**
   * User logout - invalidate tokens on server
   */
  static async logout(): Promise<LogoutResponse> {
    try {
      const response = await apiClient.post<ApiResponse<LogoutResponse>>(
        "/auth/logout",
        {}
      );
      const data = handleApiResponse(response);

      // Handle different possible response structures
      let logoutResponse: LogoutResponse;

      if (
        data.data &&
        typeof data.data === "object" &&
        "message" in data.data
      ) {
        // Standard nested structure: { success: true, data: { message: "..." } }
        logoutResponse = data.data as LogoutResponse;
      } else if ("message" in data) {
        // Direct structure: { message: "..." }
        logoutResponse = data as unknown as LogoutResponse;
      } else {
        // Fallback: use default message
        console.warn("Unexpected logout response structure:", data);
        logoutResponse = { message: "Logged out successfully" };
      }

      return logoutResponse;
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn("Logout API call failed:", error);
      // Return a default response to maintain consistency
      return { message: "Logged out locally" };
    } finally {
      // Clear secure storage regardless of API call result
      clearSecureAuth();
    }
  }

  /**
   * Logout from all devices - invalidate all sessions
   */
  static async logoutAll(): Promise<LogoutAllResponse> {
    try {
      const response = await apiClient.post<ApiResponse<LogoutAllResponse>>(
        "/auth/logout-all",
        {}
      );
      const data = handleApiResponse(response);

      // Handle different possible response structures
      let logoutAllResponse: LogoutAllResponse;

      if (
        data.data &&
        typeof data.data === "object" &&
        "message" in data.data
      ) {
        // Standard nested structure: { success: true, data: { message: "..." } }
        logoutAllResponse = data.data as LogoutAllResponse;
      } else if ("message" in data) {
        // Direct structure: { message: "..." }
        logoutAllResponse = data as unknown as LogoutAllResponse;
      } else {
        // Fallback: use default message
        console.warn("Unexpected logout all response structure:", data);
        logoutAllResponse = {
          message: "Logged out from all devices successfully",
        };
      }

      return logoutAllResponse;
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn("Logout all API call failed:", error);
      // Return a default response to maintain consistency
      return { message: "Logged out from all devices locally" };
    } finally {
      // Clear secure storage regardless of API call result
      clearSecureAuth();
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<GetCurrentUserResponse> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<GetCurrentUserResponse>>(
        "/auth/me"
      );
      const data = handleApiResponse(response);

      // Handle different possible response structures
      let userResponse: GetCurrentUserResponse;

      if (
        data.data &&
        typeof data.data === "object" &&
        "customer" in data.data
      ) {
        // Standard nested structure: { success: true, data: { customer: {...} } }
        userResponse = data.data as GetCurrentUserResponse;
      } else if ("customer" in data) {
        // Direct structure: { customer: {...} }
        userResponse = data as unknown as GetCurrentUserResponse;
      } else {
        // Fallback: try to extract from the response directly
        console.error("Unexpected get current user response structure:", data);
        throw new Error("Invalid response structure from get current user API");
      }

      return userResponse;
    });
  }

  /**
   * Forgot password
   */
  static async forgotPassword(
    email: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        "/auth/forgot-password",
        {
          email,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Reset password
   */
  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        "/auth/reset-password",
        {
          token,
          newPassword,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Verify email
   */
  static async verifyEmail(
    token: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        "/auth/verify-email",
        {
          token,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(
    email: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        "/auth/resend-verification",
        {
          email,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Change password
   */
  static async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        "/auth/change-password",
        {
          oldPassword,
          newPassword,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = getSecureToken();
    const refreshToken = getSecureRefreshToken();

    if (!token || !refreshToken) {
      return false;
    }

    // Check if access token is expired
    if (this.isTokenExpired(token)) {
      return false;
    }

    return true;
  }

  /**
   * Get stored auth token
   */
  static getAuthToken(): string | null {
    return getSecureToken();
  }

  /**
   * Get stored refresh token
   */
  static getRefreshToken(): string | null {
    return getSecureRefreshToken();
  }

  /**
   * Clear all auth data
   */
  static clearAuthData(): void {
    clearSecureAuth();
  }

  /**
   * Check if access token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      // Validate token format
      if (
        !token ||
        typeof token !== "string" ||
        token.split(".").length !== 3
      ) {
        return true;
      }

      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      // Add 30 second buffer to refresh token before it actually expires
      const bufferTime = 30; // 30 seconds
      const isExpired = payload.exp < currentTime + bufferTime;

      return isExpired;
    } catch (error) {
      console.warn("Error parsing token:", error);
      return true; // If we can't parse the token, consider it expired
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Debug token information
   */
  static debugTokenInfo(token: string, tokenType: string = "token"): void {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;

      console.log(`${tokenType} debug info:`, {
        issuedAt: new Date(payload.iat * 1000).toISOString(),
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        currentTime: new Date(currentTime * 1000).toISOString(),
        timeUntilExpiry: timeUntilExpiry,
        timeUntilExpiryMinutes: Math.floor(timeUntilExpiry / 60),
        isExpired: timeUntilExpiry < 0,
        tokenPreview: token.substring(0, 20) + "...",
      });
    } catch (error) {
      console.warn(`Error parsing ${tokenType}:`, error);
    }
  }

  /**
   * Validate refresh token format
   */
  static isValidRefreshToken(token: string): boolean {
    try {
      if (!token || typeof token !== "string") {
        return false;
      }

      // Check if it's a JWT token (3 parts separated by dots)
      if (token.split(".").length !== 3) {
        return false;
      }

      // Try to parse the payload
      const payload = JSON.parse(atob(token.split(".")[1]));

      // Check if it has required fields
      return payload && typeof payload === "object" && payload.exp;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate JWT token format and content (conservative approach)
   */
  static validateToken(token: string): {
    isValid: boolean;
    payload?: any;
    error?: string;
  } {
    try {
      if (!token || typeof token !== "string") {
        return { isValid: false, error: "Token is not a string" };
      }

      // Check if it's a JWT token (3 parts separated by dots)
      const parts = token.split(".");
      if (parts.length !== 3) {
        return { isValid: false, error: "Token is not a valid JWT format" };
      }

      // Try to parse the payload
      const payload = JSON.parse(atob(parts[1]));

      // Check if it has required fields - only fail for critical missing fields
      if (!payload || typeof payload !== "object") {
        return { isValid: false, error: "Token payload is not an object" };
      }

      // Only require user ID (sub) - expiration can be handled by the server
      if (!payload.sub) {
        return { isValid: false, error: "Token missing user ID (sub)" };
      }

      // Don't require expiration field - let the server handle it
      return { isValid: true, payload };
    } catch (error) {
      return { isValid: false, error: `Token parsing error: ${error}` };
    }
  }

  /**
   * Check if refresh token is expired
   */
  static isRefreshTokenExpired(token: string): boolean {
    try {
      // Validate token format first
      if (!this.isValidRefreshToken(token)) {
        console.warn("Invalid refresh token format");
        return true;
      }

      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      // Add 30 second buffer to refresh token before it actually expires
      const bufferTime = 30; // 30 seconds
      const isExpired = payload.exp < currentTime + bufferTime;

      return isExpired;
    } catch (error) {
      console.warn("Error parsing refresh token:", error);
      return true; // If we can't parse the token, consider it expired
    }
  }

  /**
   * Request OTP for password reset
   */
  static async requestPasswordResetOtp(
    mobileNumber: string
  ): Promise<PasswordResetOtpResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<
        ApiResponse<PasswordResetOtpResponse>
      >("/auth/password/reset/request", {
        mobile_number: mobileNumber,
      });
      const data = handleApiResponse(response);

      // Debug logging to help identify response structure
      console.log("Password reset OTP API response:", {
        status: response.status,
        data: data,
        dataType: typeof data,
        hasData: !!data,
        hasDataData: !!(data && data.data),
        dataKeys: data ? Object.keys(data) : [],
        dataDataKeys: data && data.data ? Object.keys(data.data) : [],
      });

      // Handle different possible response structures
      let otpResponse: PasswordResetOtpResponse;

      if (
        data &&
        data.data &&
        typeof data.data === "object" &&
        "message" in data.data
      ) {
        // Standard nested structure: { success: true, data: { message: "..." } }
        otpResponse = data.data as PasswordResetOtpResponse;
      } else if (data && "message" in data) {
        // Direct structure: { message: "..." }
        otpResponse = data as unknown as PasswordResetOtpResponse;
      } else {
        // Fallback: use default message as per API spec
        console.warn("Unexpected password reset OTP response structure:", data);
        otpResponse = {
          message:
            "If an account exists for this mobile, an OTP has been sent.",
        };
      }

      return otpResponse;
    });
  }

  /**
   * Verify OTP for password reset
   */
  static async verifyPasswordResetOtp(
    mobileNumber: string,
    otpCode: string
  ): Promise<VerifyPasswordResetOtpResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<
        ApiResponse<VerifyPasswordResetOtpResponse>
      >("/auth/password/reset/verify", {
        mobile_number: mobileNumber,
        otp_code: otpCode,
      });
      const data = handleApiResponse(response);

      // Debug logging to help identify response structure
      console.log("Password reset OTP verification API response:", {
        status: response.status,
        data: data,
        dataType: typeof data,
        hasData: !!data,
        hasDataData: !!(data && data.data),
        dataKeys: data ? Object.keys(data) : [],
        dataDataKeys: data && data.data ? Object.keys(data.data) : [],
      });

      // Handle different possible response structures
      let verifyResponse: VerifyPasswordResetOtpResponse;

      if (
        data &&
        data.data &&
        typeof data.data === "object" &&
        "password_reset_token" in data.data
      ) {
        // Standard nested structure: { success: true, data: { password_reset_token: "...", expires_in_seconds: ... } }
        verifyResponse = data.data as VerifyPasswordResetOtpResponse;
      } else if (data && "password_reset_token" in data) {
        // Direct structure: { password_reset_token: "...", expires_in_seconds: ... }
        verifyResponse = data as unknown as VerifyPasswordResetOtpResponse;
      } else {
        // Fallback: throw error for invalid response
        console.error(
          "Unexpected password reset OTP verification response structure:",
          data
        );
        throw new Error(
          "Invalid response structure from password reset OTP verification API"
        );
      }

      return verifyResponse;
    });
  }

  /**
   * Confirm password reset with new password
   */
  static async confirmPasswordReset(
    passwordResetToken: string,
    password: string,
    passwordConfirmation: string
  ): Promise<ConfirmPasswordResetResponse> {
    // Log token information for debugging
    console.log("Password reset token details:", {
      length: passwordResetToken?.length,
      preview: passwordResetToken?.substring(0, 50) + "...",
      isBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(passwordResetToken || ""),
      hasWhitespace:
        passwordResetToken?.includes(" ") ||
        passwordResetToken?.includes("\n") ||
        passwordResetToken?.includes("\t"),
      firstChar: passwordResetToken?.charAt(0),
      lastChar: passwordResetToken?.charAt(passwordResetToken.length - 1),
    });

    // Check if the token needs to be decoded or processed
    // The token appears to be base64 encoded with additional data
    let processedToken = passwordResetToken;

    // Try different token processing approaches
    try {
      // Check if the token contains a dot (JWT format) or is base64 encoded
      if (passwordResetToken.includes(".")) {
        const parts = passwordResetToken.split(".");
        console.log(
          "Token parts:",
          parts.length,
          parts.map((p) => p.substring(0, 20) + "...")
        );

        // Try using just the first part (before the dot)
        const firstPart = parts[0];
        console.log("Trying first part only:", firstPart);
        processedToken = firstPart;

        // Also try to decode the first part if it's base64
        try {
          const decoded = atob(firstPart);
          console.log("Decoded first part:", decoded);
          // If it decodes to something that looks like a token, use it
          if (decoded.length > 10 && decoded.includes("|")) {
            processedToken = decoded;
            console.log("Using decoded first part as token");
          }
        } catch (decodeError) {
          console.log("First part decode failed:", decodeError);
        }

        // Try different token formats
        console.log("Trying different token formats:");
        console.log("1. Original token:", passwordResetToken);
        console.log("2. First part only:", firstPart);
        console.log("3. Decoded first part:", atob(firstPart));

        // Try the original token first
        processedToken = passwordResetToken;
      }
    } catch (error) {
      console.log("Token processing failed, using original token:", error);
    }

    return retryRequest(async () => {
      console.log(
        "Sending password reset confirmation with token length:",
        processedToken?.length
      );

      const requestData = {
        password_reset_token: processedToken,
        password: password,
        password_confirmation: passwordConfirmation,
      };

      console.log("Sending request data:", {
        password_reset_token: processedToken,
        password: "[REDACTED]",
        password_confirmation: "[REDACTED]",
        tokenLength: processedToken?.length,
        tokenPreview: processedToken?.substring(0, 20) + "...",
      });

      try {
        const response = await apiClient.post<
          ApiResponse<ConfirmPasswordResetResponse>
        >("/auth/password/reset/confirm", requestData);
        return response;
      } catch (error: any) {
        // If the first attempt fails with token invalid, try alternative token formats
        if (
          error.status === 422 &&
          error.message?.includes("Invalid or expired reset token")
        ) {
          console.log("Token rejected, trying alternative formats...");

          // Try different token formats with delays to avoid rate limiting
          const decodedToken = atob(passwordResetToken.split(".")[0]);
          const alternatives = [
            passwordResetToken.split(".")[0], // First part only
            decodedToken, // Decoded first part
            passwordResetToken.replace(/\..*$/, ""), // Remove everything after first dot
            // Try extracting specific parts from decoded token
            decodedToken.split("|")[0], // Just the phone number part
            decodedToken.split("|")[1], // Just the ID part
            decodedToken.split("|").slice(0, 2).join("|"), // Phone + ID
          ];

          console.log(
            "Available alternatives:",
            alternatives.map((alt, i) => `${i}: ${alt.substring(0, 30)}...`)
          );

          // Check if token might be expired by looking at timestamps
          const tokenParts = decodedToken.split("|");
          if (tokenParts.length >= 4) {
            const currentTime = Math.floor(Date.now() / 1000);
            const tokenTime1 = parseInt(tokenParts[2]);
            const tokenTime2 = parseInt(tokenParts[3]);
            console.log("Token timestamp analysis:", {
              currentTime,
              tokenTime1,
              tokenTime2,
              isExpired1: currentTime > tokenTime1,
              isExpired2: currentTime > tokenTime2,
              timeDiff1: currentTime - tokenTime1,
              timeDiff2: currentTime - tokenTime2,
            });
          }

          // Limit to 1 attempt to avoid rate limiting (tokens expire quickly)
          const maxAttempts = 1;
          let attempts = 0;

          for (const altToken of alternatives) {
            if (
              altToken &&
              altToken !== processedToken &&
              attempts < maxAttempts
            ) {
              attempts++;
              console.log(
                `Trying alternative token ${attempts}/${maxAttempts}:`,
                altToken.substring(0, 20) + "..."
              );

              // Add delay between attempts to avoid rate limiting
              if (attempts > 1) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }

              try {
                const altRequestData = {
                  password_reset_token: altToken,
                  password: password,
                  password_confirmation: passwordConfirmation,
                };

                const altResponse = await apiClient.post<
                  ApiResponse<ConfirmPasswordResetResponse>
                >("/auth/password/reset/confirm", altRequestData);

                console.log("Alternative token worked!");
                return altResponse;
              } catch (altError: any) {
                console.log("Alternative token failed:", altError.message);

                // If we hit rate limiting, stop trying
                if (altError.status === 429) {
                  console.log("Rate limited, stopping alternative attempts");
                  break;
                }
              }
            }
          }
        }
        throw error;
      }
    });
  }
}
