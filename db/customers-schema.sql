-- =============================================
-- CUSTOMERS DB SCHEMA
-- B2B SaaS GTM Intelligence & Outbound Automation
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ORGANIZATIONS
-- Company accounts that subscribe to the platform
-- =============================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    website VARCHAR(255),
    industry VARCHAR(100),
    company_size VARCHAR(50), -- e.g., '1-10', '11-50', '51-200', '201-500', '500+'
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_domain ON organizations(domain);

-- =============================================
-- SUBSCRIPTIONS
-- Billing and plan information for organizations
-- =============================================

-- Plan tier enum
CREATE TYPE plan_tier AS ENUM (
    'free',
    'starter',
    'growth',
    'scale',
    'enterprise'
);

-- Subscription status enum
CREATE TYPE subscription_status AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
);

-- Billing cycle enum
CREATE TYPE billing_cycle AS ENUM (
    'monthly',
    'yearly'
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_tier plan_tier NOT NULL DEFAULT 'free',
    status subscription_status NOT NULL DEFAULT 'trialing',
    billing_cycle billing_cycle DEFAULT 'monthly',

    -- Billing period
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,

    -- Stripe integration
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_price_id VARCHAR(255),

    -- Usage limits based on plan
    seats_limit INTEGER DEFAULT 1,
    leads_limit INTEGER DEFAULT 100,
    campaigns_limit INTEGER DEFAULT 1,
    emails_per_month_limit INTEGER DEFAULT 500,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one active subscription per org
    CONSTRAINT unique_active_subscription UNIQUE (organization_id)
);

-- Indexes
CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- =============================================
-- SUBSCRIPTION HISTORY
-- Track plan changes and billing events
-- =============================================
CREATE TABLE subscription_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'created', 'upgraded', 'downgraded', 'canceled', 'renewed', 'payment_failed'
    previous_plan plan_tier,
    new_plan plan_tier,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscription_events_subscription_id ON subscription_events(subscription_id);

-- =============================================
-- TRIGGERS
-- Auto-update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS for Supabase
-- =============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
