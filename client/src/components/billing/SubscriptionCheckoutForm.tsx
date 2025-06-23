import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CreditCard, Loader2 } from 'lucide-react';

export interface PaymentFormData {
  provider: 'tranzila' | 'cardcom' | 'payplus' | 'meshulam';
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderName: string;
  holderId: string; // Israeli ID
}

interface SubscriptionCheckoutFormProps {
  planName: string;
  planPrice: number;
  onSubmit: (formData: PaymentFormData) => void;
  loading: boolean;
}

const SubscriptionCheckoutForm: React.FC<SubscriptionCheckoutFormProps> = ({ planName, planPrice, onSubmit, loading }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Omit<PaymentFormData, 'provider'>>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    holderName: '',
    holderId: '',
  });
  const [provider, setProvider] = useState<'tranzila' | 'cardcom' | 'payplus' | 'meshulam'>('tranzila');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cardNumber') {
      setFormData(prev => ({ ...prev, [name]: formatCardNumber(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateIsraeliId(formData.holderId)) {
      toast({
        title: "Invalid ID Number",
        description: "Please enter a valid Israeli ID number.",
        variant: "destructive",
      });
      return;
    }
    onSubmit({ ...formData, provider });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Subscription</CardTitle>
        <CardDescription>You are subscribing to the **{planName}** plan for **₪{planPrice}/month**.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
             <div className="space-y-2">
              <Label htmlFor="provider">Payment Provider</Label>
               <Select onValueChange={(value: any) => setProvider(value)} defaultValue={provider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a payment provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tranzila">Tranzila</SelectItem>
                  <SelectItem value="cardcom">Cardcom</SelectItem>
                  <SelectItem value="payplus">PayPlus</SelectItem>
                  <SelectItem value="meshulam">Meshulam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="holderName">Cardholder Name</Label>
              <Input id="holderName" name="holderName" value={formData.holderName} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holderId">Cardholder ID (Mispar Zehut)</Label>
              <Input id="holderId" name="holderId" value={formData.holderId} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <div className="relative">
                <Input id="cardNumber" name="cardNumber" value={formData.cardNumber} onChange={handleInputChange} required />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryMonth">Expiry Month</Label>
                <Input id="expiryMonth" name="expiryMonth" placeholder="MM" value={formData.expiryMonth} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryYear">Expiry Year</Label>
                <Input id="expiryYear" name="expiryYear" placeholder="YYYY" value={formData.expiryYear} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input id="cvv" name="cvv" value={formData.cvv} onChange={handleInputChange} required />
              </div>
            </div>
             <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your payment information is securely processed by our certified payment partners.
              </AlertDescription>
            </Alert>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Subscribe Now
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SubscriptionCheckoutForm; 