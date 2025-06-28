/**
 * Tranzila Payment Service - Israeli Payment Integration
 * 
 * Tranzila is Israel's leading payment processor offering:
 * - Full Hebrew interface
 * - Israeli banking integration
 * - ILS currency support
 * - Local tax compliance (17% VAT)
 * - Subscription management
 * - Israeli payment methods (credit cards, direct debit)
 */

export interface TranzilaConfig {
  currency: 'ILS';
  taxRate: number; // 17% VAT in Israel
  minimumAmount: number; // Minimum charge amount in agorot
  supplier: string; // Tranzila supplier ID
  terminal: string; // Terminal number
  apiUrl: string; // Tranzila API endpoint
  environment: 'sandbox' | 'production';
  businessInfo: {
    businessNumber: string;
    vatNumber: string;
    businessName: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: 'IL';
    };
  };
}

export interface TranzilaPaymentRequest {
  sum: number; // Amount in ILS (Tranzila uses whole numbers)
  currency: 'ILS';
  ccno: string; // Credit card number
  expdate: string; // MMYY format
  mycvv: string; // CVV code
  cred_type: '1'; // Regular transaction
  contact?: string; // Customer email
  company?: string; // Customer name
  phone?: string; // Customer phone
  address?: string; // Customer address
  city?: string; // Customer city
  comments?: string; // Transaction description
  myid?: string; // Customer ID
  npay?: string; // Number of payments (installments)
}

export interface TranzilaResponse {
  Response: string; // "000" for success
  TranzilaToken?: string; // Transaction token
  ConfirmationCode?: string; // Bank confirmation code
  Responsesource?: string; // Response source
  Responsecvv?: string; // CVV response
  Responseid?: string; // Transaction ID
  sum?: string; // Transaction amount
  currency?: string; // Currency code
  DBFImpDate?: string; // Transaction date
  DBFImpTime?: string; // Transaction time
  supplier?: string; // Supplier ID
  terminal?: string; // Terminal number
  tranmode?: string; // Transaction mode
  index?: string; // Transaction index
  ccno?: string; // Masked credit card number
  expdate?: string; // Card expiration
  contact?: string; // Customer contact
  company?: string; // Customer name
  phone?: string; // Customer phone
  fld1?: string; // Custom field 1
  fld2?: string; // Custom field 2
  fld3?: string; // Custom field 3
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameHebrew: string;
  description: string;
  descriptionHebrew: string;
  amount: number; // Monthly amount in ILS
  currency: 'ILS';
  interval: 'monthly';
  features: string[];
  featuresHebrew: string[];
  isPopular?: boolean;
  trialDays?: number;
}

export interface TranzilaCustomer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: 'IL';
  };
  israeliId?: string; // Israeli ID number
  businessNumber?: string; // For business customers
}

export interface TranzilaInvoice {
  number: string;
  date: string;
  dueDate: string;
  customer: TranzilaCustomer;
  items: InvoiceItem[];
  subtotal: number; // Before VAT
  vatAmount: number; // 17% VAT
  total: number; // Including VAT
  businessInfo: any;
}

export interface InvoiceItem {
  id: string;
  description: string;
  descriptionHebrew: string;
  quantity: number;
  unitPrice: number; // In ILS
  total: number; // In ILS
  vatRate: number; // 17% for Israel
}

class TranzilaPaymentService {
  private config: TranzilaConfig;
  private apiBaseUrl: string;

  constructor() {
    this.config = {
      currency: 'ILS',
      taxRate: 0.17, // 17% VAT
      minimumAmount: 1, // 1 ILS minimum (Tranzila uses whole numbers)
      supplier: process.env.VITE_TRANZILA_SUPPLIER || '',
      terminal: process.env.VITE_TRANZILA_TERMINAL || '',
      apiUrl: 'https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi',
      environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
      businessInfo: {
        businessNumber: '515123456', // Replace with actual business number
        vatNumber: '515123456', // Replace with actual VAT number
        businessName: 'סטיה קואצ׳ינג בע״מ',
        address: {
          street: 'רחוב דיזנגוף 50',
          city: 'תל אביב',
          postalCode: '6433309',
          country: 'IL',
        },
      },
    };
    this.apiBaseUrl = import.meta.env.VITE_RAILWAY_API_URL || 'http://localhost:3001';
  }

  /**
   * Initialize Tranzila service
   */
  async initialize(): Promise<void> {
    try {
      if (!this.config.supplier || !this.config.terminal) {
        throw new Error('Tranzila credentials not configured');
      }

      console.log('Tranzila Payment Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Tranzila Payment Service:', error);
      throw error;
    }
  }

  /**
   * Create payment transaction
   */
  async createPayment(
    amount: number,
    customerData: {
      email: string;
      name: string;
      phone?: string;
      israeliId?: string;
    },
    paymentData: {
      ccno: string;
      expdate: string; // MMYY
      cvv: string;
      installments?: number;
    },
    description: string = 'תשלום עבור שירותי אימון'
  ): Promise<TranzilaResponse> {
    try {
      // Validate minimum amount
      if (amount < this.config.minimumAmount) {
        throw new Error(`Minimum payment amount is ${this.config.minimumAmount} ILS`);
      }

      // Calculate total with VAT
      const subtotal = amount;
      const vatAmount = Math.round(subtotal * this.config.taxRate);
      const totalAmount = subtotal + vatAmount;

      const paymentRequest: TranzilaPaymentRequest = {
        sum: totalAmount,
        currency: 'ILS',
        ccno: paymentData.ccno,
        expdate: paymentData.expdate,
        mycvv: paymentData.cvv,
        cred_type: '1',
        contact: customerData.email,
        company: customerData.name,
        phone: customerData.phone,
        comments: description,
        myid: customerData.israeliId,
        npay: paymentData.installments?.toString(),
      };

      // Send to backend for processing
      const response = await fetch(`${this.apiBaseUrl}/api/payments/tranzila/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          paymentRequest,
          metadata: {
            subtotal,
            vatAmount,
            totalAmount,
            description,
            customer: customerData,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Payment failed: ${response.statusText}`);
      }

      const result: TranzilaResponse = await response.json();

      // Check if payment was successful
      if (result.Response === '000') {
        // Generate invoice for successful payment
        await this.generateInvoice({
          transactionId: result.Responseid || '',
          amount: totalAmount,
          customer: customerData,
          description,
          paymentMethod: 'credit_card',
        });
      }

      return result;
    } catch (error) {
      console.error('Create payment error:', error);
      throw error;
    }
  }

  /**
   * Create subscription for coaching services
   */
  async createSubscription(
    customerId: string,
    planId: string,
    paymentData: {
      ccno: string;
      expdate: string;
      cvv: string;
    }
  ): Promise<any> {
    try {
      const plan = await this.getSubscriptionPlan(planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // For subscriptions, we'll create a recurring payment setup
      const response = await fetch(`${this.apiBaseUrl}/api/payments/tranzila/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          customerId,
          planId,
          paymentData,
          config: this.config,
        }),
      });

      if (!response.ok) {
        throw new Error(`Subscription creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Create subscription error:', error);
      throw error;
    }
  }

  /**
   * Get available subscription plans for Israeli market
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return [
      {
        id: 'plan_coaching_basic_ils',
        name: 'Basic Coaching Plan',
        nameHebrew: 'תוכנית בסיסית',
        description: 'Monthly coaching sessions with personal development',
        descriptionHebrew: 'פגישות חודשיות עם מאמן אישי לפיתוח אישי',
        amount: 299, // 299 ILS
        currency: 'ILS',
        interval: 'monthly',
        features: [
          'One 60-minute session per month',
          'Access to learning materials',
          'Email support',
          'Progress tracking',
        ],
        featuresHebrew: [
          'פגישה אחת בחודש (60 דקות)',
          'גישה לחומרי למידה',
          'תמיכה באימייל',
          'מעקב אחר התקדמות',
        ],
      },
      {
        id: 'plan_coaching_standard_ils',
        name: 'Standard Coaching Plan',
        nameHebrew: 'תוכנית סטנדרטית',
        description: 'Weekly coaching sessions with comprehensive support',
        descriptionHebrew: 'פגישות שבועיות עם תמיכה מקיפה',
        amount: 599, // 599 ILS
        currency: 'ILS',
        interval: 'monthly',
        features: [
          '4 sessions per month (60 minutes each)',
          'Access to advanced learning materials',
          '24/7 support',
          'Detailed progress tracking',
          'Personalized exercises',
        ],
        featuresHebrew: [
          '4 פגישות בחודש (60 דקות כל אחת)',
          'גישה לחומרי למידה מתקדמים',
          'תמיכה 24/7',
          'מעקב אחר התקדמות מפורט',
          'תרגילי בית מותאמים אישית',
        ],
        isPopular: true,
      },
      {
        id: 'plan_coaching_premium_ils',
        name: 'Premium Coaching Plan',
        nameHebrew: 'תוכנית פרימיום',
        description: 'Unlimited personal coaching with high availability',
        descriptionHebrew: 'ליווי אישי ללא הגבלה עם זמינות גבוהה',
        amount: 999, // 999 ILS
        currency: 'ILS',
        interval: 'monthly',
        features: [
          'Unlimited sessions',
          '24/7 coach availability',
          'Personalized program',
          'Access to all learning materials',
          'Weekly progress reports',
          'Group sessions',
          'WhatsApp support',
        ],
        featuresHebrew: [
          'פגישות ללא הגבלה',
          'זמינות מאמן 24/7',
          'תוכנית אישית מותאמת',
          'גישה לכל חומרי הלמידה',
          'דוחות התקדמות שבועיים',
          'פגישות קבוצתיות',
          'ליווי בוואטסאפ',
        ],
        trialDays: 7,
      },
    ];
  }

  /**
   * Get specific subscription plan
   */
  async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
    const plans = await this.getSubscriptionPlans();
    return plans.find(plan => plan.id === planId) || null;
  }

  /**
   * Validate Israeli ID number
   */
  validateIsraeliId(id: string): boolean {
    if (!/^\d{9}$/.test(id)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let digit = parseInt(id[i]);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
      }
      sum += digit;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate Israeli business number
   */
  validateBusinessNumber(businessNumber: string): boolean {
    // Israeli business number validation (simplified)
    return /^\d{9}$/.test(businessNumber);
  }

  /**
   * Format amount for display in Hebrew
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Generate invoice for Israeli tax compliance
   */
  private async generateInvoice(invoiceData: {
    transactionId: string;
    amount: number;
    customer: any;
    description: string;
    paymentMethod: string;
  }): Promise<TranzilaInvoice> {
    try {
      const invoiceNumber = `INV-${Date.now()}`;
      const currentDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date().toISOString().split('T')[0]; // Immediate payment

      const subtotal = Math.round(invoiceData.amount / (1 + this.config.taxRate));
      const vatAmount = invoiceData.amount - subtotal;

      const invoice: TranzilaInvoice = {
        number: invoiceNumber,
        date: currentDate,
        dueDate,
        customer: invoiceData.customer,
        items: [
          {
            id: '1',
            description: invoiceData.description,
            descriptionHebrew: invoiceData.description,
            quantity: 1,
            unitPrice: subtotal,
            total: subtotal,
            vatRate: this.config.taxRate,
          },
        ],
        subtotal,
        vatAmount,
        total: invoiceData.amount,
        businessInfo: this.config.businessInfo,
      };

      // Save invoice to backend
      await fetch(`${this.apiBaseUrl}/api/payments/tranzila/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          invoice,
          transactionId: invoiceData.transactionId,
        }),
      });

      return invoice;
    } catch (error) {
      console.error('Generate invoice error:', error);
      throw error;
    }
  }

  /**
   * Get payment history for customer
   */
  async getPaymentHistory(customerId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/payments/tranzila/history/${customerId}`,
        {
          headers: {
            'Authorization': `Bearer ${await this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get payment history: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get payment history error:', error);
      throw error;
    }
  }

  /**
   * Get tax information for display
   */
  getTaxInfo(): {
    vatRate: number;
    businessNumber: string;
    vatNumber: string;
    businessName: string;
    address: any;
  } {
    return {
      vatRate: this.config.taxRate,
      businessNumber: this.config.businessInfo.businessNumber,
      vatNumber: this.config.businessInfo.vatNumber,
      businessName: this.config.businessInfo.businessName,
      address: this.config.businessInfo.address,
    };
  }

  /**
   * Validate credit card number using Luhn algorithm
   */
  validateCreditCard(cardNumber: string): boolean {
    const num = cardNumber.replace(/\D/g, '');
    let sum = 0;
    let alternate = false;
    
    for (let i = num.length - 1; i >= 0; i--) {
      let n = parseInt(num.charAt(i), 10);
      
      if (alternate) {
        n *= 2;
        if (n > 9) {
          n = (n % 10) + 1;
        }
      }
      
      sum += n;
      alternate = !alternate;
    }
    
    return (sum % 10) === 0;
  }

  /**
   * Validate expiration date
   */
  validateExpirationDate(expDate: string): boolean {
    const regex = /^(0[1-9]|1[0-2])\/?\d{2}$/;
    if (!regex.test(expDate)) {
      return false;
    }

    const [month, year] = expDate.replace('/', '').match(/.{1,2}/g) || [];
    const exp = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const now = new Date();
    
    return exp > now;
  }

  /**
   * Validate CVV
   */
  validateCVV(cvv: string): boolean {
    return /^\d{3,4}$/.test(cvv);
  }

  /**
   * Get authentication token for API requests
   */
  private async getAuthToken(): Promise<string> {
    // Get token from your auth service
    const token = localStorage.getItem('supabase.auth.token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    return token;
  }

  /**
   * Calculate installment amount
   */
  calculateInstallment(totalAmount: number, numberOfPayments: number): number {
    return Math.ceil(totalAmount / numberOfPayments);
  }

  /**
   * Get supported installment options
   */
  getInstallmentOptions(amount: number): Array<{ payments: number; monthlyAmount: number }> {
    const options = [];
    
    // Minimum amount for installments (typically 100 ILS)
    if (amount >= 100) {
      for (let payments = 2; payments <= 12; payments++) {
        const monthlyAmount = this.calculateInstallment(amount, payments);
        options.push({ payments, monthlyAmount });
      }
    }
    
    return options;
  }
}

// Export singleton instance
export const tranzilaPaymentService = new TranzilaPaymentService();
export default tranzilaPaymentService;