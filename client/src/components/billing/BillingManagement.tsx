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
  Settings,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// TODO: Replace with shared API instance once the export issue in 'lib/api' is resolved.
import axios from 'axios';
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
});
import SubscriptionPlanSelector from './SubscriptionPlanSelector';
import SubscriptionCheckoutForm, { PaymentFormData } from './SubscriptionCheckoutForm';

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
  planCode: 'seeker' | 'explorer' | 'navigator';
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  amount: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  clientLimit: number;
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
  loading: boolean;
  error: string | null;
}

const planDetails = {
  seeker: { name: 'Seeker Coach', price: 59 },
  explorer: { name: 'Explorer Coach', price: 189 },
  navigator: { name: 'Navigator Coach', price: 220 },
};

const BillingManagement: React.FC = () => {
  const { toast } = useToast();
  
  const [state, setState] = useState<BillingState>({
    subscription: null,
    loading: true,
    error: null,
  });

  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'seeker' | 'explorer' | 'navigator' | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await api.get('/subscriptions/current');
      if (response.data) {
        setState({ subscription: response.data, loading: false, error: null });
      } else {
        setState({ subscription: null, loading: false, error: null });
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // No subscription found, which is a valid state
        setState({ subscription: null, loading: false, error: null });
      } else {
        console.error('Failed to load billing data:', error);
        setState({ subscription: null, loading: false, error: 'Failed to load billing information.' });
        toast({
          title: "Error",
          description: "Failed to load billing information. Please try again.",
          variant: "destructive",
        });
      }
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

  const handleSelectPlan = (planId: 'seeker' | 'explorer' | 'navigator') => {
    setSelectedPlan(planId);
  };
  
  const handleCreateSubscription = async (paymentData: PaymentFormData) => {
    if (!selectedPlan) return;

    try {
      setState(prev => ({...prev, loading: true}));
      const payload = {
        planCode: selectedPlan,
        paymentMethod: {
          ...paymentData
        },
        provider: paymentData.provider,
      };
      await api.post('/subscriptions/create', payload);
      toast({
        title: "Subscription Successful!",
        description: `You have successfully subscribed to the ${planDetails[selectedPlan].name}.`,
      });
      setSelectedPlan(null);
      loadBillingData();
    } catch (error) {
       console.error('Failed to create subscription:', error);
       toast({
        title: "Subscription Failed",
        description: "We couldn't process your subscription. Please check your payment details and try again.",
        variant: "destructive",
      });
      setState(prev => ({...prev, loading: false}));
    }
  };

  const handleCancelSubscription = async () => {
    if (!state.subscription) return;
    try {
      setState(prev => ({ ...prev, loading: true }));
      await api.post(`/subscriptions/cancel`);
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled and will not renew.",
      });
      loadBillingData();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, loading: false }));
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

  if (state.loading && !state.subscription) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!state.subscription) {
     if (selectedPlan) {
      return (
        <SubscriptionCheckoutForm 
          planName={planDetails[selectedPlan].name}
          planPrice={planDetails[selectedPlan].price}
          onSubmit={handleCreateSubscription}
          loading={state.loading}
        />
      );
    }
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Choose Your Plan</h2>
        <p className="text-muted-foreground mb-8">You don't have an active subscription. Select a plan to get started.</p>
        <SubscriptionPlanSelector onSelectPlan={handleSelectPlan} />
      </div>
    );
  }

  const { subscription } = state;
  const currentPlan = planDetails[subscription.planCode];

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>Manage your subscription details.</CardDescription>
          </div>
          <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'} className="capitalize">
            {subscription.status.replace('_', ' ')}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Plan</Label>
              <p className="font-semibold">{currentPlan.name}</p>
            </div>
            <div>
              <Label>Price</Label>
              <p className="font-semibold">₪{subscription.amount} / month</p>
            </div>
            <div>
              <Label>Billing Cycle</Label>
              <p>{new Date(subscription.currentPeriodStart).toLocaleDateString()} - {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
            </div>
             <div>
              <Label>Client Limit</Label>
              <p>{subscription.clientLimit}</p>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="flex justify-end gap-2">
            {subscription.status === 'active' && (
               <Button variant="destructive" onClick={handleCancelSubscription} disabled={state.loading}>
                {state.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cancel Subscription
              </Button>
            )}
            {/* Plan change functionality can be added here */}
          </div>
        </CardContent>
      </Card>
      
      {/* Payment Methods and Invoice History sections would be built out here, fetching from their respective endpoints */}
    </div>
  );
};

export default BillingManagement; 