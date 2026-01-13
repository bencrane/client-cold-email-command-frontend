-- =============================================
-- STAGING SCHEMA (HQ DB)
-- Views for lead projection pipeline
-- =============================================

-- Create staging schema
CREATE SCHEMA IF NOT EXISTS staging;

-- Grant permissions (required for API access)
GRANT USAGE ON SCHEMA staging TO anon, authenticated, service_role;

-- =============================================
-- COMPLETE_LEADS_FOR_PROJECTION VIEW
-- Joins person profiles with experience and company data
-- Filters to alumni only (is_current = false)
-- =============================================
CREATE OR REPLACE VIEW staging.complete_leads_for_projection AS
SELECT
    -- Person profile fields
    pp.linkedin_url,
    pp.first_name,
    pp.last_name,
    pp.full_name,
    pp.headline,
    pp.summary,
    pp.country,
    pp.location_name,
    pp.picture_url,

    -- Experience fields (the alumni job)
    pe.title,
    pe.company AS company_name,
    pe.company_domain,
    pe.company_linkedin_url,
    pe.start_date,
    pe.end_date,
    pe.is_current,

    -- Company firmographics
    cf.industry,
    cf.employee_count,
    cf.size_range AS employee_count_range,
    cf.founded_year,
    cf.locality AS headquarters_locality,
    cf.country AS headquarters_country,
    cf.description AS company_description,
    cf.linkedin_url AS company_linkedin_url_firmographics,
    cf.website

FROM extracted.person_profile pp
INNER JOIN extracted.person_experience pe
    ON pp.linkedin_url = pe.linkedin_url
INNER JOIN extracted.company_firmographics cf
    ON pe.company_domain = cf.company_domain
WHERE pe.is_current = false;

-- Grant access to the view
GRANT SELECT ON staging.complete_leads_for_projection TO anon, authenticated, service_role;
