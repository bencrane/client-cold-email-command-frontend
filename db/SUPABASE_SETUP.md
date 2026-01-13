# Supabase Setup Notes

## Exposing Custom Schemas

When creating tables in a custom schema (e.g., `client`), you must:

### 1. Expose the schema via API

Go to: **Supabase Dashboard → Settings → API → Exposed schemas**

Add your custom schema name (e.g., `client`) to the list.

### 2. Grant permissions

Run this SQL after creating tables in a custom schema:

```sql
-- Replace 'client' with your schema name
GRANT USAGE ON SCHEMA client TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA client TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA client TO anon, authenticated, service_role;
```

### 3. Access from code

When using the Supabase client, specify the schema:

```typescript
const customersDb = createClient(url, key, {
  db: { schema: 'client' }
});

// Now you can query tables in the client schema
const { data } = await customersDb.from('flattened_customer_companies').select('*');
```

## Current Schemas

| Database | Schema | Tables |
|----------|--------|--------|
| Customers DB | `public` | organizations, subscriptions, subscription_events |
| Customers DB | `client` | flattened_customer_companies |
| Auth DB | `public` | user, session, account, verification, users, roles, permissions, etc. |

---

## Edge Functions

### Deploying Edge Functions

1. **Install Supabase CLI** (if not installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project** (Customers DB project):
   ```bash
   supabase link --project-ref kwzklhavhpnpdzdqknoz
   ```

4. **Set environment variables** for the function:
   ```bash
   supabase secrets set INGEST_API_KEY=your-secret-api-key
   supabase secrets set CUSTOMERS_DB_URL=https://kwzklhavhpnpdzdqknoz.supabase.co
   supabase secrets set CUSTOMERS_DB_SERVICE_KEY=your-service-key
   ```

5. **Deploy the function**:
   ```bash
   supabase functions deploy ingest-customer-companies
   ```

### Available Edge Functions

#### `ingest-customer-companies`

Ingests company data from Clay into `client.flattened_customer_companies`.

**Endpoint**: `https://kwzklhavhpnpdzdqknoz.supabase.co/functions/v1/ingest-customer-companies`

**Method**: POST

**Headers**:
- `x-api-key`: Your INGEST_API_KEY
- `Content-Type`: application/json

**Request Body**:
```json
{
  "org_id": "uuid-of-organization",
  "companies": [
    {
      "company_name": "Acme Inc",
      "domain": "acme.com",
      "linkedin_url": "https://linkedin.com/company/acme"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "count": 1,
  "message": "Successfully processed 1 companies"
}
```

---

## Required SQL for Edge Functions

Before using `ingest-customer-companies`, add unique constraint for upsert:

```sql
-- Run in Customers DB
ALTER TABLE client.flattened_customer_companies
ADD CONSTRAINT unique_org_domain UNIQUE (org_id, domain);
```
