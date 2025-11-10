import {
  apiClient,
  handleApiResponse,
  retryRequest,
  buildQueryParams,
} from "../config";
import {
  ApiResponse,
  PaymentTransaction,
} from "../types";

/**
 * Payments Service
 * Handles all payment-related operations for the WebApp portal
 * Base URL: /api/v1/
 */
export class PaymentsService {
  /**
   * Process payment
   * POST /api/v1/payments/process/
   */
  static async processPayment(data: {
    transaction_id?: string;
    amount: number;
    payment_method: string;
    event_id?: string;
    ticket_ids?: string[];
    payment_details?: Record<string, any>;
  }): Promise<ApiResponse<{
    transaction_id: string;
    status: string;
    amount: number;
  }>> {
    return retryRequest(async () => {
      const response = await apiClient.post("/payments/process/", data);
      const data_response = handleApiResponse(response);
      // Backend returns { transaction_id, status, amount } directly
      return {
        success: true,
        data: data_response as {
          transaction_id: string;
          status: string;
          amount: number;
        },
      };
    });
  }

  /**
   * Confirm payment
   * POST /api/v1/payments/confirm/
   */
  static async confirmPayment(data: {
    transaction_id: string;
    payment_confirmation?: Record<string, any>;
  }): Promise<ApiResponse<{
    message: string;
    transaction: PaymentTransaction;
  }>> {
    return retryRequest(async () => {
      const response = await apiClient.post("/payments/confirm/", data);
      const data_response = handleApiResponse(response);
      // Backend returns { message, transaction } directly
      return {
        success: true,
        data: data_response as {
          message: string;
          transaction: PaymentTransaction;
        },
      };
    });
  }

  /**
   * Get payment status
   * GET /api/v1/payments/:transaction_id/status/
   */
  static async getPaymentStatus(transactionId: string): Promise<{
    transaction_id: string;
    status: "pending" | "completed" | "failed" | "refunded";
    amount: number;
    payment_method: string;
    created_at: string;
    updated_at: string;
  }> {
    return retryRequest(async () => {
      const response = await apiClient.get(`/payments/${transactionId}/status/`);
      return handleApiResponse(response);
    });
  }

  /**
   * Download invoice
   * GET /api/v1/invoices/:transaction_id/
   */
  static async downloadInvoice(transactionId: string): Promise<Blob> {
    return retryRequest(async () => {
      const response = await apiClient.get(`/invoices/${transactionId}/`, {
        responseType: "blob",
      });
      return response.data;
    });
  }

  /**
   * Get user payment history
   * GET /api/v1/users/payment-history/
   */
  static async getPaymentHistory(params?: {
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    items: PaymentTransaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    return retryRequest(async () => {
      const queryString = buildQueryParams(params || {});
      const url = queryString ? `/users/payment-history/?${queryString}` : "/users/payment-history/";
      const response = await apiClient.get(url);
      return handleApiResponse(response);
    });
  }
}

