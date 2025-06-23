import express from 'express';
import { subscriptionController } from '../controllers/subscriptionController';
import { supabaseAuth } from '../middleware/supabaseAuth';

const router = express.Router();

// ====================================
// SUBSCRIPTION ROUTES
// ====================================

// Get current coach subscription
router.get('/current', supabaseAuth, subscriptionController.getCurrentSubscription);

// Create new subscription
router.post('/create', supabaseAuth, subscriptionController.createSubscription);

// Cancel subscription
router.post('/cancel', supabaseAuth, subscriptionController.cancelSubscription);

// Upgrade/downgrade subscription
router.post('/change-plan', supabaseAuth, subscriptionController.changeSubscription);

// Get subscription analytics
router.get('/analytics', supabaseAuth, subscriptionController.getSubscriptionAnalytics);

// ====================================
// CLIENT INVITATION ROUTES
// ====================================

// Generate client invitation (coach only)
router.post('/invite-client', supabaseAuth, subscriptionController.generateClientInvitation);

// ====================================
// WEBHOOK ROUTES
// ====================================

// Israeli payment provider webhooks (no auth middleware)
// The provider is passed as a query param, e.g., /webhook?provider=tranzila
router.post('/webhook', subscriptionController.handleWebhook);

export default router; 