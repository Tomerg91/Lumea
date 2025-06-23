import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface Plan {
  id: 'seeker' | 'explorer' | 'navigator';
  name: string;
  price: number;
  clientLimit: string;
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'seeker',
    name: 'Seeker Coach',
    price: 59,
    clientLimit: 'Up to 10 clients',
    features: ['Basic coaching features', 'Standard session management', 'Basic reporting'],
  },
  {
    id: 'explorer',
    name: 'Explorer Coach',
    price: 189,
    clientLimit: 'Up to 30 clients',
    features: ['All Seeker features', 'Guided audio sessions', 'Enhanced reporting', 'Priority email support'],
  },
  {
    id: 'navigator',
    name: 'Navigator Coach',
    price: 220,
    clientLimit: 'Unlimited clients',
    features: ['All Explorer features', 'Workshop hosting capabilities', 'Advanced analytics', 'Priority support'],
  },
];

interface SubscriptionPlanSelectorProps {
  onSelectPlan: (planId: Plan['id']) => void;
  currentPlanId?: Plan['id'];
}

const SubscriptionPlanSelector: React.FC<SubscriptionPlanSelectorProps> = ({ onSelectPlan, currentPlanId }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {plans.map((plan) => (
        <Card key={plan.id} className={`flex flex-col ${currentPlanId === plan.id ? 'border-primary' : ''}`}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.clientLimit}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="mb-6">
              <span className="text-4xl font-bold">₪{plan.price}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2 h-4 w-4" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <div className="p-6 pt-0">
            <Button 
              onClick={() => onSelectPlan(plan.id)} 
              className="w-full"
              disabled={currentPlanId === plan.id}
            >
              {currentPlanId === plan.id ? 'Current Plan' : 'Choose Plan'}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default SubscriptionPlanSelector; 