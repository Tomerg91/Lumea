import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  CreditCard, 
  Download, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  DollarSign,
  FileText,
  Clock,
  Crown,
  Zap
} from 'lucide-react';
import { toast } from '../ui/use-toast';

interface Subscription {
  id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  planName: string;
  planPrice: number;
  planInterval: 'month' | 'year';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

interface Invoice {
  id: string;
  number: string;
  status: 'paid' | 'open' | 'draft' | 'uncollectible' | 'void';
  amount: number;
  currency: string;
  created: string;
  dueDate?: string;
  paidAt?: string;
  hostedInvoiceUrl: string;
  invoicePdf: string;
}

interface PaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

interface BillingData {
  subscription: Subscription | null;
  invoices: Invoice[];
  paymentMethods: PaymentMethod[];
  upcomingInvoice: Invoice | null;
}

const PLAN_FEATURES = {
  starter: [
    'Up to 10 sessions per month',
    'Basic reflection tools',
    'Email support',
    'Progress tracking'
  ],
  professional: [
    'Unlimited sessions',
    'Advanced reflection tools',
    'Video calling',
    'Priority support',
    'Custom resources',
    'Analytics dashboard'
  ],
  enterprise: [
    'Everything in Professional',
    'Multi-coach support',
    'API access',
    'Custom integrations',
    'Dedicated support',
    'White-label options'
  ]
};

export default function BillingPortal() {
  const { user } = useAuth();
  const [billingData, setBillingData] = useState<BillingData>({
    subscription: null,
    invoices: [],
    paymentMethods: [],
    upcomingInvoice: null
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const response = await fetch('/api/billing/portal-data', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBillingData(data);
      } else {
        throw new Error('Failed to fetch billing data');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load billing information. Please try again.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const openStripePortal = async () => {
    setActionLoading('portal');
    try {
      const response = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create portal session');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive"
      });
    }
    setActionLoading(null);
  };

  const downloadInvoice = async (invoiceId: string) => {
    setActionLoading(`invoice-${invoiceId}`);
    try {
      const response = await fetch(`/api/billing/invoice/${invoiceId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download invoice');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive"
      });
    }
    setActionLoading(null);
  };

  const cancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of your current billing period.')) {
      return;
    }

    setActionLoading('cancel');
    try {
      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await fetchBillingData();
        toast({
          title: "Subscription Canceled",
          description: "Your subscription will be canceled at the end of the current billing period."
        });
      } else {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive"
      });
    }
    setActionLoading(null);
  };

  const reactivateSubscription = async () => {
    setActionLoading('reactivate');
    try {
      const response = await fetch('/api/billing/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await fetchBillingData();
        toast({
          title: "Subscription Reactivated",
          description: "Your subscription has been reactivated successfully."
        });
      } else {
        throw new Error('Failed to reactivate subscription');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reactivate subscription. Please try again.",
        variant: "destructive"
      });
    }
    setActionLoading(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: React.ReactNode; label: string }> = {
      active: { variant: 'default', icon: <CheckCircle className="w-3 h-3" />, label: 'Active' },
      trialing: { variant: 'secondary', icon: <Clock className="w-3 h-3" />, label: 'Trial' },
      past_due: { variant: 'destructive', icon: <AlertCircle className="w-3 h-3" />, label: 'Past Due' },
      canceled: { variant: 'outline', icon: <AlertCircle className="w-3 h-3" />, label: 'Canceled' },
      unpaid: { variant: 'destructive', icon: <AlertCircle className="w-3 h-3" />, label: 'Unpaid' }
    };

    const config = variants[status] || variants.active;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('enterprise')) return <Crown className="w-5 h-5" />;
    if (name.includes('professional') || name.includes('pro')) return <Zap className="w-5 h-5" />;
    return <CheckCircle className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription, payment methods, and invoices</p>
        </div>
        <Button 
          onClick={openStripePortal}
          disabled={actionLoading === 'portal'}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          {actionLoading === 'portal' ? 'Opening...' : 'Manage Billing'}
        </Button>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingData.subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getPlanIcon(billingData.subscription.planName)}
                  <div>
                    <h3 className="font-semibold text-lg">{billingData.subscription.planName}</h3>
                    <p className="text-sm text-muted-foreground">
                      ${billingData.subscription.planPrice}/{billingData.subscription.planInterval}
                    </p>
                  </div>
                </div>
                {getStatusBadge(billingData.subscription.status)}
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Current Period</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(billingData.subscription.currentPeriodStart).toLocaleDateString()} - {' '}
                    {new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
                {billingData.subscription.trialEnd && (
                  <div>
                    <p className="text-sm font-medium">Trial Ends</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(billingData.subscription.trialEnd).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {billingData.subscription.cancelAtPeriodEnd && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-800">
                      Subscription will cancel on {new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <Button 
                    onClick={reactivateSubscription}
                    disabled={actionLoading === 'reactivate'}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    {actionLoading === 'reactivate' ? 'Reactivating...' : 'Reactivate Subscription'}
                  </Button>
                </div>
              )}

              {/* Plan Features */}
              <div>
                <h4 className="font-medium mb-2">Plan Features</h4>
                <div className="grid gap-2">
                  {PLAN_FEATURES[billingData.subscription.planName.toLowerCase() as keyof typeof PLAN_FEATURES]?.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No active subscription</p>
              <Button>Subscribe Now</Button>
            </div>
          )}
        </CardContent>
        {billingData.subscription && !billingData.subscription.cancelAtPeriodEnd && (
          <CardFooter>
            <Button 
              onClick={cancelSubscription}
              disabled={actionLoading === 'cancel'}
              variant="outline"
              className="text-red-600 hover:text-red-700"
            >
              {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel Subscription'}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Upcoming Invoice */}
      {billingData.upcomingInvoice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">${billingData.upcomingInvoice.amount}</p>
                <p className="text-sm text-muted-foreground">
                  Due {new Date(billingData.upcomingInvoice.dueDate || '').toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline">Upcoming</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingData.paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {billingData.paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5" />
                    <div>
                      <p className="font-medium">
                        •••• •••• •••• {method.card.last4}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {method.card.brand.toUpperCase()} expires {method.card.expMonth}/{method.card.expYear}
                      </p>
                    </div>
                  </div>
                  {method.isDefault && <Badge>Default</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No payment methods on file</p>
          )}
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingData.invoices.length > 0 ? (
            <div className="space-y-3">
              {billingData.invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Invoice #{invoice.number}</p>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${invoice.amount} • {new Date(invoice.created).toLocaleDateString()}
                      {invoice.paidAt && ` • Paid ${new Date(invoice.paidAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(invoice.hostedInvoiceUrl, '_blank')}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadInvoice(invoice.id)}
                      disabled={actionLoading === `invoice-${invoice.id}`}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      {actionLoading === `invoice-${invoice.id}` ? 'Downloading...' : 'PDF'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No invoices found</p>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            If you have questions about your billing or need assistance, we're here to help.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline">Contact Support</Button>
            <Button variant="outline">View FAQ</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 