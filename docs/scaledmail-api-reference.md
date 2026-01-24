# ScaledMail API Reference

## Overview

ScaledMail is an email infrastructure service for cold outreach that provides pre-warmed email inboxes, domain management, and integration with email sequencers.

**Base URL:** `https://server.scaledmail.com/api/v1`

## Authentication

All API requests must include a Bearer token in the `Authorization` header.

```bash
curl --location 'https://server.scaledmail.com/api/v1/organizations' \
--header 'Authorization: Bearer YOUR_API_KEY'
```

## Required Parameter: organization_id

All endpoints require an `organization_id` query parameter. Each organization is a separate environment within your account for managing domains, inboxes, and campaigns.

## Rate Limits

| Limit | Note |
|-------|------|
| 5 requests per second | Exceeding the limit may result in temporary blocks |
| 15 requests per minute | For domain search/purchase endpoints |

---

## Organizations

### Get Organizations

Retrieve all organizations associated with your account.

**Endpoint:** `GET /organizations`

**Response:** `200 OK`

```json
{}
```

---

## Pre-Warm Inboxes

### Get Pre-Warm Inboxes

Returns all available pre-warmed inboxes for Google and Outlook, including their pricing details and warm-up age (in months).

**Endpoint:** `GET /pre-warm-inboxes?organization_id={org_id}`

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `total` | integer | Total number of pre-warmed inboxes |
| `google` | array | List of Google pre-warmed inboxes |
| `outlook` | array | List of Outlook pre-warmed inboxes |

**Inbox Object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique inbox identifier |
| `domain` | string | Domain name |
| `warmup_age` | integer | Warm-up age in months |
| `emailMailboxCount` | integer | Number of mailboxes on domain |
| `pricing` | object | Pricing details |
| `pricing.oneTimePrice` | number | One-time setup price |
| `pricing.monthlyPrice` | number | Monthly recurring price |
| `emailMailbox` | array | List of mailboxes (optional) |

**Response Example:**

```json
{
  "total": 4,
  "google": [
    {
      "warmup_age": 1,
      "id": "recLuIthqG59R4nmZ",
      "domain": "1apitestgoogle.com",
      "emailMailboxCount": 2,
      "pricing": {
        "oneTimePrice": 23,
        "monthlyPrice": 8
      },
      "emailMailbox": [
        {
          "first_name": "James",
          "last_name": "Smith",
          "alias": "james.smith"
        },
        {
          "first_name": "James",
          "last_name": "Smith",
          "alias": "james"
        }
      ]
    }
  ],
  "outlook": [
    {
      "warmup_age": 2,
      "id": "rec0tZOQtwjJwYutj",
      "domain": "forgepathbase.com",
      "emailMailboxCount": 25,
      "pricing": {
        "oneTimePrice": 30,
        "monthlyPrice": 50
      }
    }
  ]
}
```

### Buy Pre-Warm Inboxes

Purchase pre-warmed inboxes and automatically assign them to domains.

**Endpoint:** `POST /buy-pre-warm-inboxes?organization_id={org_id}`

> **Requires a connected payment method.** A subscription and pre-warm inboxes will be created automatically if available once the request is successful.

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tag` | string | No | Custom tag for internal tracking |
| `domains` | array | Yes | Array of domain objects for pre-warm inbox creation |
| `sequencer` | object | No | Sequencer configuration for automatic inbox connection |

**Domain Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Internal domain record ID |
| `domain` | string | Yes | Domain name |
| `redirect` | string | No | Redirect URL for the domain |

**Sequencer Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | Yes | Sequencer provider (e.g. `Instantly`) |
| `username` | string | Yes | Sequencer account username |
| `password` | string | Yes | Sequencer account password |
| `link` | string | Yes | Sequencer dashboard URL |
| `workspace` | string | No | Workspace or account name |
| `tag` | string | No | Tag to apply inside the sequencer (use `{{ID}}` for payment ID) |

**Request Example:**

```json
{
  "tag": "client1",
  "domains": [
    {
      "id": "recscFIvHSqKwxfyp",
      "domain": "1apitestoutlook.com",
      "redirect": "bello.com"
    },
    {
      "id": "recLuIthqG59R4nmZ",
      "domain": "1apitestgoogle.com"
    }
  ],
  "sequencer": {
    "provider": "Instantly",
    "username": "ross@instantly.ai",
    "password": "InstantlyRoss456!",
    "link": "https://app.instantly.ai",
    "workspace": "paleontology-outreach",
    "tag": "{{ID}}"
  }
}
```

---

## Domains

### Get Domains

Retrieve all domains for an organization.

**Endpoint:** `GET /domains?organization_id={org_id}`

### Get Purchased Domains

Retrieve all purchased domains for an organization.

**Endpoint:** `GET /purchased-domains?organization_id={org_id}`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `available` | boolean | No | `false` | Filter for domains which can be used for new orders |

### Search Domains

Search for domain availability and pricing.

**Endpoint:** `POST /search-domains?organization_id={org_id}`

> **Rate Limits:** Maximum of 10 domains per request. Rate-limited to 15 requests per minute.

**Request Body:**

```json
{
  "domains": ["scaledmail.com", "beanstalk.com"]
}
```

**Response:**

```json
[
  {
    "domain": "utscaledmail.net",
    "status": "available",
    "price": 16.31,
    "renewPrice": 16.31
  },
  {
    "domain": "scaledmail.com",
    "status": "taken",
    "price": null,
    "renewPrice": null
  }
]
```

### Buy Domains

Purchase domains through ScaledMail.

**Endpoint:** `POST /buy-domains?organization_id={org_id}`

> **Requires a connected payment method.** Maximum of 10 domains per request. All domains must be available for purchase.

**Request Body:**

```json
{
  "domains": ["scaledmail.com", "beanstalk.com"]
}
```

### Swap Domain

Swap an existing domain with a new one.

**Endpoint:** `POST /swap-domain/{domain}?organization_id={org_id}&provider={provider}`

**Provider Values:**
- `scaledmail` - Domain purchased through ScaledMail
- `other` - Domain from external providers like Porkbun, Namecheap, or DNSimple

**Request Body (for external domains):**

```json
{
  "hosting": {
    "provider": "Hosting Provider Name",
    "username": "username",
    "password": "password"
  },
  "new_domain": "scaledmailgo.com"
}
```

---

## Packages

### Get Packages

Retrieve all available packages.

**Endpoint:** `GET /packages`

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `total` | integer | Total number of packages |
| `packages` | array | List of package objects |

**Package Object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique package identifier (Stripe price ID) |
| `tier` | string | Package tier (`low-sending`, `medium-sending`, `high-sending`) |
| `name` | string | Package name |
| `mode` | string | Billing mode (`subscription`) |
| `price` | number | Package price |
| `domains` | integer | Number of domains included |
| `google` | object | Google mailbox configuration |
| `microsoft` | object | Microsoft mailbox configuration |
| `frequency` | string | Billing frequency (`/monthly`) |

**Response Example:**

```json
{
  "total": 3,
  "packages": [
    {
      "id": "price_1RwQijBUS24WVOL3fBhLhYPp",
      "tier": "low-sending",
      "name": "SM Google 70% - SM MS 30%",
      "mode": "subscription",
      "price": 199,
      "domains": 12,
      "google": { "mailbox": 20 },
      "microsoft": { "mailbox": 100, "domains": 2 },
      "frequency": "/monthly"
    }
  ]
}
```

---

## Orders

### Get Orders

Retrieve all orders for an organization.

**Endpoint:** `GET /orders?organization_id={org_id}`

**Response:**

```json
{
  "total": 2,
  "payments": [
    {
      "id": "rec0LZaZRIFUx2o1",
      "amount": 120,
      "created_at": "2025-08-06T19:19:49.000Z",
      "status": "Active",
      "description": "SM - Microsoft"
    }
  ]
}
```

### Get Order Details

Retrieve details for a specific order.

**Endpoint:** `GET /orders/{order_id}?organization_id={org_id}`

**Response:**

```json
{
  "id": "rec1x2bxelbC9T",
  "created_at": "2025-10-31T18:49:50.000Z",
  "amount": 80,
  "tag": "",
  "status": "Active",
  "description": "SM - Google",
  "invoices": [],
  "total_domains": 80,
  "packages": [
    {
      "type": "Google",
      "id": "recFxLhtiT4sd",
      "note": "",
      "payment_id": "rec1x2bxelbC9T",
      "created_at": "2025-10-31T18:55:38.000Z",
      "total_domains": 10,
      "status": "Active",
      "domains": [
        { "id": "recABX2a0THx0", "name": "domain0.com", "status": "" }
      ]
    }
  ],
  "addons": [],
  "current_items": []
}
```

### Create Order

Create a new order and subscription.

**Endpoint:** `POST /create-order/{price_id}?organization_id={org_id}&provider={provider}`

> **Requires a connected payment method.** A subscription will be created automatically upon a successful request.

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `quantity` | integer | No | Number of package units (default: 1) |
| `domains` | array | Yes | Array of domain objects |
| `hosting` | object | Conditional | Required when `provider = "other"` |
| `sequencer` | object | No | Sequencer configuration |

**Domain Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `domain` | string | Yes | Domain name |
| `redirect` | string | No | Redirect URL |
| `first_name` | string | No | First name for auto-generated aliases |
| `last_name` | string | No | Last name for auto-generated aliases |
| `aliases` | array | No | Pre-generated aliases array |
| `profile_picture` | string | No | Profile picture URL |

### Cancel Order

Cancel an existing order and its associated subscription.

**Endpoint:** `DELETE /orders/{order_id}?organization_id={org_id}`

**Response:**

```json
{
  "success": true,
  "message": "Subscription canceled successfully."
}
```

---

## Mailboxes

### Get Mailboxes by Domain ID

Retrieve all mailboxes for a specific domain.

**Endpoint:** `GET /mailboxes/{domain_id}?organization_id={org_id}`

---

## Support

For assistance or feature requests, contact: support@scaledmail.com
