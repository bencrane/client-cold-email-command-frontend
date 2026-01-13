-- =============================================
-- PRODUCT SCHEMA
-- Leads data for GTM intelligence
-- =============================================

-- Create product schema
CREATE SCHEMA IF NOT EXISTS product;

-- Grant permissions (required for API access)
GRANT USAGE ON SCHEMA product TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA product TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA product TO anon, authenticated, service_role;

-- =============================================
-- ORG_LEADS
-- People/leads matched to customer companies
-- =============================================
CREATE TABLE product.org_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    linkedin_url TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    headline TEXT,
    summary TEXT,
    country TEXT,
    location_name TEXT,
    picture_url TEXT,
    latest_title TEXT,
    latest_company TEXT,
    latest_company_domain TEXT,
    latest_company_linkedin_url TEXT,
    latest_start_date DATE,
    latest_is_current BOOLEAN,
    matched_customer_domain TEXT NOT NULL, -- domain from client.flattened_customer_companies this person matched on
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint for upsert
ALTER TABLE product.org_leads
ADD CONSTRAINT unique_org_lead UNIQUE (org_id, linkedin_url, matched_customer_domain);

-- Indexes
CREATE INDEX idx_org_leads_org_id ON product.org_leads(org_id);
CREATE INDEX idx_org_leads_latest_company_domain ON product.org_leads(latest_company_domain);
CREATE INDEX idx_org_leads_matched_customer_domain ON product.org_leads(matched_customer_domain);
CREATE INDEX idx_org_leads_latest_start_date ON product.org_leads(latest_start_date);

-- Enable RLS
ALTER TABLE product.org_leads ENABLE ROW LEVEL SECURITY;
