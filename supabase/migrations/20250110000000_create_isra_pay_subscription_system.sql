-- ISRA_PAY Coach Subscription System Migration
-- Creates tables for coach subscriptions, client links, and Israeli payment integration

-- ========================================
-- 1. COACH SUBSCRIPTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS coach_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Plan Information
    plan_code varchar(50) NOT NULL CHECK (plan_code IN ('seeker', 'explorer', 'navigator')),
    plan_name varchar(100) NOT NULL,
    status varchar(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'paused', 'past_due', 'trial')) DEFAULT 'trial',
    
    -- Pricing in Israeli Shekels
    amount_ils integer NOT NULL, -- Amount in agorot (₪59 = 5900 agorot)
    currency varchar(3) DEFAULT 'ILS',
    billing_cycle varchar(20) DEFAULT 'monthly',
    
    -- Israeli Payment Integration
    isra_pay_subscription_id varchar(255), -- External subscription ID from Israeli processor
    payment_processor varchar(50) CHECK (payment_processor IN ('tranzila', 'cardcom', 'payplus', 'meshulam')),
    payment_method_token varchar(255), -- Stored payment method token
    
    -- Subscription Lifecycle
    trial_start timestamp with time zone,
    trial_end timestamp with time zone,
    current_period_start timestamp with time zone NOT NULL DEFAULT now(),
    current_period_end timestamp with time zone NOT NULL,
    next_billing_date timestamp with time zone,
    cancelled_at timestamp with time zone,
    
    -- Plan Limits
    client_limit integer NOT NULL,
    includes_guided_audio boolean DEFAULT false,
    includes_workshops boolean DEFAULT false,
    includes_priority_support boolean DEFAULT false,
    
    -- Metadata
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Constraints
    CONSTRAINT coach_subscriptions_coach_unique UNIQUE(coach_id),
    CONSTRAINT coach_subscriptions_valid_trial CHECK (
        (trial_start IS NULL AND trial_end IS NULL) OR 
        (trial_start IS NOT NULL AND trial_end IS NOT NULL AND trial_end > trial_start)
    )
);

-- ========================================
-- 2. CLIENT LINKS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS client_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    client_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Invitation System
    invitation_token varchar(255) UNIQUE,
    invitation_email varchar(255),
    invitation_sent_at timestamp with time zone,
    invitation_expires_at timestamp with time zone,
    
    -- Link Status
    status varchar(20) NOT NULL CHECK (status IN ('pending', 'active', 'inactive', 'blocked')) DEFAULT 'pending',
    linked_at timestamp with time zone,
    
    -- Metadata
    notes text,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Constraints
    CONSTRAINT client_links_coach_client_unique UNIQUE(coach_id, client_id),
    CONSTRAINT client_links_valid_invitation CHECK (
        (invitation_token IS NULL AND invitation_email IS NULL) OR 
        (invitation_token IS NOT NULL AND invitation_email IS NOT NULL)
    )
);

-- ========================================
-- 3. SUBSCRIPTION EVENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS subscription_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id uuid NOT NULL REFERENCES coach_subscriptions(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type varchar(50) NOT NULL,
    event_data jsonb NOT NULL DEFAULT '{}',
    
    -- Israeli Payment Integration
    isra_pay_event_id varchar(255),
    payment_processor varchar(50),
    
    -- Processing Status
    processed boolean DEFAULT false,
    processed_at timestamp with time zone,
    error_message text,
    retry_count integer DEFAULT 0,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    
    -- Indexes
    CONSTRAINT subscription_events_valid_retry CHECK (retry_count >= 0)
);

-- ========================================
-- 4. PLAN DEFINITIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Plan Details
    plan_code varchar(50) NOT NULL UNIQUE,
    plan_name varchar(100) NOT NULL,
    description text,
    
    -- Pricing
    amount_ils integer NOT NULL,
    currency varchar(3) DEFAULT 'ILS',
    
    -- Features
    client_limit integer NOT NULL,
    includes_guided_audio boolean DEFAULT false,
    includes_workshops boolean DEFAULT false,
    includes_priority_support boolean DEFAULT false,
    
    -- Status
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    
    -- Metadata
    features jsonb DEFAULT '[]',
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- 5. INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_coach_subscriptions_coach_id ON coach_subscriptions(coach_id);
CREATE INDEX idx_coach_subscriptions_plan_code ON coach_subscriptions(plan_code);
CREATE INDEX idx_coach_subscriptions_status ON coach_subscriptions(status);
CREATE INDEX idx_coach_subscriptions_next_billing ON coach_subscriptions(next_billing_date);
CREATE INDEX idx_coach_subscriptions_isra_pay_id ON coach_subscriptions(isra_pay_subscription_id);

CREATE INDEX idx_client_links_coach_id ON client_links(coach_id);
CREATE INDEX idx_client_links_client_id ON client_links(client_id);
CREATE INDEX idx_client_links_status ON client_links(status);
CREATE INDEX idx_client_links_invitation_token ON client_links(invitation_token);
CREATE INDEX idx_client_links_invitation_expires ON client_links(invitation_expires_at);

CREATE INDEX idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX idx_subscription_events_processed ON subscription_events(processed);
CREATE INDEX idx_subscription_events_created_at ON subscription_events(created_at);

-- ========================================
-- 6. UPDATED_AT TRIGGERS
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_coach_subscriptions_updated_at 
    BEFORE UPDATE ON coach_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_links_updated_at 
    BEFORE UPDATE ON client_links 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at 
    BEFORE UPDATE ON subscription_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. CLIENT LIMIT ENFORCEMENT FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION enforce_client_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_client_count integer;
    coach_client_limit integer;
BEGIN
    -- Get current active client count for this coach
    SELECT COUNT(*) INTO current_client_count
    FROM client_links
    WHERE coach_id = NEW.coach_id AND status = 'active';
    
    -- Get coach's subscription client limit
    SELECT cs.client_limit INTO coach_client_limit
    FROM coach_subscriptions cs
    WHERE cs.coach_id = NEW.coach_id AND cs.status = 'active';
    
    -- If no active subscription, default to 0 limit
    IF coach_client_limit IS NULL THEN
        coach_client_limit := 0;
    END IF;
    
    -- Enforce limit (allow if current count is less than limit)
    IF current_client_count >= coach_client_limit THEN
        RAISE EXCEPTION 'Client limit exceeded. Coach subscription allows % clients, but % are already active.', 
                       coach_client_limit, current_client_count;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply client limit trigger
CREATE TRIGGER enforce_client_limit_trigger
    BEFORE INSERT OR UPDATE ON client_links
    FOR EACH ROW 
    WHEN (NEW.status = 'active')
    EXECUTE FUNCTION enforce_client_limit();

-- ========================================
-- 8. RLS POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE coach_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Coach Subscriptions Policies
CREATE POLICY "Coaches can view their own subscription" ON coach_subscriptions
    FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "Coaches can update their own subscription" ON coach_subscriptions
    FOR UPDATE USING (coach_id = auth.uid());

-- System can create/manage subscriptions (via service role)
CREATE POLICY "Service role can manage subscriptions" ON coach_subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Client Links Policies
CREATE POLICY "Coaches can view their client links" ON client_links
    FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "Coaches can manage their client links" ON client_links
    FOR ALL USING (coach_id = auth.uid());

CREATE POLICY "Clients can view their own links" ON client_links
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Clients can update their link status" ON client_links
    FOR UPDATE USING (client_id = auth.uid());

-- Subscription Events Policies (system access only)
CREATE POLICY "Service role can manage subscription events" ON subscription_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Coaches can view their subscription events" ON subscription_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM coach_subscriptions cs 
            WHERE cs.id = subscription_events.subscription_id 
            AND cs.coach_id = auth.uid()
        )
    );

-- Subscription Plans Policies (read-only for users)
CREATE POLICY "Everyone can view active plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage plans" ON subscription_plans
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- 9. INSERT DEFAULT SUBSCRIPTION PLANS
-- ========================================
INSERT INTO subscription_plans (plan_code, plan_name, description, amount_ils, client_limit, includes_guided_audio, includes_workshops, includes_priority_support, features, display_order) VALUES
(
    'seeker',
    'Seeker Coach',
    'Perfect for new coaches starting their journey',
    5900, -- ₪59.00 in agorot
    10,
    false,
    false,
    false,
    '[
        "Up to 10 clients",
        "Basic session management",
        "Client progress tracking",
        "Email support",
        "Mobile app access"
    ]'::jsonb,
    1
),
(
    'explorer',
    'Explorer Coach',
    'Ideal for growing coaches expanding their practice',
    18900, -- ₪189.00 in agorot
    30,
    true,
    false,
    false,
    '[
        "Up to 30 clients",
        "All Seeker features",
        "Guided audio sessions",
        "Advanced analytics",
        "Priority email support",
        "Reflection templates"
    ]'::jsonb,
    2
),
(
    'navigator',
    'Navigator Coach',
    'Complete solution for established coaching professionals',
    22000, -- ₪220.00 in agorot
    -1, -- Unlimited clients
    true,
    true,
    true,
    '[
        "Unlimited clients",
        "All Explorer features",
        "Workshop hosting",
        "Priority phone support",
        "Custom branding",
        "Advanced integrations",
        "Dedicated account manager"
    ]'::jsonb,
    3
);

-- ========================================
-- 10. HELPER FUNCTIONS
-- ========================================

-- Function to get coach's current subscription
CREATE OR REPLACE FUNCTION get_coach_subscription(coach_uuid uuid)
RETURNS coach_subscriptions AS $$
DECLARE
    subscription coach_subscriptions;
BEGIN
    SELECT * INTO subscription
    FROM coach_subscriptions
    WHERE coach_id = coach_uuid AND status = 'active'
    LIMIT 1;
    
    RETURN subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if coach can access feature
CREATE OR REPLACE FUNCTION coach_can_access_feature(coach_uuid uuid, feature_name text)
RETURNS boolean AS $$
DECLARE
    subscription coach_subscriptions;
    can_access boolean := false;
BEGIN
    SELECT * INTO subscription FROM get_coach_subscription(coach_uuid);
    
    IF subscription IS NULL THEN
        RETURN false;
    END IF;
    
    CASE feature_name
        WHEN 'guided_audio' THEN
            can_access := subscription.includes_guided_audio;
        WHEN 'workshops' THEN
            can_access := subscription.includes_workshops;
        WHEN 'priority_support' THEN
            can_access := subscription.includes_priority_support;
        ELSE
            can_access := false;
    END CASE;
    
    RETURN can_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active client count for coach
CREATE OR REPLACE FUNCTION get_coach_active_client_count(coach_uuid uuid)
RETURNS integer AS $$
DECLARE
    client_count integer;
BEGIN
    SELECT COUNT(*) INTO client_count
    FROM client_links
    WHERE coach_id = coach_uuid AND status = 'active';
    
    RETURN COALESCE(client_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 11. VIEWS FOR EASY QUERYING
-- ========================================

-- View for coach subscription details with plan info
CREATE OR REPLACE VIEW coach_subscription_details AS
SELECT 
    cs.*,
    sp.plan_name as plan_display_name,
    sp.description as plan_description,
    sp.features as plan_features,
    get_coach_active_client_count(cs.coach_id) as active_client_count,
    CASE 
        WHEN cs.client_limit = -1 THEN 'unlimited'
        ELSE cs.client_limit::text
    END as client_limit_display
FROM coach_subscriptions cs
JOIN subscription_plans sp ON cs.plan_code = sp.plan_code
WHERE cs.status = 'active';

-- View for client invitation status
CREATE OR REPLACE VIEW client_invitation_status AS
SELECT 
    cl.*,
    p_coach.name as coach_name,
    p_coach.email as coach_email,
    p_client.name as client_name,
    p_client.email as client_email,
    CASE 
        WHEN cl.invitation_expires_at < now() THEN 'expired'
        WHEN cl.status = 'pending' AND cl.invitation_token IS NOT NULL THEN 'pending'
        ELSE cl.status
    END as effective_status
FROM client_links cl
JOIN profiles p_coach ON cl.coach_id = p_coach.id
LEFT JOIN profiles p_client ON cl.client_id = p_client.id;

-- ========================================
-- 12. AUDIT FUNCTIONS (OPTIONAL)
-- ========================================

-- Function to log subscription changes
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subscription_events (subscription_id, event_type, event_data)
    VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW),
            'changed_at', now(),
            'changed_by', auth.uid()
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to subscriptions
CREATE TRIGGER audit_coach_subscriptions
    AFTER INSERT OR UPDATE OR DELETE ON coach_subscriptions
    FOR EACH ROW EXECUTE FUNCTION log_subscription_change(); 