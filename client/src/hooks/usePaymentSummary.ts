import { useSupabaseQuery } from './useSupabase';
import { paymentService } from '../services/paymentService';

export function usePaymentSummary() {
  return useSupabaseQuery(
    ['paymentSummary'],
    () => paymentService.getPaymentSummary().then(data => ({ data, error: null })),
    {
      requireAuth: true,
      realtime: {
        enabled: true,
        table: 'payments',
      },
    }
  );
}
