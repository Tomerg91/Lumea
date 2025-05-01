export type PaymentStatus = 'Paid' | 'Due';

export interface Payment {
  id: string;
  clientId: string;
  coachId: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  reminderSent: boolean;
  sessionsCovered: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  clientId: string;
  amount: number;
  dueDate: string;
  sessionsCovered: string[];
}

export interface UpdatePaymentDto {
  amount?: number;
  dueDate?: string;
  status?: PaymentStatus;
  reminderSent?: boolean;
  sessionsCovered?: string[];
}
