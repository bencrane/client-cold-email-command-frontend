// src/lib/smartlead.ts
// SmartLead API client for server-side operations

const SMARTLEAD_API_BASE = 'https://server.smartlead.ai/api/v1'

interface SmartLeadCampaign {
  id: number
  user_id: number
  name: string
  status: string
  created_at: string
  updated_at: string
  track_settings: string[]
  scheduler_cron_value: string | null
  min_time_btwn_emails: number
  max_leads_per_day: number
  stop_lead_settings: string
  schedule_start_time: string | null
  enable_ai_esp_matching: boolean
  send_as_plain_text: boolean
  follow_up_percentage: number
  unsubscribe_text: string | null
  parent_campaign_id: number | null
  client_id: number | null
}

interface SmartLeadError {
  message: string
  statusCode?: number
}

class SmartLeadClient {
  private apiKey: string

  constructor() {
    const apiKey = process.env.SMARTLEAD_API_KEY
    if (!apiKey) {
      throw new Error('SMARTLEAD_API_KEY environment variable is not set')
    }
    this.apiKey = apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${SMARTLEAD_API_BASE}${endpoint}?api_key=${this.apiKey}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      const error: SmartLeadError = {
        message: data.message || data.error || 'SmartLead API error',
        statusCode: response.status,
      }
      throw error
    }

    return data
  }

  /**
   * Create a new campaign in SmartLead
   * @param name Campaign name
   * @param clientId Optional client ID to assign the campaign to
   * @returns The created campaign with its SmartLead ID
   */
  async createCampaign(name: string, clientId?: number): Promise<SmartLeadCampaign> {
    const body: Record<string, unknown> = { name }
    if (clientId !== undefined) {
      body.client_id = clientId
    }

    return this.request<SmartLeadCampaign>('/campaigns/create', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Get a campaign by ID
   * @param campaignId SmartLead campaign ID
   */
  async getCampaign(campaignId: number): Promise<SmartLeadCampaign> {
    return this.request<SmartLeadCampaign>(`/campaigns/${campaignId}`)
  }

  /**
   * List all campaigns
   */
  async listCampaigns(): Promise<SmartLeadCampaign[]> {
    return this.request<SmartLeadCampaign[]>('/campaigns')
  }

  /**
   * Update campaign status
   * @param campaignId SmartLead campaign ID
   * @param status New status: 'START', 'PAUSED', or 'STOPPED'
   */
  async updateCampaignStatus(
    campaignId: number,
    status: 'START' | 'PAUSED' | 'STOPPED'
  ): Promise<SmartLeadCampaign> {
    return this.request<SmartLeadCampaign>(`/campaigns/${campaignId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  }

  /**
   * Delete a campaign
   * @param campaignId SmartLead campaign ID
   */
  async deleteCampaign(campaignId: number): Promise<void> {
    await this.request(`/campaigns/${campaignId}`, {
      method: 'DELETE',
    })
  }
}

// Singleton instance
let smartLeadClient: SmartLeadClient | null = null

export function getSmartLeadClient(): SmartLeadClient {
  if (!smartLeadClient) {
    smartLeadClient = new SmartLeadClient()
  }
  return smartLeadClient
}

export type { SmartLeadCampaign, SmartLeadError }
