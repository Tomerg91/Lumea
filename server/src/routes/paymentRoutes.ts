import express from 'express';
import { paymentController } from '../controllers/paymentController.js';
import { isAuthenticated, isCoach } from '../middleware/auth.js';

const router = express.Router();

// All payment routes require authentication
router.use(isAuthenticated);

// Get all payments for a coach (with filtering and pagination)
router.get('/', isCoach, paymentController.getPayments);

// Get payment summary for coach dashboard
router.get('/summary', isCoach, paymentController.getPaymentSummary);

// Create a new payment
router.post('/', isCoach, paymentController.createPayment);

// Update a payment
router.put('/:id', isCoach, paymentController.updatePayment);

// Batch update payment status
router.post('/batch-update', isCoach, paymentController.batchUpdatePaymentStatus);

// Get payment history for a specific client
router.get('/client/:clientId', isCoach, paymentController.getClientPaymentHistory);

// Mark sessions as paid (convenience endpoint)
router.post('/mark-sessions-paid', isCoach, paymentController.markSessionsAsPaid);

export default router; 