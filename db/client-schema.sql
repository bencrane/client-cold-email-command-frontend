-- =============================================
-- CLIENT SCHEMA
-- Customer company data for GTM intelligence
-- =============================================

-- Create client schema
CREATE SCHEMA IF NOT EXISTS client;

-- =============================================
-- FLATTENED_CUSTOMER_COMPANIES
-- Company records linked to organizations
-- =============================================
CREATE TABLE client.flattened_customer_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    domain TEXT NOT NULL,
    linkedin_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_flattened_customer_companies_org_id ON client.flattened_customer_companies(org_id);
CREATE INDEX idx_flattened_customer_companies_domain ON client.flattened_customer_companies(domain);

-- Trigger for updated_at
CREATE TRIGGER update_flattened_customer_companies_updated_at
    BEFORE UPDATE ON client.flattened_customer_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE client.flattened_customer_companies ENABLE ROW LEVEL SECURITY;
