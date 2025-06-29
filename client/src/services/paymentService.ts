import { API_BASE_URL } from '../lib/api';
import type { Payment, PaymentInsert, PaymentUpdate, PaymentStatus } from '../../../shared/types/database';

// Extended types for API responses
interface PaymentWithRelations extends Payment {
  client?: {
    id: string;
    name: string | null;
    email: string;
  };
  coach?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface PaymentSummary {
  total_payments: number;
  total_amount: number;
  paid_amount: number;
  overdue_amount: number;
  due_amount: number;
  by_status: {
    due: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
}

interface BatchUpdatePaymentStatusRequest {
  payment_ids: string[];
  status: PaymentStatus;
}

interface MarkSessionsPaidRequest {
  session_ids: string[];
  amount: number;
  due_date?: string;
}

export const paymentService = {
  // Get all payments with optional filters
  async getPayments(params?: {
    status?: PaymentStatus;
    client_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaymentWithRelations[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.client_id) searchParams.append('client_id', params.client_id);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const response = await fetch(`${API_BASE_URL}/payments?${searchParams.toString()}`, createFetchConfig());
    if (!response.ok) throw new Error('Failed to fetch payments');
    return response.json();
  },

  // Get payment summary for dashboard
  async getPaymentSummary(): Promise<PaymentSummary> {
    const response = await fetch(`${API_BASE_URL}/payments/summary`, createFetchConfig());
    if (!response.ok) throw new Error('Failed to fetch payment summary');
    return response.json();
  },

  // Create a new payment
  async createPayment(data: PaymentInsert): Promise<PaymentWithRelations> {
    const response = await fetch(`${API_BASE_URL}/payments`, createFetchConfig({
      method: 'POST',
      body: JSON.stringify(data),
    }));
    if (!response.ok) throw new Error('Failed to create payment');
    const result = await response.json();
    return result.payment;
  },

  // Update a payment
  async updatePayment(id: string, data: PaymentUpdate): Promise<PaymentWithRelations> {
    const response = await fetch(`${API_BASE_URL}/payments/${id}`, createFetchConfig({
      method: 'PUT',
      body: JSON.stringify(data),
    }));
    if (!response.ok) throw new Error('Failed to update payment');
    const result = await response.json();
    return result.payment;
  },

  // Batch update payment status
  async batchUpdatePaymentStatus(data: BatchUpdatePaymentStatusRequest): Promise<PaymentWithRelations[]> {
    const response = await fetch(`${API_BASE_URL}/payments/batch-update`, createFetchConfig({
      method: 'POST',
      body: JSON.stringify(data),
    }));
    if (!response.ok) throw new Error('Failed to batch update payments');
    const result = await response.json();
    return result.payments;
  },

  // Get payment history for a specific client
  async getClientPaymentHistory(clientId: string): Promise<PaymentWithRelations[]> {
    const response = await fetch(`${API_BASE_URL}/payments/client/${clientId}`, createFetchConfig());
    if (!response.ok) throw new Error('Failed to fetch client payment history');
    return response.json();
  },

  // Mark sessions as paid (convenience method)
  async markSessionsAsPaid(data: MarkSessionsPaidRequest): Promise<PaymentWithRelations> {
    const response = await fetch(`${API_BASE_URL}/payments/mark-sessions-paid`, createFetchConfig({
      method: 'POST',
      body: JSON.stringify(data),
    }));
    if (!response.ok) throw new Error('Failed to mark sessions as paid');
    const result = await response.json();
    return result.payment;
  },

  // Update payment status (convenience method)
  async updatePaymentStatus(id: string, status: PaymentStatus): Promise<PaymentWithRelations> {
    return this.updatePayment(id, { status });
  },

  // Get overdue payments
  async getOverduePayments(): Promise<PaymentWithRelations[]> {
    return this.getPayments({ status: 'Overdue' });
  },

  // Get due payments
  async getDuePayments(): Promise<PaymentWithRelations[]> {
    return this.getPayments({ status: 'Due' });
  },

  // Get paid payments
  async getPaidPayments(): Promise<PaymentWithRelations[]> {
    return this.getPayments({ status: 'Paid' });
  },
}; 