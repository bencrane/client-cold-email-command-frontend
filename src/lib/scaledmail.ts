// src/lib/scaledmail.ts
// ScaledMail API client for server-side operations

const SCALEDMAIL_API_BASE = 'https://server.scaledmail.com/api/v1'

interface ScaledMailPricing {
  oneTimePrice: number
  monthlyPrice: number
}

interface ScaledMailMailbox {
  first_name: string
  last_name: string
  alias: string
}

interface ScaledMailInbox {
  id: string
  domain: string
  warmup_age: number
  emailMailboxCount: number
  pricing: ScaledMailPricing
  emailMailbox?: ScaledMailMailbox[]
}

interface ScaledMailPreWarmInboxesResponse {
  total: number
  google: ScaledMailInbox[]
  outlook: ScaledMailInbox[]
}

interface ScaledMailDomainPurchase {
  id: string
  domain: string
  redirect?: string
}

interface ScaledMailSequencer {
  provider: string
  username: string
  password: string
  link: string
  workspace?: string
  tag?: string
}

interface ScaledMailBuyPreWarmRequest {
  tag?: string
  domains: ScaledMailDomainPurchase[]
  sequencer?: ScaledMailSequencer
}

interface ScaledMailError {
  message: string
  statusCode?: number
}

class ScaledMailClient {
  private apiKey: string
  private organizationId: string

  constructor() {
    const apiKey = process.env.SCALEDMAIL_API_KEY
    if (!apiKey) {
      throw new Error('SCALEDMAIL_API_KEY environment variable is not set')
    }
    this.apiKey = apiKey

    const organizationId = process.env.SCALEDMAIL_ORGANIZATION_ID
    if (!organizationId) {
      throw new Error('SCALEDMAIL_ORGANIZATION_ID environment variable is not set')
    }
    this.organizationId = organizationId
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const separator = endpoint.includes('?') ? '&' : '?'
    const url = `${SCALEDMAIL_API_BASE}${endpoint}${separator}organization_id=${this.organizationId}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      const error: ScaledMailError = {
        message: data.message || data.error || 'ScaledMail API error',
        statusCode: response.status,
      }
      throw error
    }

    return data
  }

  /**
   * Get all available pre-warmed inboxes
   * Returns Google and Outlook inboxes with pricing details
   */
  async getPreWarmInboxes(): Promise<ScaledMailPreWarmInboxesResponse> {
    return this.request<ScaledMailPreWarmInboxesResponse>('/pre-warm-inboxes')
  }

  /**
   * Purchase pre-warmed inboxes
   * @param domains Array of domain objects to purchase
   * @param tag Optional tag for tracking
   * @param sequencer Optional sequencer config for auto-connection
   */
  async buyPreWarmInboxes(
    domains: ScaledMailDomainPurchase[],
    tag?: string,
    sequencer?: ScaledMailSequencer
  ): Promise<unknown> {
    const body: ScaledMailBuyPreWarmRequest = { domains }
    if (tag) body.tag = tag
    if (sequencer) body.sequencer = sequencer

    return this.request('/buy-pre-warm-inboxes', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Get mailboxes for a specific domain
   * @param domainId The domain ID to get mailboxes for
   */
  async getMailboxesByDomainId(domainId: string): Promise<unknown> {
    return this.request(`/mailboxes/${domainId}`)
  }

  /**
   * Get all domains for the organization
   */
  async getDomains(): Promise<unknown> {
    return this.request('/domains')
  }

  /**
   * Get purchased domains for the organization
   * @param available Filter for domains available for new orders
   */
  async getPurchasedDomains(available?: boolean): Promise<unknown> {
    const query = available ? '?available=true' : ''
    return this.request(`/purchased-domains${query}`)
  }
}

// Singleton instance
let scaledMailClient: ScaledMailClient | null = null

export function getScaledMailClient(): ScaledMailClient {
  if (!scaledMailClient) {
    scaledMailClient = new ScaledMailClient()
  }
  return scaledMailClient
}

export type {
  ScaledMailInbox,
  ScaledMailMailbox,
  ScaledMailPricing,
  ScaledMailPreWarmInboxesResponse,
  ScaledMailDomainPurchase,
  ScaledMailSequencer,
  ScaledMailError,
}
