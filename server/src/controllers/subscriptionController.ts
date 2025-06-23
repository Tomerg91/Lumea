import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { IsraPayService } from '../services/israPayService';
import logger from '../utils/logger';
import * as crypto from 'crypto';

const israPayService = new IsraPayService();

// ====================================
// SUBSCRIPTION PLAN DEFINITIONS
// ====================================

const SUBSCRIPTION_PLANS = {
  seeker: {
    plan_code: 'seeker',
    plan_name: 'Seeker Coach',
    amount_ils: 5900, // ₪59 in agorot
    client_limit: 10,
    includes_guided_audio: false,
    includes_workshops: false,
    includes_priority_support: false,
    features: ['Basic coaching features', 'Standard session management', 'Basic reporting']
  },
  explorer: {
    plan_code: 'explorer',
    plan_name: 'Explorer Coach', 
    amount_ils: 18900, // ₪189 in agorot
    client_limit: 30,
    includes_guided_audio: true,
    includes_workshops: false,
    includes_priority_support: false,
    features: ['All Seeker features', 'Guided audio sessions', 'Enhanced reporting', 'Priority email support']
  },
  navigator: {
    plan_code: 'navigator',
    plan_name: 'Navigator Coach',
    amount_ils: 22000, // ₪220 in agorot
    client_limit: 999999, // Unlimited
    includes_guided_audio: true,
    includes_workshops: true,
    includes_priority_support: true,
    features: ['All Explorer features', 'Workshop hosting', 'Priority phone/chat support', 'Advanced analytics', 'White-label options']
  }
};

// ====================================
// SUBSCRIPTION CONTROLLER
// ====================================

export const subscriptionController = {
  // Get current subscription for authenticated coach
  getCurrentSubscription: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Only coaches can access subscriptions' });
      }

      const { data: subscription, error } = await supabase
        .from('coach_subscriptions')
        .select(`
          *,
          subscription_plans:plan_code (
            plan_name,
            description,
            features
          )
        `)
        .eq('coach_id', req.user.id)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching subscription:', error);
        return res.status(500).json({ error: 'Failed to fetch subscription' });
      }

      // If no subscription, return trial information
      if (!subscription) {
        return res.json({
          hasSubscription: false,
          trialAvailable: true,
          plans: Object.values(SUBSCRIPTION_PLANS)
        });
      }

      return res.json({
        hasSubscription: true,
        subscription,
        plans: Object.values(SUBSCRIPTION_PLANS)
      });

    } catch (error) {
      logger.error('Error in getCurrentSubscription:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create new subscription
  createSubscription: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Only coaches can create subscriptions' });
      }

      const { planCode, paymentMethod, provider } = req.body;

      // Validate plan code
      if (!SUBSCRIPTION_PLANS[planCode as keyof typeof SUBSCRIPTION_PLANS]) {
        return res.status(400).json({ error: 'Invalid plan code' });
      }

      const plan = SUBSCRIPTION_PLANS[planCode as keyof typeof SUBSCRIPTION_PLANS];

      // Check if coach already has an active subscription
      const { data: existingSubscription } = await supabase
        .from('coach_subscriptions')
        .select('id, status')
        .eq('coach_id', req.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingSubscription) {
        return res.status(400).json({ error: 'Coach already has an active subscription' });
      }

      // Create subscription with Israeli payment provider
      const subscriptionRequest = {
        coachId: req.user.id as string,
        planCode,
        paymentMethod,
        provider,
        amount: plan.amount_ils,
        currency: 'ILS',
        billingCycle: 'monthly' as const
      };

      const paymentResult = await israPayService.createSubscription(subscriptionRequest);

      if (!paymentResult.success) {
        return res.status(400).json({ 
          error: 'Payment failed', 
          details: paymentResult.error 
        });
      }

      // Calculate subscription dates
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days trial
      const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Create subscription record in database
      const { data: subscription, error } = await supabase
        .from('coach_subscriptions')
        .insert({
          coach_id: req.user.id,
          plan_code: planCode,
          plan_name: plan.plan_name,
          status: 'trial',
          amount_ils: plan.amount_ils,
          currency: 'ILS',
          billing_cycle: 'monthly',
          isra_pay_subscription_id: paymentResult.subscriptionId,
          payment_processor: provider,
          payment_method_token: paymentResult.paymentMethodToken,
          trial_start: now.toISOString(),
          trial_end: trialEnd.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          next_billing_date: paymentResult.nextBillingDate?.toISOString() || trialEnd.toISOString(),
          client_limit: plan.client_limit,
          includes_guided_audio: plan.includes_guided_audio,
          includes_workshops: plan.includes_workshops,
          includes_priority_support: plan.includes_priority_support,
          metadata: {
            transactionId: paymentResult.transactionId,
            features: plan.features
          }
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating subscription record:', error);
        return res.status(500).json({ error: 'Failed to create subscription record' });
      }

      // Log subscription event
      await supabase
        .from('subscription_events')
        .insert({
          subscription_id: subscription.id,
          event_type: 'created',
          event_data: {
            plan_code: planCode,
            provider,
            transaction_id: paymentResult.transactionId
          },
          isra_pay_event_id: paymentResult.transactionId,
          payment_processor: provider,
          processed: true,
          processed_at: new Date().toISOString()
        });

      return res.status(201).json({
        success: true,
        subscription,
        message: `Successfully created ${plan.plan_name} subscription with 14-day free trial`
      });

    } catch (error) {
      logger.error('Error in createSubscription:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Cancel subscription
  cancelSubscription: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Only coaches can cancel subscriptions' });
      }

      // Get current subscription
      const { data: subscription, error } = await supabase
        .from('coach_subscriptions')
        .select('*')
        .eq('coach_id', req.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        logger.error('Error fetching subscription:', error);
        return res.status(500).json({ error: 'Failed to fetch subscription' });
      }

      if (!subscription) {
        return res.status(404).json({ error: 'No active subscription found' });
      }

      // Cancel with payment provider
      const cancellationResult = await israPayService.cancelSubscription(
        subscription.isra_pay_subscription_id,
        subscription.payment_processor
      );

      if (!cancellationResult) {
        return res.status(500).json({ error: 'Failed to cancel subscription with payment provider' });
      }

      // Update subscription status
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('coach_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', subscription.id)
        .select()
        .single();

      if (updateError) {
        logger.error('Error updating subscription:', updateError);
        return res.status(500).json({ error: 'Failed to update subscription status' });
      }

      // Log cancellation event
      await supabase
        .from('subscription_events')
        .insert({
          subscription_id: subscription.id,
          event_type: 'cancelled',
          event_data: {
            cancelled_by: 'coach',
            reason: req.body.reason || 'No reason provided'
          },
          payment_processor: subscription.payment_processor,
          processed: true,
          processed_at: new Date().toISOString()
        });

      return res.json({
        success: true,
        subscription: updatedSubscription,
        message: 'Subscription cancelled successfully'
      });

    } catch (error) {
      logger.error('Error in cancelSubscription:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Upgrade/downgrade subscription
  changeSubscription: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Only coaches can change subscriptions' });
      }

      const { newPlanCode } = req.body;

      // Validate new plan code
      if (!SUBSCRIPTION_PLANS[newPlanCode as keyof typeof SUBSCRIPTION_PLANS]) {
        return res.status(400).json({ error: 'Invalid plan code' });
      }

      const newPlan = SUBSCRIPTION_PLANS[newPlanCode as keyof typeof SUBSCRIPTION_PLANS];

      // Get current subscription
      const { data: subscription, error } = await supabase
        .from('coach_subscriptions')
        .select('*')
        .eq('coach_id', req.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        logger.error('Error fetching subscription:', error);
        return res.status(500).json({ error: 'Failed to fetch subscription' });
      }

      if (!subscription) {
        return res.status(404).json({ error: 'No active subscription found' });
      }

      if (subscription.plan_code === newPlanCode) {
        return res.status(400).json({ error: 'Already subscribed to this plan' });
      }

      // Update subscription
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('coach_subscriptions')
        .update({
          plan_code: newPlanCode,
          plan_name: newPlan.plan_name,
          amount_ils: newPlan.amount_ils,
          client_limit: newPlan.client_limit,
          includes_guided_audio: newPlan.includes_guided_audio,
          includes_workshops: newPlan.includes_workshops,
          includes_priority_support: newPlan.includes_priority_support,
          metadata: {
            ...subscription.metadata,
            features: newPlan.features,
            previous_plan: subscription.plan_code,
            changed_at: new Date().toISOString()
          }
        })
        .eq('id', subscription.id)
        .select()
        .single();

      if (updateError) {
        logger.error('Error updating subscription:', updateError);
        return res.status(500).json({ error: 'Failed to update subscription' });
      }

      // Log plan change event
      await supabase
        .from('subscription_events')
        .insert({
          subscription_id: subscription.id,
          event_type: subscription.amount_ils < newPlan.amount_ils ? 'upgraded' : 'downgraded',
          event_data: {
            from_plan: subscription.plan_code,
            to_plan: newPlanCode,
            changed_by: 'coach'
          },
          payment_processor: subscription.payment_processor,
          processed: true,
          processed_at: new Date().toISOString()
        });

      return res.json({
        success: true,
        subscription: updatedSubscription,
        message: `Successfully ${subscription.amount_ils < newPlan.amount_ils ? 'upgraded' : 'downgraded'} to ${newPlan.plan_name}`
      });

    } catch (error) {
      logger.error('Error in changeSubscription:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Handle webhook events from Israeli payment providers
  handleWebhook: async (req: Request, res: Response) => {
    const signature = req.headers['x-israpay-signature'] as string;
    const provider = req.query.provider as string;
    const rawBody = req.body;

    if (!provider || !israPayService.getWebhookSecret(provider)) {
      logger.warn('Webhook received for unsupported provider or provider not configured:', provider);
      return res.status(400).send('Unsupported or unconfigured provider.');
    }

    try {
      const isValid = israPayService.verifyWebhook(provider, rawBody.toString(), signature);
      if (!isValid) {
        logger.warn('Invalid webhook signature received for provider:', provider);
        return res.status(401).send('Webhook Error: Invalid signature');
      }
    } catch (err) {
      logger.error('Webhook signature verification failed with error:', err);
      return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    const event = JSON.parse(rawBody.toString());

    // Log the raw event for auditing
    const { data: eventLog, error: logError } = await supabase
      .from('subscription_events')
      .insert({
        event_type: event.type,
        event_data: event,
        isra_pay_event_id: event.id,
        payment_processor: provider,
        status: 'received',
      })
      .select()
      .single();

    if (logError || !eventLog) {
      logger.error('Failed to log incoming webhook event:', logError);
      // We don't return here because we should still try to process the event
    }

    try {
      await israPayService.processWebhookEvent(event);
      
      if(eventLog) {
        await supabase.from('subscription_events').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', eventLog.id);
      }
      
      res.status(200).json({ received: true });

    } catch (error) {
      logger.error(`Error processing webhook event ${event.id} from ${provider}:`, error);
      if(eventLog) {
        await supabase.from('subscription_events').update({ status: 'failed', error_message: error instanceof Error ? error.message : 'Unknown error' }).eq('id', eventLog.id);
      }
      res.status(500).json({ error: 'Failed to process webhook event' });
    }
  },

  // Get subscription analytics for coach
  getSubscriptionAnalytics: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Only coaches can access analytics' });
      }

      // Get subscription details
      const { data: subscription } = await supabase
        .from('coach_subscriptions')
        .select('*')
        .eq('coach_id', req.user.id)
        .maybeSingle();

      // Get client count
      const { count: clientCount } = await supabase
        .from('client_links')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', req.user.id)
        .eq('status', 'active');

      // Get subscription events
      const { data: events } = await supabase
        .from('subscription_events')
        .select('*')
        .eq('subscription_id', subscription?.id || '')
        .order('created_at', { ascending: false })
        .limit(10);

      return res.json({
        subscription,
        analytics: {
          client_count: clientCount || 0,
          client_limit: subscription?.client_limit || 0,
          utilization_percentage: subscription?.client_limit 
            ? Math.round(((clientCount || 0) / subscription.client_limit) * 100)
            : 0,
          recent_events: events || []
        }
      });

    } catch (error) {
      logger.error('Error in getSubscriptionAnalytics:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Generate invitation token for client
  generateClientInvitation: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Only coaches can generate invitations' });
      }

      const { clientEmail, notes } = req.body;

      if (!clientEmail || !clientEmail.includes('@')) {
        return res.status(400).json({ error: 'Valid email address is required' });
      }

      // Check subscription and client limits
      const { data: subscription } = await supabase
        .from('coach_subscriptions')
        .select('client_limit, status')
        .eq('coach_id', req.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!subscription) {
        return res.status(403).json({ error: 'Active subscription required to invite clients' });
      }

      const { count: currentClientCount } = await supabase
        .from('client_links')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', req.user.id)
        .eq('status', 'active');

      if ((currentClientCount || 0) >= subscription.client_limit) {
        return res.status(400).json({ 
          error: 'Client limit reached for your subscription plan',
          currentCount: currentClientCount,
          limit: subscription.client_limit
        });
      }

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation record
      const { data: invitation, error } = await supabase
        .from('client_links')
        .insert({
          coach_id: req.user.id,
          invitation_token: invitationToken,
          invitation_email: clientEmail,
          invitation_sent_at: new Date().toISOString(),
          invitation_expires_at: expiresAt.toISOString(),
          status: 'pending',
          notes
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating invitation:', error);
        return res.status(500).json({ error: 'Failed to create invitation' });
      }

      // Generate invitation URL
      const invitationUrl = `${process.env.CLIENT_URL}/accept-invitation?token=${invitationToken}`;

      return res.status(201).json({
        success: true,
        invitation: {
          ...invitation,
          invitation_url: invitationUrl
        },
        message: 'Invitation created successfully'
      });

    } catch (error) {
      logger.error('Error in generateClientInvitation:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Invite client (coach only)
  inviteClient: async (req: Request, res: Response) => {
    // Implementation of inviteClient method
  }
}; 