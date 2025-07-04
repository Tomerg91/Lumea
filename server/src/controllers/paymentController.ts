import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase, serverTables } from '../lib/supabase';
import type { Payment, PaymentInsert, PaymentUpdate, PaymentStatus } from '../../../shared/types/database';

// Validation schemas
const createPaymentSchema = z.object({
  amount: z.number().positive(),
  due_date: z.string().datetime(),
  client_id: z.string().uuid(),
  sessions_covered: z.array(z.string().uuid()).optional(),
  status: z.enum(['Due', 'Paid', 'Overdue', 'Cancelled']).optional(),
});

const updatePaymentSchema = z.object({
  amount: z.number().positive().optional(),
  status: z.enum(['Due', 'Paid', 'Overdue', 'Cancelled']).optional(),
  due_date: z.string().datetime().optional(),
  sessions_covered: z.array(z.string().uuid()).optional(),
});

const batchUpdatePaymentStatusSchema = z.object({
  payment_ids: z.array(z.string().uuid()),
  status: z.enum(['Due', 'Paid', 'Overdue', 'Cancelled']),
});

export const paymentController = {
  // Get all payments for a coach
  getPayments: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { status, client_id, limit, offset } = req.query;

      let query = serverTables.payments()
        .select(`
          *,
          users!payments_client_id_fkey(id, name, email),
          users!payments_coach_id_fkey(id, name, email)
        `)
        .eq('coach_id', req.user.id)
        .order('due_date', { ascending: false });

      // Filter by status if provided
      if (status) {
        query = query.eq('status', status);
      }

      // Filter by client if provided
      if (client_id) {
        query = query.eq('client_id', client_id);
      }

      // Pagination
      if (limit) {
        query = query.limit(parseInt(limit as string));
      }
      if (offset) {
        query = query.range(
          parseInt(offset as string),
          parseInt(offset as string) + parseInt(limit as string || '10') - 1
        );
      }

      const { data: payments, error } = await query;

      if (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
        return;
      }

      res.json(payments);
    } catch (error) {
      console.error('Error in getPayments:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  },

  // Get payment summary for coach dashboard
  getPaymentSummary: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Get payment stats
      const { data: payments, error } = await serverTables.payments()
        .select('*')
        .eq('coach_id', req.user.id);

      if (error) {
        console.error('Error fetching payment summary:', error);
        res.status(500).json({ error: 'Failed to fetch payment summary' });
        return;
      }

      const summary = {
        total_payments: payments.length,
        total_amount: payments.reduce((sum, p) => sum + p.amount, 0),
        paid_amount: payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0),
        overdue_amount: payments.filter(p => p.status === 'Overdue').reduce((sum, p) => sum + p.amount, 0),
        due_amount: payments.filter(p => p.status === 'Due').reduce((sum, p) => sum + p.amount, 0),
        by_status: {
          due: payments.filter(p => p.status === 'Due').length,
          paid: payments.filter(p => p.status === 'Paid').length,
          overdue: payments.filter(p => p.status === 'Overdue').length,
          cancelled: payments.filter(p => p.status === 'Cancelled').length,
        },
      };

      res.json(summary);
    } catch (error) {
      console.error('Error in getPaymentSummary:', error);
      res.status(500).json({ error: 'Failed to fetch payment summary' });
    }
  },

  // Create a new payment
  createPayment: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const validation = createPaymentSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: 'Invalid payment data', details: validation.error.issues });
        return;
      }

      const { amount, due_date, client_id, sessions_covered, status } = validation.data;

      const paymentData: PaymentInsert = {
        amount,
        due_date,
        client_id,
        coach_id: req.user.id.toString(),
        sessions_covered: sessions_covered || [],
        status: status || 'Due',
        reminder_sent: false,
      };

      const { data: payment, error } = await serverTables.payments()
        .insert(paymentData)
        .select(`
          *,
          users!payments_client_id_fkey(id, name, email),
          users!payments_coach_id_fkey(id, name, email)
        `)
        .single();

      if (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ error: 'Failed to create payment' });
        return;
      }

      res.status(201).json({
        message: 'Payment created successfully',
        payment,
      });
    } catch (error) {
      console.error('Error in createPayment:', error);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  },

  // Update payment status
  updatePayment: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const paymentId = req.params.id;
      const validation = updatePaymentSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: 'Invalid payment data', details: validation.error.issues });
        return;
      }

      const updateData: PaymentUpdate = {
        ...validation.data,
        updated_at: new Date().toISOString(),
      };

      const { data: payment, error } = await serverTables.payments()
        .update(updateData)
        .eq('id', paymentId)
        .eq('coach_id', req.user.id) // Ensure coach can only update their own payments
        .select(`
          *,
          users!payments_client_id_fkey(id, name, email),
          users!payments_coach_id_fkey(id, name, email)
        `)
        .single();

      if (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Failed to update payment' });
        return;
      }

      res.json({
        message: 'Payment updated successfully',
        payment,
      });
    } catch (error) {
      console.error('Error in updatePayment:', error);
      res.status(500).json({ error: 'Failed to update payment' });
    }
  },

  // Batch update payment status
  batchUpdatePaymentStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const validation = batchUpdatePaymentStatusSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: 'Invalid batch update data', details: validation.error.issues });
        return;
      }

      const { payment_ids, status } = validation.data;

      const { data: payments, error } = await serverTables.payments()
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .in('id', payment_ids)
        .eq('coach_id', req.user.id) // Ensure coach can only update their own payments
        .select(`
          *,
          users!payments_client_id_fkey(id, name, email),
          users!payments_coach_id_fkey(id, name, email)
        `);

      if (error) {
        console.error('Error batch updating payments:', error);
        res.status(500).json({ error: 'Failed to batch update payments' });
        return;
      }

      res.json({
        message: `Successfully updated ${payments.length} payments to ${status}`,
        payments,
      });
    } catch (error) {
      console.error('Error in batchUpdatePaymentStatus:', error);
      res.status(500).json({ error: 'Failed to batch update payments' });
    }
  },

  // Get client payment history
  getClientPaymentHistory: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const clientId = req.params.clientId;

      const { data: payments, error } = await serverTables.payments()
        .select(`
          *,
          users!payments_client_id_fkey(id, name, email)
        `)
        .eq('client_id', clientId)
        .eq('coach_id', req.user.id)
        .order('due_date', { ascending: false });

      if (error) {
        console.error('Error fetching client payment history:', error);
        res.status(500).json({ error: 'Failed to fetch client payment history' });
        return;
      }

      res.json(payments);
    } catch (error) {
      console.error('Error in getClientPaymentHistory:', error);
      res.status(500).json({ error: 'Failed to fetch client payment history' });
    }
  },

  // Mark sessions as paid
  markSessionsAsPaid: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { session_ids, amount, due_date } = req.body;

      if (!session_ids || !Array.isArray(session_ids) || session_ids.length === 0) {
        res.status(400).json({ error: 'Session IDs are required' });
        return;
      }

      // Get session details to determine client
      const { data: sessions, error: sessionError } = await serverTables.sessions()
        .select('id, client_id, coach_id')
        .in('id', session_ids)
        .eq('coach_id', req.user.id);

      if (sessionError) {
        console.error('Error fetching sessions:', sessionError);
        res.status(500).json({ error: 'Failed to fetch sessions' });
        return;
      }

      if (sessions.length === 0) {
        res.status(404).json({ error: 'No sessions found' });
        return;
      }

      // Ensure all sessions belong to the same client
      const clientIds = [...new Set(sessions.map(s => s.client_id))];
      if (clientIds.length > 1) {
        res.status(400).json({ error: 'All sessions must belong to the same client' });
        return;
      }

      const client_id = clientIds[0];

      // Create payment record
      const paymentData: PaymentInsert = {
        amount: amount || 0,
        due_date: due_date || new Date().toISOString(),
        client_id,
        coach_id: req.user.id.toString(),
        sessions_covered: session_ids,
        status: 'Paid',
        reminder_sent: false,
      };

      const { data: payment, error: paymentError } = await serverTables.payments()
        .insert(paymentData)
        .select(`
          *,
          users!payments_client_id_fkey(id, name, email),
          users!payments_coach_id_fkey(id, name, email)
        `)
        .single();

      if (paymentError) {
        console.error('Error creating payment:', paymentError);
        res.status(500).json({ error: 'Failed to create payment record' });
        return;
      }

      // Update sessions with payment_id
      const { error: updateError } = await serverTables.sessions()
        .update({ payment_id: payment.id, updated_at: new Date().toISOString() })
        .in('id', session_ids);

      if (updateError) {
        console.error('Error updating sessions with payment_id:', updateError);
        res.status(500).json({ error: 'Failed to link sessions to payment' });
        return;
      }

      res.json({
        message: `Successfully marked ${session_ids.length} sessions as paid`,
        payment,
      });
    } catch (error) {
      console.error('Error in markSessionsAsPaid:', error);
      res.status(500).json({ error: 'Failed to mark sessions as paid' });
    }
  },
}; 