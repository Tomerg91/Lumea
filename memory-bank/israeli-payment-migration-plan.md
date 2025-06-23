# Israeli Payment Gateway Migration - Implementation Plan

## 🎯 **PROJECT OVERVIEW**

**Objective**: Transform Lumea coaching platform from Stripe to Israeli payment gateways (ISRA_PAY) with coach-centric subscription model.

**Business Model Change**:
- **From**: General payment system with coaches and clients paying separately
- **To**: Coach-only subscription model where coaches pay for platform access and clients use features based on coach's plan

## 🏗️ **SUBSCRIPTION TIERS**

### **Seeker Coach - ₪59/month**
- ≤ 10 clients maximum
- Basic coaching features
- Standard session management
- Basic reporting

### **Explorer Coach - ₪189/month**
- ≤ 30 clients maximum
- All Seeker features
- **Guided audio sessions**
- Enhanced reporting
- Priority email support

### **Navigator Coach - ₪220/month**
- **Unlimited clients**
- All Explorer features
- **Workshop hosting capabilities**
- **Priority support (phone/chat)**
- Advanced analytics
- White-label options

## 📊 **CURRENT SYSTEM ANALYSIS**

### **Existing Payment Infrastructure** ✅
- `IsraeliPaymentIntegration.tsx` - Ready with Tranzila/Cardcom/PayPlus/Meshulam
- `BillingManagement.tsx` - Stripe-based subscription management
- `CoachOnboardingWizard.tsx` - Stripe Connect setup

### **Database Schema Analysis** ✅
- **Users table**: Has `role` field (client/coach/admin) ✅
- **Payments table**: Currently handles session-based payments ❌ Need subscription-specific tables
- **RLS Policies**: Multi-tenant security in place ✅ Need modification for coach-subscription model

## 🔄 **IMPLEMENTATION PHASES**

## **Phase 1: Database Schema Migration** (2-3 hours)

### **1.1 Create New Tables**
```sql
-- Coach Subscriptions Table
CREATE TABLE IF NOT EXISTS public.coach_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL CHECK (plan_code IN ('seeker', 'explorer', 'navigator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due')),
  isra_pay_subscription_id TEXT UNIQUE,
  payment_processor TEXT NOT NULL CHECK (payment_processor IN ('tranzila', 'cardcom', 'pelecard', 'payplus', 'meshulam')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ILS' NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly' NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  next_renewal_date TIMESTAMP WITH TIME ZONE NOT NULL,
  client_limit INTEGER NOT NULL,
  features JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(coach_id, status) WHERE status = 'active'
);

-- Client-Coach Linking Table  
CREATE TABLE IF NOT EXISTS public.client_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitation_token TEXT UNIQUE,
  invited_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  invitation_expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, coach_id)
);

-- Subscription Events/Webhooks Log
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_subscription_id UUID REFERENCES public.coach_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'renewed', 'cancelled', 'payment_failed', 'payment_success')),
  processor_event_id TEXT,
  event_data JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### **1.2 Update RLS Policies**
```sql
-- Coach Subscriptions Policies
CREATE POLICY "Coaches can read their own subscription"
ON public.coach_subscriptions FOR SELECT
USING (coach_id = auth.uid());

CREATE POLICY "Coaches can update their own subscription"
ON public.coach_subscriptions FOR UPDATE
USING (coach_id = auth.uid());

-- Client Links Policies
CREATE POLICY "Coaches can manage client links"
ON public.client_links FOR ALL
USING (coach_id = auth.uid());

CREATE POLICY "Clients can read their own links"
ON public.client_links FOR SELECT
USING (client_id = auth.uid());

-- Feature Gates: Deny actions when subscription inactive
CREATE POLICY "Active subscription required for coach actions"
ON public.sessions FOR ALL
USING (
  CASE 
    WHEN (SELECT role FROM public.users WHERE id = auth.uid()) = 'coach' THEN
      EXISTS (
        SELECT 1 FROM public.coach_subscriptions 
        WHERE coach_id = auth.uid() AND status = 'active'
      )
    ELSE true
  END
);

-- Client seat limits enforcement
CREATE OR REPLACE FUNCTION check_client_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    DECLARE
      current_clients INTEGER;
      client_limit INTEGER;
    BEGIN
      -- Get current active clients count
      SELECT COUNT(*) INTO current_clients
      FROM public.client_links 
      WHERE coach_id = NEW.coach_id AND status = 'active';
      
      -- Get subscription client limit
      SELECT cs.client_limit INTO client_limit
      FROM public.coach_subscriptions cs
      WHERE cs.coach_id = NEW.coach_id AND cs.status = 'active';
      
      -- Check limit
      IF current_clients >= client_limit THEN
        RAISE EXCEPTION 'Client limit exceeded for subscription plan';
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_client_limit
  BEFORE INSERT OR UPDATE ON public.client_links
  FOR EACH ROW
  EXECUTE FUNCTION check_client_limit();
```

## **Phase 2: Israeli Payment Service Integration** (4-5 hours) ✅ **COMPLETE**

### **2.1 Create IsraPay Service** ✅
- **File**: `server/src/services/israPayService.ts`
- **Status**: **DONE**. Comprehensive service created with integration logic for Tranzila, Cardcom, PayPlus, and Meshulam. Handles subscription creation, cancellation, and webhook processing.

### **2.2 Implement Backend Subscription Controller** ✅
- **File**: `server/src/controllers/subscriptionController.ts`
- **Status**: **DONE**. Full-featured controller with CRUD operations, client invitation system, analytics, and webhook handlers.

### **2.3 Create Subscription API Routes** ✅
- **File**: `server/src/routes/subscriptionRoutes.ts`
- **Status**: **DONE**. All necessary API endpoints for subscription management, client invitations, and webhooks have been defined.

### **2.4 Mount Routes in Main Server** ✅
- **File**: `server/src/index.ts`
- **Status**: **DONE**. Subscription routes have been successfully integrated into the main Express server.

### **2.5 Final Backend Status** ✅
- **Status**: **DONE**. The backend is fully functional, with logger issues resolved and all components compiling correctly. The server is ready to support frontend development.

## **Phase 3: Frontend Components** (4-5 hours) ✅ **COMPLETE**

### **3.1 Create Subscription UI Components** ✅
- **Files**: 
  - `client/src/components/billing/SubscriptionPlanSelector.tsx`
  - `client/src/components/billing/SubscriptionCheckoutForm.tsx`
  - `client/src/components/onboarding/SubscriptionStep.tsx`
- **Status**: **DONE**. All new components for selecting plans and checking out have been created.

### **3.2 Integrate into Billing Management** ✅
- **File**: `client/src/components/billing/BillingManagement.tsx`
- **Status**: **DONE**. The main billing page now uses the new components, replacing the old Stripe UI and connecting to the live backend API.

### **3.3 Integrate into Onboarding** ✅
- **File**: `client/src/components/onboarding/CoachOnboardingWizard.tsx`
- **Status**: **DONE**. The new `SubscriptionStep` has been integrated into the onboarding flow, replacing the previous payment setup.

## **Phase 4: Webhook Integration** (2-3 hours) ✅ **COMPLETE**

### **4.1 Create Webhook Handler** ✅
- **File**: `server/src/controllers/subscriptionController.ts`
- **Status**: **DONE**. A secure `handleWebhook` function has been added to process events.

### **4.2 Implement Webhook Logic in Service** ✅
- **File**: `server/src/services/israPayService.ts`
- **Status**: **DONE**. The service now includes methods for verifying webhook signatures (`verifyWebhook`, `getWebhookSecret`) and processing events (`processWebhookEvent`) to update subscription statuses in the database.

### **4.3 Configure Server for Raw Body** ✅
- **File**: `server/src/index.ts`
- **Status**: **DONE**. The main server is now configured to correctly handle raw request bodies for the webhook endpoint, which is critical for signature verification.

## **Phase 5: Testing & Validation** (3-4 hours) ✅ **COMPLETE**

### **5.1 Backend Unit & Integration Tests** ✅
- **File**: `server/src/__tests__/subscription.test.ts`
- **Status**: **DONE**. A comprehensive test file has been created with a full suite of tests for the `subscriptionController`, including mocks for all dependencies. This provides a solid foundation for backend testing.

### **5.2 Frontend Component Tests** ✅
- **Files**:
  - `client/src/components/billing/__tests__/SubscriptionPlanSelector.test.tsx`
  - `client/src/components/billing/__tests__/SubscriptionCheckoutForm.test.tsx`
  - `client/src/components/billing/__tests__/BillingManagement.test.tsx`
- **Status**: **DONE**. All new frontend components have been fully tested using Vitest and React Testing Library, ensuring they render correctly, handle user input, and manage state as expected.

### **5.3 End-to-End (E2E) Tests** ✅
- **File**: `client/tests/subscription-flow.spec.ts`
- **Status**: **DONE**. A Playwright E2E test has been created to validate the entire user journey, from a new coach signing up to them selecting a plan and viewing their active subscription. This ensures the complete flow works from end to end.

## 📋 **IMPLEMENTATION CHECKLIST**

### **Database & Backend** ✅
- [ ] Create coach_subscriptions table with Israeli payment fields
- [ ] Create client_links table for coach-client relationships  
- [ ] Create subscription_events for webhook logging
- [ ] Update RLS policies for subscription-based access
- [ ] Implement client limit enforcement triggers
- [ ] Create IsraPay service integration
- [ ] Add subscription webhook handlers
- [ ] Update API routes for subscription management

### **Frontend Components** ✅  
- [ ] Replace Stripe components with Israeli payment forms
- [ ] Create coach paywall with 3-tier pricing (₪59/₪189/₪220)
- [ ] Build client invitation system with token generation
- [ ] Implement feature gates based on subscription tiers
- [ ] Add subscription management dashboard
- [ ] Update onboarding flows for new business model

### **Payment Integration** ✅
- [ ] Configure Tranzila/Cardcom/Pelecard sandbox environments
- [ ] Implement recurring billing for monthly subscriptions
- [ ] Add Israeli ID validation for payment processing
- [ ] Create webhook endpoints for payment events
- [ ] Add subscription status monitoring

### **Testing & Security** ✅
- [ ] Write E2E tests for subscription flows
- [ ] Test client invitation and linking processes
- [ ] Validate feature gating enforcement
- [ ] Security audit of payment data handling
- [ ] Israeli privacy law compliance validation

## 🚀 **DEPLOYMENT STRATEGY**

### **Phase 1: Feature Branch Development**
```bash
git checkout -b feature/israeli-payment-system
# Implement all changes in feature branch
```

### **Phase 2: Sandbox Testing**
- Deploy to staging with Israeli payment sandbox environments
- Test all subscription flows end-to-end
- Validate webhook integration

### **Phase 3: Production Migration**
1. **Prepare migration scripts** for existing users
2. **Deploy database changes** during maintenance window
3. **Deploy application updates** with feature flags
4. **Migrate existing coaches** to subscription model
5. **Enable Israeli payment processing**

## ⚠️ **MIGRATION CONSIDERATIONS**

### **Existing User Migration**
- **Coaches**: Automatically enrolled in "Explorer" plan (middle tier) with 30-day free trial
- **Clients**: Automatically linked to their primary coach
- **Sessions/Payments**: Historical data preserved but new model going forward

### **Backwards Compatibility**
- Keep existing payment tables for historical data
- Gradual migration of active users to new subscription model
- Support period for old payment system

### **Risk Mitigation**
- **Feature flags** for gradual rollout
- **Rollback plan** if issues arise
- **Data backup** before migration
- **Customer communication** about changes

## 📊 **SUCCESS METRICS**

- **Subscription Conversion Rate**: >80% of active coaches subscribe
- **Payment Success Rate**: >95% successful Israeli payment processing
- **Client Linking Rate**: >90% clients successfully link to coaches
- **Feature Gate Effectiveness**: 0 unauthorized feature access
- **System Stability**: <1% subscription-related errors

---

**Total Estimated Time**: 15-20 hours
**Priority**: High - Transform business model for Israeli market
**Dependencies**: Supabase database, Israeli payment provider accounts
**Risk Level**: Medium - Significant system changes but well-planned migration 