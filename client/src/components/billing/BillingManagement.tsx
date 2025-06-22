import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Calendar, 
  Download, 
  AlertCircle,
  CheckCircle,
  DollarSign,
  Receipt,
  Shield,
  Clock,
  FileText,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethod {
  id: string;
  type: 'credit_card';
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface Subscription {
  id: string;
  planName: string;
  status: 'active' | 'past_due' | 'canceled' | 'paused';
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  date: Date;
  dueDate: Date;
  description: string;
  downloadUrl?: string;
}

interface BillingState {
  subscription: Subscription | null;
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  loading: boolean;
}

const BillingManagement: React.FC = () => {
  const { toast } = useToast();
  
  const [state, setState] = useState<BillingState>({
    subscription: null,
    paymentMethods: [],
    invoices: [],
    loading: true,
  });

  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [showPlanSelection, setShowPlanSelection] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      // TODO: Replace with actual API calls to your Israeli payment processor
      // This would typically call your backend which integrates with Tranzila/Cardcom/PayPlus
      
      // Mock data for demonstration
      const mockSubscription: Subscription = {
        id: 'sub_123',
        planName: 'Professional Plan',
        status: 'active',
        amount: 299,
        currency: 'ILS',
        billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: 'pm_123',
          type: 'credit_card',
          last4: '4242',
          brand: 'Visa',
          expiryMonth: 12,
          expiryYear: 2025,
          isDefault: true,
        },
      ];

      const mockInvoices: Invoice[] = [
        {
          id: 'inv_123',
          amount: 299,
          currency: 'ILS',
          status: 'paid',
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          description: 'Professional Plan - Monthly',
          downloadUrl: '/api/invoices/inv_123/download',
        },
      ];

      setState({
        subscription: mockSubscription,
        paymentMethods: mockPaymentMethods,
        invoices: mockInvoices,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load billing data:', error);
      setState(prev => ({ ...prev, loading: false }));
      toast({
        title: "Error",
        description: "Failed to load billing information. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddPaymentMethod = async (paymentData: any) => {
    try {
      // TODO: Integrate with Israeli payment processor
      // Example for Tranzila:
      // const response = await fetch('/api/payment-methods', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     processor: 'tranzila', // or 'cardcom', 'payplus', etc.
      //     cardNumber: paymentData.cardNumber,
      //     expiryMonth: paymentData.expiryMonth,
      //     expiryYear: paymentData.expiryYear,
      //     cvv: paymentData.cvv,
      //     holderName: paymentData.holderName,
      //     holderId: paymentData.holderId, // Israeli ID number
      //   }),
      // });

      toast({
        title: "Payment Method Added",
        description: "Your payment method has been successfully added.",
      });
      
      setShowAddPaymentMethod(false);
      loadBillingData(); // Refresh data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add payment method. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChangePlan = async (planId: string) => {
    try {
      // TODO: Implement plan change with Israeli payment processor
      toast({
        title: "Plan Updated",
        description: "Your subscription plan has been updated successfully.",
      });
      
      setShowPlanSelection(false);
      loadBillingData(); // Refresh data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      // TODO: Implement invoice download
      const response = await fetch(`/api/invoices/${invoiceId}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Payments</h1>
          <p className="text-gray-600">Manage your subscription and payment methods</p>
        </div>
        <Badge variant={state.subscription?.status === 'active' ? 'default' : 'destructive'}>
          {state.subscription?.status || 'No Subscription'}
        </Badge>
      </div>

      {/* Current Subscription */}
      {state.subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{state.subscription.planName}</h3>
                <p className="text-sm text-gray-600">
                  ₪{state.subscription.amount} / {state.subscription.billingCycle}
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowPlanSelection(true)}>
                Change Plan
              </Button>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Current Period</Label>
                <p className="text-sm">
                  {state.subscription.currentPeriodStart.toLocaleDateString('he-IL')} - {' '}
                  {state.subscription.currentPeriodEnd.toLocaleDateString('he-IL')}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Next Billing Date</Label>
                <p className="text-sm">
                  {state.subscription.nextBillingDate.toLocaleDateString('he-IL')}
                </p>
              </div>
            </div>

            {state.subscription.status === 'past_due' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your payment is overdue. Please update your payment method to avoid service interruption.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <Button onClick={() => setShowAddPaymentMethod(true)}>
              Add Payment Method
            </Button>
          </div>
          <CardDescription>
            Secure payment processing through Israeli payment providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {state.paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">
                        {method.brand} ending in {method.last4}
                      </p>
                      <p className="text-sm text-gray-600">
                        Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                      </p>
                    </div>
                    {method.isDefault && (
                      <Badge variant="outline">Default</Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No payment methods added yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.invoices.length > 0 ? (
            <div className="space-y-3">
              {state.invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{invoice.description}</p>
                      <p className="text-sm text-gray-600">
                        {invoice.date.toLocaleDateString('he-IL')} • ₪{invoice.amount}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        invoice.status === 'paid' ? 'default' : 
                        invoice.status === 'pending' ? 'secondary' : 'destructive'
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadInvoice(invoice.id)}
                    disabled={!invoice.downloadUrl}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No invoices available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Method Modal */}
      {showAddPaymentMethod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Payment Method</CardTitle>
              <CardDescription>
                Add a credit card for automatic billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input 
                  id="cardNumber" 
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input 
                    id="expiryDate" 
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input 
                    id="cvv" 
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="holderName">Cardholder Name</Label>
                <Input 
                  id="holderName" 
                  placeholder="Full name as on card"
                />
              </div>

              <div>
                <Label htmlFor="holderId">ID Number</Label>
                <Input 
                  id="holderId" 
                  placeholder="Israeli ID number"
                  maxLength={9}
                />
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your payment information is encrypted and processed securely through Israeli banking standards.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowAddPaymentMethod(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => handleAddPaymentMethod({})}
                >
                  Add Card
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plan Selection Modal */}
      {showPlanSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Choose Your Plan</CardTitle>
              <CardDescription>
                Select the plan that best fits your coaching needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'basic',
                    name: 'Basic Plan',
                    price: 199,
                    features: ['Up to 10 clients', 'Basic scheduling', 'Email support'],
                  },
                  {
                    id: 'professional',
                    name: 'Professional Plan',
                    price: 299,
                    features: ['Up to 50 clients', 'Advanced scheduling', 'Video calls', 'Priority support'],
                    popular: true,
                  },
                  {
                    id: 'enterprise',
                    name: 'Enterprise Plan',
                    price: 499,
                    features: ['Unlimited clients', 'White-label options', 'API access', '24/7 support'],
                  },
                ].map((plan) => (
                  <div 
                    key={plan.id}
                    className={`border rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow ${
                      plan.popular ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => handleChangePlan(plan.id)}
                  >
                    {plan.popular && (
                      <Badge className="mb-3">Most Popular</Badge>
                    )}
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <p className="text-2xl font-bold text-blue-600 mb-4">
                      ₪{plan.price}<span className="text-sm text-gray-600">/month</span>
                    </p>
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowPlanSelection(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BillingManagement; 