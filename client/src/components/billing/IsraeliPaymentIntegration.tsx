import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentProvider {
  id: string;
  name: string;
  logo?: string;
  description: string;
  features: string[];
  supportedCards: string[];
}

interface PaymentFormData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderName: string;
  holderId: string; // Israeli ID
  email: string;
  phone: string;
}

const IsraeliPaymentIntegration: React.FC = () => {
  const { toast } = useToast();
  
  const [selectedProvider, setSelectedProvider] = useState<string>('tranzila');
  const [formData, setFormData] = useState<PaymentFormData>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    holderName: '',
    holderId: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);

  const paymentProviders: PaymentProvider[] = [
    {
      id: 'tranzila',
      name: 'Tranzila',
      description: 'Leading Israeli payment gateway with excellent local support',
      features: [
        'Israeli Shekel (ILS) native support',
        'All major Israeli banks supported',
        'PCI DSS Level 1 certified',
        'Hebrew interface available',
        'Local customer support'
      ],
      supportedCards: ['Visa', 'Mastercard', 'Isracard', 'Diners', 'American Express']
    },
    {
      id: 'cardcom',
      name: 'Cardcom',
      description: 'Major Israeli payment processor with comprehensive features',
      features: [
        'Multi-currency support (ILS, USD, EUR)',
        'Recurring billing support',
        'Mobile-optimized checkout',
        'Fraud protection',
        '24/7 technical support'
      ],
      supportedCards: ['Visa', 'Mastercard', 'Isracard', 'Diners']
    },
    {
      id: 'payplus',
      name: 'PayPlus',
      description: 'Modern Israeli payment solution with API-first approach',
      features: [
        'Modern REST API',
        'Real-time notifications',
        'Advanced analytics',
        'Mobile SDK available',
        'Developer-friendly documentation'
      ],
      supportedCards: ['Visa', 'Mastercard', 'Isracard']
    },
    {
      id: 'meshulam',
      name: 'Meshulam',
      description: 'Israeli payment processor focused on e-commerce',
      features: [
        'E-commerce optimized',
        'Shopping cart integration',
        'Subscription management',
        'Israeli tax compliance',
        'Multi-language support'
      ],
      supportedCards: ['Visa', 'Mastercard', 'Isracard', 'American Express']
    }
  ];

  const currentProvider = paymentProviders.find(p => p.id === selectedProvider);

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const validateIsraeliId = (id: string): boolean => {
    if (!/^\d{9}$/.test(id)) return false;
    
    const digits = id.split('').map(Number);
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      let digit = digits[i];
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    
    return sum % 10 === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.cardNumber || !formData.expiryMonth || !formData.expiryYear || 
        !formData.cvv || !formData.holderName || !formData.holderId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!validateIsraeliId(formData.holderId)) {
      toast({
        title: "Invalid ID Number",
        description: "Please enter a valid Israeli ID number.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement actual payment processing
      // This is where you would integrate with your chosen Israeli payment provider
      
      const paymentData = {
        provider: selectedProvider,
        ...formData,
        cardNumber: formData.cardNumber.replace(/\s/g, ''), // Remove spaces for processing
      };

      // Example API call structure for different providers:
      let apiEndpoint = '';
      let requestBody = {};

      switch (selectedProvider) {
        case 'tranzila':
          apiEndpoint = '/api/payments/tranzila';
          requestBody = {
            supplier: process.env.REACT_APP_TRANZILA_SUPPLIER,
            sum: 299, // Amount in ILS
            currency: 1, // 1 = ILS
            ccno: paymentData.cardNumber,
            expdate: `${formData.expiryMonth}${formData.expiryYear}`,
            cvv: formData.cvv,
            myid: formData.holderId,
            contact: formData.holderName,
            email: formData.email,
          };
          break;

        case 'cardcom':
          apiEndpoint = '/api/payments/cardcom';
          requestBody = {
            TerminalNumber: process.env.REACT_APP_CARDCOM_TERMINAL,
            UserName: process.env.REACT_APP_CARDCOM_USERNAME,
            Sum: 299,
            Currency: 1, // ILS
            CardNumber: paymentData.cardNumber,
            ExpDate: `${formData.expiryMonth}${formData.expiryYear}`,
            CVV: formData.cvv,
            ID: formData.holderId,
            CardHolderName: formData.holderName,
          };
          break;

        case 'payplus':
          apiEndpoint = '/api/payments/payplus';
          requestBody = {
            api_key: process.env.REACT_APP_PAYPLUS_API_KEY,
            amount: 299,
            currency_code: 'ILS',
            credit_card_number: paymentData.cardNumber,
            expiry_month: formData.expiryMonth,
            expiry_year: formData.expiryYear,
            cvv: formData.cvv,
            holder_name: formData.holderName,
            holder_id: formData.holderId,
          };
          break;

        default:
          throw new Error('Unsupported payment provider');
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));

      // const response = await fetch(apiEndpoint, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(requestBody),
      // });

      // const result = await response.json();

      // if (response.ok && result.success) {
        toast({
          title: "Payment Successful!",
          description: `Payment processed successfully through ${currentProvider?.name}.`,
        });
      // } else {
      //   throw new Error(result.message || 'Payment failed');
      // }

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Israeli Payment Integration</h1>
        <p className="text-gray-600">Choose your preferred Israeli payment processor</p>
      </div>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Payment Provider</CardTitle>
          <CardDescription>
            Choose from major Israeli payment processors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentProviders.map((provider) => (
              <div
                key={provider.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedProvider === provider.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{provider.name}</h3>
                  {selectedProvider === provider.id && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{provider.description}</p>
                
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Supported Cards:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {provider.supportedCards.map((card) => (
                        <span key={card} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {card}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Key Features:</Label>
                    <ul className="text-xs text-gray-600 mt-1 space-y-1">
                      {provider.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Information
          </CardTitle>
          <CardDescription>
            Processing through {currentProvider?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your payment information is encrypted and processed securely through 
                {' '}{currentProvider?.name}'s PCI DSS certified systems.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="cardNumber">Card Number *</Label>
                <Input
                  id="cardNumber"
                  value={formData.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                />
              </div>

              <div>
                <Label htmlFor="expiryMonth">Expiry Month *</Label>
                <Select 
                  value={formData.expiryMonth} 
                  onValueChange={(value) => handleInputChange('expiryMonth', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                        {(i + 1).toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expiryYear">Expiry Year *</Label>
                <Select 
                  value={formData.expiryYear} 
                  onValueChange={(value) => handleInputChange('expiryYear', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() + i;
                      return (
                        <SelectItem key={year} value={year.toString().slice(2)}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cvv">CVV *</Label>
                <Input
                  id="cvv"
                  value={formData.cvv}
                  onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, ''))}
                  placeholder="123"
                  maxLength={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="holderName">Cardholder Name *</Label>
                <Input
                  id="holderName"
                  value={formData.holderName}
                  onChange={(e) => handleInputChange('holderName', e.target.value)}
                  placeholder="Full name as on card"
                  required
                />
              </div>

              <div>
                <Label htmlFor="holderId">Israeli ID Number *</Label>
                <Input
                  id="holderId"
                  value={formData.holderId}
                  onChange={(e) => handleInputChange('holderId', e.target.value.replace(/\D/g, ''))}
                  placeholder="123456789"
                  maxLength={9}
                  required
                />
                {formData.holderId && !validateIsraeliId(formData.holderId) && (
                  <p className="text-sm text-red-600 mt-1">Invalid Israeli ID number</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="050-123-4567"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Pay ₪299 Securely
                  </>
                )}
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Integration Note:</strong> This form shows the structure for Israeli payment processors. 
                You'll need to obtain API credentials from your chosen provider and implement the actual payment processing 
                in your backend. Each provider has specific API requirements and documentation.
              </AlertDescription>
            </Alert>
          </form>
        </CardContent>
      </Card>

      {/* Integration Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Guide</CardTitle>
          <CardDescription>
            Steps to integrate with {currentProvider?.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <h4 className="font-medium">Sign up with {currentProvider?.name}</h4>
                <p className="text-sm text-gray-600">Create a merchant account and get your API credentials</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <h4 className="font-medium">Configure Environment Variables</h4>
                <p className="text-sm text-gray-600">Add your API keys to your environment configuration</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <h4 className="font-medium">Implement Backend Integration</h4>
                <p className="text-sm text-gray-600">Create API endpoints that communicate with the payment provider</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">4</div>
              <div>
                <h4 className="font-medium">Test & Deploy</h4>
                <p className="text-sm text-gray-600">Test with sandbox credentials before going live</p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Need Help?</strong> Each Israeli payment provider offers technical support and documentation. 
              Consider reaching out to their integration teams for specific implementation guidance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default IsraeliPaymentIntegration; 