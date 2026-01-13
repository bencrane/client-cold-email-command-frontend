# Project Update - Bullseye Revenue Dashboard

## Overview

Built a Next.js frontend for **app.bullseyerevenue.com** - a B2B SaaS GTM intelligence platform that helps organizations manage leads and outbound campaigns.

---

## What's Been Built

### 1. Authentication System

**Stack**: better-auth with PostgreSQL adapter

**Features**:
- Email/password sign-in and sign-up
- Session management with 7-day expiry
- Domain-based user-to-organization linking (e.g., `@acmecorp.com` → Acme Corp)

**Files**:
- `src/lib/auth.ts` - Server-side better-auth config
- `src/lib/auth-client.ts` - Client-side auth hooks
- `src/app/api/auth/[...all]/route.ts` - Auth API handler
- `src/app/sign-in/page.tsx` - Sign in page
- `src/app/sign-up/page.tsx` - Sign up page
- `src/app/api/user/link-org/route.ts` - Links users to orgs by email domain

### 2. Database Architecture

**Three Supabase Projects**:

| Database | URL Variable | Purpose |
|----------|-------------|---------|
| Auth DB | `AUTH_DB_URL` | User accounts, sessions |
| Customers DB | `CUSTOMERS_DB_URL` | Organizations, leads |
| HQ DB | `HQ_DB_URL` | LinkedIn data, firmographics |

**Schemas Created**:

```
Auth DB (guencekybjtvzaasyvhr.supabase.co)
├── public.user
├── public.session
└── public.account

Customers DB (kwzklhavhpnpdzdqknoz.supabase.co)
├── public.organizations
├── public.subscriptions
├── client.flattened_customer_companies
└── product.org_leads

HQ DB (ivcemmeywnlhykbuafwv.supabase.co)
├── extracted.person_profile
├── extracted.person_experience
├── extracted.company_firmographics
└── staging.complete_leads_for_projection (VIEW)
```

**SQL Files**:
- `db/customers-schema.sql`
- `db/auth-schema.sql`
- `db/client-schema.sql`
- `db/product-schema.sql`
- `db/hq-staging-schema.sql`
- `db/SUPABASE_SETUP.md`

### 3. Dashboard Layout

**Structure**:
- Sidebar with GTM Dashboard header (links to /admin)
- Test account switcher (admin only)
- User info and sign out at bottom

**Files**:
- `src/components/Sidebar.tsx`
- `src/app/(dashboard)/layout.tsx`

### 4. Admin Dashboard

**Route**: `/admin`

**Features**:
- Card-based navigation to main features
- Cards: All Leads (functional), Lead Lists, Campaigns, Master Inbox (not yet functional)

**File**: `src/app/(dashboard)/admin/page.tsx`

### 5. All Leads Page

**Route**: `/all-leads`

**Features**:
- Table displaying leads from `product.org_leads`
- Filter sidebar with:
  - Search (name, company, title)
  - Industry dropdown
  - Employee Range dropdown
  - Country dropdown
  - Title search
- "Clear all" filters button
- Total leads count
- Multi-tenant: shows only current org's leads

**Files**:
- `src/app/(dashboard)/all-leads/page.tsx`
- `src/app/api/leads/route.ts`

### 6. Leads API

**Endpoint**: `GET /api/leads`

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `email` | string | Impersonation email (admin) |
| `search` | string | Partial match on name/title/company |
| `industry` | string | Exact match |
| `employee_range` | string | Exact match |
| `country` | string | Exact match |
| `title` | string | Partial match |
| `limit` | number | Default 50 |
| `offset` | number | Default 0 |

**Response**:
```json
{
  "leads": [...],
  "total": 123
}
```

### 7. Admin Impersonation

**Purpose**: Allow admin to view app as different test users without signing out

**How it works**:
1. Admin clicks test account in sidebar
2. Email stored in `localStorage.impersonate_email`
3. All API calls include `?email=` param
4. API looks up that user's org and returns their data
5. "Back to Admin" button clears impersonation

**Test Accounts**:
- `sarah@acmecorp.com` (Acme Corp)
- `rachel@betainc.com` (Beta Inc)
- `nicole@gammallc.com` (Gamma LLC)

### 8. Edge Function

**Function**: `ingest-customer-companies`

**Purpose**: Clay integration to POST customer company data

**Location**: Deployed in Customers DB Supabase project

**Endpoint**: `POST /functions/v1/ingest-customer-companies`

**Payload**:
```json
{
  "org_id": "uuid",
  "companies": [
    { "domain": "...", "name": "...", ... }
  ]
}
```

### 9. HQ Staging View

**View**: `staging.complete_leads_for_projection`

**Purpose**: Join person profiles with experience and company firmographics for lead projection pipeline

**Joins**:
- `extracted.person_profile` → `extracted.person_experience` (on linkedin_url)
- `extracted.person_experience` → `extracted.company_firmographics` (on company_domain)

**Filter**: `is_current = false` (alumni only)

---

## Environment Variables

```env
# HQ DB
HQ_DB_URL=https://ivcemmeywnlhykbuafwv.supabase.co
HQ_DB_ANON_KEY=...
HQ_DB_SERVICE_KEY=...

# Customers DB
CUSTOMERS_DB_URL=https://kwzklhavhpnpdzdqknoz.supabase.co
CUSTOMERS_DB_ANON_KEY=...
CUSTOMERS_DB_SERVICE_KEY=...

# Auth DB
AUTH_DB_URL=https://guencekybjtvzaasyvhr.supabase.co
AUTH_DATABASE_URL=postgresql://...
AUTH_DB_ANON_KEY=...
AUTH_DB_SERVICE_KEY=...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

---

## Routes Summary

| Route | Description | Status |
|-------|-------------|--------|
| `/sign-in` | Sign in page | Done |
| `/sign-up` | Sign up page | Done |
| `/admin` | Admin dashboard with cards | Done |
| `/all-leads` | Leads table with filters | Done |
| `/lead-lists` | Lead lists management | Placeholder |
| `/campaigns` | Campaign management | Placeholder |
| `/master-inbox` | Unified inbox | Placeholder |

---

## Next Steps

1. **Lead Lists Page**: Create and manage lead lists from All Leads
2. **Campaigns Page**: Campaign creation and management
3. **Master Inbox**: Unified inbox for campaign responses
4. **Production Deployment**: Configure for app.bullseyerevenue.com
5. **Real Data**: Connect to actual lead data pipeline
