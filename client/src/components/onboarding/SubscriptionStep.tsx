import React, { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import SubscriptionPlanSelector from '../billing/SubscriptionPlanSelector';
import SubscriptionCheckoutForm from '../billing/SubscriptionCheckoutForm';
import { CheckCircle } from 'lucide-react';

interface SubscriptionStepProps {
  onSubscribed: (planId: 'seeker' | 'explorer' | 'navigator') => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const SubscriptionStep: React.FC<SubscriptionStepProps> = ({ onSubscribed, loading, setLoading }) => {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<'seeker' | 'explorer' | 'navigator' | null>(null);

  const handleSelectPlan = (planId: 'seeker' | 'explorer' | 'navigator') => {
    setSelectedPlan(planId);
  };

  const handleCreateSubscription = async (paymentData: any) => {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      // In a real app, this would call the API
      // await api.post('/subscriptions/create', { planCode: selectedPlan, ... });
      console.log("Creating subscription with:", { planCode: selectedPlan, ...paymentData });
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      toast({ title: "Subscribed!", description: `Successfully subscribed to ${selectedPlan} plan.` });
      onSubscribed(selectedPlan);

    } catch (error) {
      toast({ title: "Error", description: "Subscription failed. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (selectedPlan) {
    const planDetails = {
      seeker: { name: 'Seeker Coach', price: 59 },
      explorer: { name: 'Explorer Coach', price: 189 },
      navigator: { name: 'Navigator Coach', price: 220 },
    };
    return (
      <SubscriptionCheckoutForm
        planName={planDetails[selectedPlan].name}
        planPrice={planDetails[selectedPlan].price}
        onSubmit={handleCreateSubscription}
        loading={loading}
      />
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-center">Choose Your Plan</h2>
      <p className="text-muted-foreground mb-8 text-center">Select a plan to get started.</p>
      <SubscriptionPlanSelector onSelectPlan={handleSelectPlan} />
    </div>
  );
};

export default SubscriptionStep; 