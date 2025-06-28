import { useSupabaseQuery } from './useSupabase';
import { paymentService } from '../services/paymentService';
import type { PaymentStatus } from '../../../../shared/types/database';

export function usePayments(filters: { status?: PaymentStatus | 'all'; client_id?: string | 'all' }) {
  const { status = 'all', client_id = 'all' } = filters;

  return useSupabaseQuery(
    ['payments', { status, client_id }],
    () => {
      const params: any = {};
      if (status !== 'all') params.status = status;
      if (client_id !== 'all') params.client_id = client_id;
      return paymentService.getPayments(params);
    },
    {
      requireAuth: true,
      realtime: {
        enabled: true,
        table: 'payments',
      },
    }
  );
}
