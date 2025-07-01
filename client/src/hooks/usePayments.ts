import { useSupabaseQuery } from './useSupabase';
import { paymentService } from '../services/paymentService';

export const usePayments = () => {
  return useSupabaseQuery(
    ['payments'],
    () => paymentService.getPayments().then(data => ({ data, error: null })),
    {
      requireAuth: true,
    }
  );
};
