import * as crypto from 'crypto';
import axios from 'axios';
import logger from '../utils/logger.js';
import supabase from '../lib/supabase.js';

// ====================================
// TYPES AND INTERFACES
// ====================================

export interface PaymentProvider {
  id: 'tranzila' | 'cardcom' | 'payplus' | 'meshulam';
  name: string;
  isActive: boolean;
  config: {
    apiUrl: string;
    supplier?: string;
    terminal?: string;
    username?: string;
    password?: string;
    apiKey?: string;
  };
}

export interface PaymentMethod {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderName: string;
  holderId: string; // Israeli ID
  email: string;
  phone?: string;
}

export interface SubscriptionRequest {
  coachId: string;
  planCode: 'seeker' | 'explorer' | 'navigator';
  paymentMethod: PaymentMethod;
  provider: PaymentProvider['id'];
  amount: number; // in agorot
  currency: string;
  billingCycle: 'monthly' | 'yearly';
}

export interface SubscriptionResponse {
  success: boolean;
  subscriptionId?: string;
  paymentMethodToken?: string;
  error?: string;
  transactionId?: string;
  nextBillingDate?: Date;
}

export interface WebhookEvent {
  provider: PaymentProvider['id'];
  eventType: string;
  subscriptionId: string;
  eventData: any;
  signature?: string;
  timestamp: Date;
}

// ====================================
// ISRAELI PAYMENT SERVICE CLASS
// ====================================

export class IsraPayService {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Tranzila Configuration
    this.providers.set('tranzila', {
      id: 'tranzila',
      name: 'Tranzila',
      isActive: !!process.env.TRANZILA_SUPPLIER,
      config: {
        apiUrl: 'https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi',
        supplier: process.env.TRANZILA_SUPPLIER,
        username: process.env.TRANZILA_USERNAME,
        password: process.env.TRANZILA_PASSWORD,
      },
    });

    // Cardcom Configuration
    this.providers.set('cardcom', {
      id: 'cardcom',
      name: 'Cardcom',
      isActive: !!process.env.CARDCOM_TERMINAL,
      config: {
        apiUrl: 'https://secure.cardcom.solutions/Interface/LowProfile.aspx',
        terminal: process.env.CARDCOM_TERMINAL,
        username: process.env.CARDCOM_USERNAME,
        password: process.env.CARDCOM_PASSWORD,
      },
    });

    // PayPlus Configuration
    this.providers.set('payplus', {
      id: 'payplus',
      name: 'PayPlus',
      isActive: !!process.env.PAYPLUS_API_KEY,
      config: {
        apiUrl: 'https://restapi.payplus.co.il/api/v1.0',
        apiKey: process.env.PAYPLUS_API_KEY,
      },
    });

    // Meshulam Configuration
    this.providers.set('meshulam', {
      id: 'meshulam',
      name: 'Meshulam',
      isActive: !!process.env.MESHULAM_API_KEY,
      config: {
        apiUrl: 'https://gateway.meshulam.co.il/api',
        apiKey: process.env.MESHULAM_API_KEY,
      },
    });
  }

  public getWebhookSecret(provider: string): string | undefined {
    switch(provider) {
      case 'tranzila': return process.env.TRANZILA_WEBHOOK_SECRET;
      case 'cardcom': return process.env.CARDCOM_WEBHOOK_SECRET;
      case 'payplus': return process.env.PAYPLUS_WEBHOOK_SECRET;
      case 'meshulam': return process.env.MESHULAM_WEBHOOK_SECRET;
      default: return undefined;
    }
  }

  public verifyWebhook(provider: string, payload: string, signature: string): boolean {
    const secret = this.getWebhookSecret(provider);
    if (!secret) {
      logger.warn(`No webhook secret configured for provider: ${provider}`);
      return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(payload).digest('hex'), 'utf8');
    const receivedSignature = Buffer.from(signature, 'utf8');
    
    return crypto.timingSafeEqual(digest, receivedSignature);
  }

  // ====================================
  // SUBSCRIPTION MANAGEMENT
  // ====================================

  async createSubscription(request: SubscriptionRequest): Promise<SubscriptionResponse> {
    try {
      const provider = this.providers.get(request.provider);
      if (!provider || !provider.isActive) {
        throw new Error(`Provider ${request.provider} is not available`);
      }

      logger.info(`Creating subscription with ${request.provider}`, {
        coachId: request.coachId,
        planCode: request.planCode,
        amount: request.amount,
      });

      switch (request.provider) {
        case 'tranzila':
          return await this.createTranzilaSubscription(request, provider);
        case 'cardcom':
          return await this.createCardcomSubscription(request, provider);
        case 'payplus':
          return await this.createPayPlusSubscription(request, provider);
        case 'meshulam':
          return await this.createMeshulamSubscription(request, provider);
        default:
          throw new Error(`Unsupported provider: ${request.provider}`);
      }
    } catch (error) {
      logger.error('Failed to create subscription', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async cancelSubscription(subscriptionId: string, provider: PaymentProvider['id']): Promise<boolean> {
    try {
      const providerConfig = this.providers.get(provider);
      if (!providerConfig || !providerConfig.isActive) {
        throw new Error(`Provider ${provider} is not available`);
      }

      switch (provider) {
        case 'tranzila':
          return await this.cancelTranzilaSubscription(subscriptionId, providerConfig);
        case 'cardcom':
          return await this.cancelCardcomSubscription(subscriptionId, providerConfig);
        case 'payplus':
          return await this.cancelPayPlusSubscription(subscriptionId, providerConfig);
        case 'meshulam':
          return await this.cancelMeshulamSubscription(subscriptionId, providerConfig);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Failed to cancel subscription', error);
      return false;
    }
  }

  // ====================================
  // TRANZILA INTEGRATION
  // ====================================

  private async createTranzilaSubscription(request: SubscriptionRequest, provider: PaymentProvider): Promise<SubscriptionResponse> {
    const { config } = provider;
    const { paymentMethod, amount, coachId, planCode } = request;

    // Generate unique transaction ID
    const tranzilaTransactionId = `TM_${coachId}_${planCode}_${Date.now()}`;

    const requestData = {
      supplier: config.supplier,
      sum: (amount / 100).toFixed(2), // Convert agorot to shekels
      currency: '1', // 1 = ILS
      ccno: paymentMethod.cardNumber.replace(/\s/g, ''),
      expdate: `${paymentMethod.expiryMonth}${paymentMethod.expiryYear}`,
      cvv: paymentMethod.cvv,
      myid: paymentMethod.holderId,
      contact: paymentMethod.holderName,
      email: paymentMethod.email,
      phone: paymentMethod.phone || '',
      tranmode: 'AK', // Authorization + Capture
      response: 'xml',
      cred_type: '1', // Credit card
      recurring: 'true', // Enable recurring payments
      recurring_id: tranzilaTransactionId,
      recurring_sum: (amount / 100).toFixed(2),
      recurring_currency: '1',
      recurring_frequency: request.billingCycle === 'monthly' ? '30' : '365',
    };

    try {
      const response = await axios.post(config.apiUrl, new URLSearchParams(requestData), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000,
      });

      const responseText = response.data;
      logger.info('Tranzila response received', { responseText });

      // Parse Tranzila XML response
      const isSuccess = responseText.includes('<Response>000</Response>');
      const confirmationCode = this.extractXmlValue(responseText, 'ConfirmationCode');
      const errorMessage = this.extractXmlValue(responseText, 'ErrorMessage');

      if (isSuccess && confirmationCode) {
        return {
          success: true,
          subscriptionId: tranzilaTransactionId,
          paymentMethodToken: confirmationCode,
          transactionId: confirmationCode,
          nextBillingDate: this.calculateNextBillingDate(request.billingCycle),
        };
      } else {
        return {
          success: false,
          error: errorMessage || 'Tranzila transaction failed',
        };
      }
    } catch (error) {
      logger.error('Tranzila API error', error);
      throw new Error('Tranzila payment processing failed');
    }
  }

  private async cancelTranzilaSubscription(subscriptionId: string, provider: PaymentProvider): Promise<boolean> {
    // Tranzila subscription cancellation
    const requestData = {
      supplier: provider.config.supplier,
      recurring_id: subscriptionId,
      recurring_command: 'cancel',
      response: 'xml',
    };

    try {
      const response = await axios.post(provider.config.apiUrl, new URLSearchParams(requestData), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data.includes('<Response>000</Response>');
    } catch (error) {
      logger.error('Tranzila cancellation error', error);
      return false;
    }
  }

  // ====================================
  // CARDCOM INTEGRATION
  // ====================================

  private async createCardcomSubscription(request: SubscriptionRequest, provider: PaymentProvider): Promise<SubscriptionResponse> {
    const { config } = provider;
    const { paymentMethod, amount, coachId, planCode } = request;

    const invoiceId = `TM_${coachId}_${planCode}_${Date.now()}`;

    const requestData = {
      TerminalNumber: config.terminal,
      UserName: config.username,
      APILevel: '10',
      Operation: '2', // Charge
      Currency: '1', // ILS
      Sum: (amount / 100).toFixed(2),
      CardNumber: paymentMethod.cardNumber.replace(/\s/g, ''),
      CardExpiration: `${paymentMethod.expiryMonth}${paymentMethod.expiryYear}`,
      CardCVV: paymentMethod.cvv,
      CardHolderName: paymentMethod.holderName,
      CardHolderID: paymentMethod.holderId,
      InvoiceID: invoiceId,
      Language: 'he',
      IsRecurring: 'true',
      RecurringType: request.billingCycle === 'monthly' ? '1' : '2',
    };

    try {
      const response = await axios.post(config.apiUrl, new URLSearchParams(requestData), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000,
      });

      const responseData = response.data;
      logger.info('Cardcom response received', { responseData });

      if (responseData.ResponseCode === '0') {
        return {
          success: true,
          subscriptionId: responseData.InternalDealNumber,
          paymentMethodToken: responseData.CardToken,
          transactionId: responseData.DealNumber,
          nextBillingDate: this.calculateNextBillingDate(request.billingCycle),
        };
      } else {
        return {
          success: false,
          error: responseData.Description || 'Cardcom transaction failed',
        };
      }
    } catch (error) {
      logger.error('Cardcom API error', error);
      throw new Error('Cardcom payment processing failed');
    }
  }

  private async cancelCardcomSubscription(subscriptionId: string, provider: PaymentProvider): Promise<boolean> {
    // Cardcom subscription cancellation logic
    const requestData = {
      TerminalNumber: provider.config.terminal,
      UserName: provider.config.username,
      APILevel: '10',
      Operation: '3', // Cancel recurring
      InternalDealNumber: subscriptionId,
    };

    try {
      const response = await axios.post(provider.config.apiUrl, new URLSearchParams(requestData), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data.ResponseCode === '0';
    } catch (error) {
      logger.error('Cardcom cancellation error', error);
      return false;
    }
  }

  // ====================================
  // PAYPLUS INTEGRATION
  // ====================================

  private async createPayPlusSubscription(request: SubscriptionRequest, provider: PaymentProvider): Promise<SubscriptionResponse> {
    const { config } = provider;
    const { paymentMethod, amount, coachId, planCode } = request;

    const requestData = {
      amount: amount / 100, // Convert agorot to shekels
      currency_code: 'ILS',
      customer: {
        customer_name: paymentMethod.holderName,
        email: paymentMethod.email,
        phone: paymentMethod.phone,
        national_id: paymentMethod.holderId,
      },
      credit_card: {
        number: paymentMethod.cardNumber.replace(/\s/g, ''),
        expiry_month: paymentMethod.expiryMonth,
        expiry_year: paymentMethod.expiryYear,
        cvv: paymentMethod.cvv,
      },
      recurring: {
        type: request.billingCycle === 'monthly' ? 'monthly' : 'yearly',
        interval: 1,
      },
      reference_number: `TM_${coachId}_${planCode}_${Date.now()}`,
    };

    try {
      const response = await axios.post(
        `${config.apiUrl}/PaymentPages/generateLink`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const responseData = response.data;
      logger.info('PayPlus response received', { responseData });

      if (responseData.status === 'success') {
        return {
          success: true,
          subscriptionId: responseData.payment_id,
          paymentMethodToken: responseData.token,
          transactionId: responseData.transaction_id,
          nextBillingDate: this.calculateNextBillingDate(request.billingCycle),
        };
      } else {
        return {
          success: false,
          error: responseData.message || 'PayPlus transaction failed',
        };
      }
    } catch (error) {
      logger.error('PayPlus API error', error);
      throw new Error('PayPlus payment processing failed');
    }
  }

  private async cancelPayPlusSubscription(subscriptionId: string, provider: PaymentProvider): Promise<boolean> {
    try {
      const response = await axios.delete(
        `${provider.config.apiUrl}/recurring/${subscriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${provider.config.apiKey}`,
          },
        }
      );

      return response.data.status === 'success';
    } catch (error) {
      logger.error('PayPlus cancellation error', error);
      return false;
    }
  }

  // ====================================
  // MESHULAM INTEGRATION
  // ====================================

  private async createMeshulamSubscription(request: SubscriptionRequest, provider: PaymentProvider): Promise<SubscriptionResponse> {
    const { config } = provider;
    const { paymentMethod, amount, coachId, planCode } = request;

    const requestData = {
      pageCode: process.env.MESHULAM_PAGE_CODE,
      apiKey: config.apiKey,
      sum: amount / 100,
      currency: 'ILS',
      maxPayments: 1,
      clientName: paymentMethod.holderName,
      clientEmail: paymentMethod.email,
      clientPhone: paymentMethod.phone,
      userId: paymentMethod.holderId,
      customFields: {
        coach_id: coachId,
        plan_code: planCode,
      },
      recurring: {
        type: request.billingCycle === 'monthly' ? 'monthly' : 'yearly',
        interval: 1,
      },
    };

    try {
      const response = await axios.post(
        `${config.apiUrl}/charges`,
        requestData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      const responseData = response.data;
      logger.info('Meshulam response received', { responseData });

      if (responseData.status === 'success') {
        return {
          success: true,
          subscriptionId: responseData.id,
          paymentMethodToken: responseData.token,
          transactionId: responseData.transaction_id,
          nextBillingDate: this.calculateNextBillingDate(request.billingCycle),
        };
      } else {
        return {
          success: false,
          error: responseData.message || 'Meshulam transaction failed',
        };
      }
    } catch (error) {
      logger.error('Meshulam API error', error);
      throw new Error('Meshulam payment processing failed');
    }
  }

  private async cancelMeshulamSubscription(subscriptionId: string, provider: PaymentProvider): Promise<boolean> {
    // Implementation for Meshulam cancellation
    logger.info(`Cancelling Meshulam subscription ${subscriptionId}`);
    return true; // Placeholder
  }

  // ====================================
  // WEBHOOK PROCESSING
  // ====================================

  async processWebhook(event: WebhookEvent): Promise<boolean> {
    try {
      logger.info('Processing webhook event', {
        provider: event.provider,
        eventType: event.eventType,
        subscriptionId: event.subscriptionId,
      });

      // Verify webhook signature based on provider
      if (!this.verifyWebhookSignature(event)) {
        logger.error('Webhook signature verification failed', { provider: event.provider });
        return false;
      }

      // Process event based on type
      switch (event.eventType) {
        case 'subscription.created':
        case 'subscription.updated':
        case 'subscription.cancelled':
        case 'payment.succeeded':
        case 'payment.failed':
          // These events will be handled by the subscription service
          return true;
        default:
          logger.warn('Unknown webhook event type', { eventType: event.eventType });
          return false;
      }
    } catch (error) {
      logger.error('Webhook processing error', error);
      return false;
    }
  }

  private verifyWebhookSignature(event: WebhookEvent): boolean {
    const provider = this.providers.get(event.provider);
    if (!provider) return false;

    // Each provider has different signature verification methods
    switch (event.provider) {
      case 'tranzila':
        return this.verifyTranzilaSignature(event, provider);
      case 'cardcom':
        return this.verifyCardcomSignature(event, provider);
      case 'payplus':
        return this.verifyPayPlusSignature(event, provider);
      case 'meshulam':
        return this.verifyMeshulamSignature(event, provider);
      default:
        return false;
    }
  }

  private verifyTranzilaSignature(event: WebhookEvent, provider: PaymentProvider): boolean {
    // Tranzila signature verification logic
    const expectedSignature = crypto
      .createHmac('sha256', provider.config.password || '')
      .update(JSON.stringify(event.eventData))
      .digest('hex');
    
    return event.signature === expectedSignature;
  }

  private verifyCardcomSignature(event: WebhookEvent, provider: PaymentProvider): boolean {
    // Cardcom signature verification logic
    return true; // Implement based on Cardcom's signature method
  }

  private verifyPayPlusSignature(event: WebhookEvent, provider: PaymentProvider): boolean {
    // PayPlus signature verification logic
    return true; // Implement based on PayPlus's signature method
  }

  private verifyMeshulamSignature(event: WebhookEvent, provider: PaymentProvider): boolean {
    // Meshulam signature verification logic
    return true; // Implement based on Meshulam's signature method
  }

  // ====================================
  // UTILITY FUNCTIONS
  // ====================================

  private extractXmlValue(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
  }

  private calculateNextBillingDate(billingCycle: 'monthly' | 'yearly'): Date {
    const now = new Date();
    if (billingCycle === 'monthly') {
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    } else {
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }
  }

  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isActive);
  }

  isProviderAvailable(providerId: PaymentProvider['id']): boolean {
    const provider = this.providers.get(providerId);
    return provider ? provider.isActive : false;
  }

  async processWebhookEvent(event: any): Promise<void> {
    const { type, data, provider_source } = event;
    const subscriptionId = data?.object?.subscription || data?.object?.id;

    if (!subscriptionId) {
      logger.warn('Webhook received without a subscription ID', { event });
      return;
    }

    switch (type) {
      case 'charge.succeeded':
      case 'payment_intent.succeeded':
      case 'subscription.payment_succeeded': {
        const { data: updated, error } = await supabase
          .from('coach_subscriptions')
          .update({ 
            status: 'active',
            last_payment_date: new Date().toISOString(),
            current_period_end: this.calculateNextBillingDate('monthly').toISOString()
          })
          .eq('isra_pay_subscription_id', subscriptionId);
        
        if (error) {
          logger.error(`Webhook: Failed to update subscription ${subscriptionId} to active`, error);
        } else {
          logger.info(`Webhook: Updated subscription ${subscriptionId} to active.`);
        }
        break;
      }
      
      case 'charge.failed':
      case 'payment_intent.payment_failed':
      case 'subscription.payment_failed': {
        const { data: updated, error } = await supabase
          .from('coach_subscriptions')
          .update({ status: 'past_due' })
          .eq('isra_pay_subscription_id', subscriptionId);

        if (error) {
          logger.error(`Webhook: Failed to update subscription ${subscriptionId} to past_due`, error);
        } else {
          logger.info(`Webhook: Updated subscription ${subscriptionId} to past_due.`);
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'subscription.cancelled': {
        const { data: updated, error } = await supabase
          .from('coach_subscriptions')
          .update({ 
            status: 'cancelled',
            cancellation_date: new Date().toISOString(),
            // Keep current_period_end to allow access until period ends
          })
          .eq('isra_pay_subscription_id', subscriptionId);

        if (error) {
          logger.error(`Webhook: Failed to update subscription ${subscriptionId} to cancelled`, error);
        } else {
          logger.info(`Webhook: Updated subscription ${subscriptionId} to cancelled.`);
        }
        break;
      }

      default:
        logger.info(`Webhook: Received unhandled event type: ${type}`);
    }
  }
}

// ====================================
// SINGLETON EXPORT
// ====================================

export const israPayService = new IsraPayService(); 