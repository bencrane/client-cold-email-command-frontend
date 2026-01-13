# AI Onboarding Guide

## Project Overview

This is **Bullseye Revenue** - a B2B SaaS GTM intelligence dashboard built with Next.js. The app helps organizations manage leads, campaigns, and outbound email automation.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: better-auth (email/password)
- **Database**: Supabase (PostgreSQL) - multiple projects

## Database Architecture

There are **three separate Supabase projects**:

| Database | Purpose | Env Prefix |
|----------|---------|------------|
| **Auth DB** | User authentication, sessions | `AUTH_DB_*`, `AUTH_DATABASE_URL` |
| **Customers DB** | Organizations, subscriptions, leads | `CUSTOMERS_DB_*` |
| **HQ DB** | LinkedIn data, firmographics, staging views | `HQ_DB_*` |

### Key Tables

- `Auth DB`: `user`, `session`, `account` (managed by better-auth)
- `Customers DB`: `organizations`, `subscriptions`, `client.flattened_customer_companies`, `product.org_leads`
- `HQ DB`: `extracted.person_profile`, `extracted.person_experience`, `extracted.company_firmographics`, `staging.complete_leads_for_projection`

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Protected routes with sidebar
│   │   ├── admin/            # Admin dashboard with cards
│   │   ├── all-leads/        # Leads table with filters
│   │   ├── lead-lists/       # (placeholder)
│   │   ├── campaigns/        # (placeholder)
│   │   └── master-inbox/     # (placeholder)
│   ├── api/
│   │   ├── auth/[...all]/    # better-auth handler
│   │   ├── leads/            # Leads API with filtering
│   │   └── user/link-org/    # Links users to orgs by email domain
│   ├── sign-in/
│   └── sign-up/
├── components/
│   └── Sidebar.tsx           # Main navigation sidebar
├── lib/
│   ├── auth.ts               # Server-side auth config
│   └── auth-client.ts        # Client-side auth hooks
db/
├── customers-schema.sql
├── auth-schema.sql
├── client-schema.sql
├── product-schema.sql
├── hq-staging-schema.sql
└── SUPABASE_SETUP.md
```

## Authentication Flow

1. Users sign up/sign in via better-auth
2. On signup, `/api/user/link-org` extracts email domain and links user to matching organization
3. Session managed via cookies (`better-auth.session_token`)

## Admin Features

- Admin email: `tools@substrate.build`
- Admin can impersonate test accounts via localStorage (no password needed)
- Test accounts: `sarah@acmecorp.com`, `rachel@betainc.com`, `nicole@gammallc.com`

## Development

```bash
# Start dev server on port 3001
npm run dev -- -p 3001

# Environment variables required
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Working with Supabase

### Custom Schemas
Tables in custom schemas (`client`, `product`, `staging`) require:
1. Schema exposed in Supabase Dashboard (Settings > API > Exposed schemas)
2. Grants applied:
```sql
GRANT USAGE ON SCHEMA <schema_name> TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA <schema_name> TO anon, authenticated, service_role;
```

### Querying Custom Schemas
```typescript
const { data } = await supabase
  .schema("product")
  .from("org_leads")
  .select("*");
```

## API Conventions

- All API routes in `src/app/api/`
- Use `CUSTOMERS_DB_*` credentials for org/leads data
- Use `AUTH_DB_*` credentials for user data
- Support impersonation via `?email=` query param for admin testing

## Important Notes

1. **Port**: App runs on 3001 (not 3000)
2. **Multi-tenant**: Data filtered by `org_id` from user's `organizationId`
3. **No sidebar nav**: Navigation is through Admin dashboard cards
4. **Security is relaxed**: This is a prototype - impersonation has no auth checks
