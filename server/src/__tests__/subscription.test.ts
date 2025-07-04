import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { subscriptionController } from '../controllers/subscriptionController.js';
import { IsraPayService } from '../services/israPayService.js';
import { supabase } from '../lib/supabase.js';

// Mock the dependencies
jest.mock('../services/israPayService');
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockIsraPayService = new (IsraPayService as jest.Mock<IsraPayService>)() as jest.Mocked<IsraPayService>;

describe('Subscription Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { id: 'coach-123', role: 'coach' },
      body: {},
      query: {},
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  // Reusable mock setup for Supabase queries
  const setupSupabaseMock = (tableName: string) => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
    };
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === tableName) {
            return mockQueryBuilder;
        }
        return { // a default mock for other tables
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({data: {}, error: null})
        }
    });
    return mockQueryBuilder;
  };

  describe('getCurrentSubscription', () => {
    it('should return trial info if no subscription exists', async () => {
      const mockQuery = setupSupabaseMock('coach_subscriptions');
      (mockQuery.maybeSingle as jest.Mock).mockResolvedValue({ data: null, error: null });

      await subscriptionController.getCurrentSubscription(req as Request, res as Response);
      
      expect(supabase.from).toHaveBeenCalledWith('coach_subscriptions');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ hasSubscription: false }));
    });

    it('should return subscription details if one exists', async () => {
        const mockSubscription = { id: 'sub-456', status: 'active' };
        const mockQuery = setupSupabaseMock('coach_subscriptions');
        (mockQuery.maybeSingle as jest.Mock).mockResolvedValue({ data: mockSubscription, error: null });
  
        await subscriptionController.getCurrentSubscription(req as Request, res as Response);
        
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ hasSubscription: true, subscription: mockSubscription }));
    });
  });

  describe('createSubscription', () => {
    it('should create a new subscription successfully', async () => {
      req.body = { planCode: 'seeker', paymentMethod: {}, provider: 'tranzila' };
      
      const paymentResult = { success: true, subscriptionId: 'israpay-sub-1', transactionId: 'txn-1', paymentMethodToken: 'tok_123', nextBillingDate: new Date() };
      mockIsraPayService.createSubscription.mockResolvedValue(paymentResult);

      const dbSubscription = { id: 'db-sub-1', ...paymentResult };
      const mockSubQuery = setupSupabaseMock('coach_subscriptions');
      (mockSubQuery.maybeSingle as jest.Mock).mockResolvedValue({ data: null, error: null });
      (mockSubQuery.insert as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: dbSubscription, error: null }),
      });
      setupSupabaseMock('subscription_events');


      await subscriptionController.createSubscription(req as Request, res as Response);

      expect(mockIsraPayService.createSubscription).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('coach_subscriptions');
      expect(supabase.from).toHaveBeenCalledWith('subscription_events');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, subscription: dbSubscription }));
    });
  });
  
  describe('handleWebhook', () => {
    it('should verify and process a valid webhook', async () => {
      req.headers['x-israpay-signature'] = 'valid-signature';
      req.query.provider = 'tranzila';
      req.body = Buffer.from(JSON.stringify({ id: 'evt-1', type: 'charge.succeeded' }));

      mockIsraPayService.verifyWebhook.mockReturnValue(true);

      const mockEventQuery = setupSupabaseMock('subscription_events');
      (mockEventQuery.insert as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null })
      });

      await subscriptionController.handleWebhook(req as Request, res as Response);

      expect(mockIsraPayService.verifyWebhook).toHaveBeenCalled();
      expect(mockIsraPayService.processWebhookEvent).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should reject a webhook with an invalid signature', async () => {
        req.headers['x-israpay-signature'] = 'invalid-signature';
        req.query.provider = 'tranzila';
        req.body = Buffer.from(JSON.stringify({ id: 'evt-1' }));
  
        mockIsraPayService.verifyWebhook.mockReturnValue(false);
  
        await subscriptionController.handleWebhook(req as Request, res as Response);
  
        expect(mockIsraPayService.verifyWebhook).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith('Webhook Error: Invalid signature');
    });
  });
}); 