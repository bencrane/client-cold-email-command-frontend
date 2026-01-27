import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config();

// Initialize Supabase clients with service keys for full access
const customersDb = createClient(
  process.env.OUTBOUND_SOLUTIONS_DB_URL!,
  process.env.OUTBOUND_SOLUTIONS_DB_SERVICE_KEY!
);

const authDb = createClient(
  process.env.AUTH_DB_URL!,
  process.env.AUTH_DB_SERVICE_KEY!
);

// Test data
const organizations = [
  {
    name: "Acme Corp",
    slug: "acme-corp",
    domain: "acmecorp.com",
    website: "https://acmecorp.com",
    industry: "Technology",
    company_size: "51-200",
  },
  {
    name: "Beta Inc",
    slug: "beta-inc",
    domain: "betainc.com",
    website: "https://betainc.com",
    industry: "Finance",
    company_size: "11-50",
  },
  {
    name: "Gamma LLC",
    slug: "gamma-llc",
    domain: "gammallc.com",
    website: "https://gammallc.com",
    industry: "Healthcare",
    company_size: "1-10",
  },
];

const usersByOrg: Record<string, Array<{ name: string; email: string; role: string }>> = {
  "acme-corp": [
    { name: "John Smith", email: "john@acmecorp.com", role: "owner" },
    { name: "Sarah Johnson", email: "sarah@acmecorp.com", role: "admin" },
    { name: "Mike Chen", email: "mike@acmecorp.com", role: "sdr" },
  ],
  "beta-inc": [
    { name: "Emily Davis", email: "emily@betainc.com", role: "owner" },
    { name: "Robert Wilson", email: "robert@betainc.com", role: "manager" },
    { name: "Lisa Brown", email: "lisa@betainc.com", role: "sdr" },
  ],
  "gamma-llc": [
    { name: "David Lee", email: "david@gammallc.com", role: "owner" },
    { name: "Jennifer Taylor", email: "jennifer@gammallc.com", role: "admin" },
  ],
};

async function seedOrganizations() {
  console.log("\n📦 Seeding Organizations...");

  const { data, error } = await customersDb
    .from("organizations")
    .upsert(organizations, { onConflict: "slug" })
    .select();

  if (error) {
    console.error("  ❌ Error seeding organizations:", error.message);
    return null;
  }

  console.log(`  ✅ Created/updated ${data.length} organizations`);
  return data;
}

async function getRoles() {
  const { data, error } = await authDb.from("roles").select("id, name");

  if (error) {
    console.error("  ❌ Error fetching roles:", error.message);
    return null;
  }

  return data.reduce(
    (acc, role) => {
      acc[role.name] = role.id;
      return acc;
    },
    {} as Record<string, string>
  );
}

async function seedUsers(orgs: any[]) {
  console.log("\n👥 Seeding Users...");

  const roles = await getRoles();
  if (!roles) {
    console.error("  ❌ Could not fetch roles. Make sure auth-schema.sql has been run.");
    return;
  }

  console.log("  Found roles:", Object.keys(roles).join(", "));

  for (const org of orgs) {
    const users = usersByOrg[org.slug];
    if (!users) continue;

    console.log(`\n  Organization: ${org.name}`);

    for (const userData of users) {
      // Create user
      const { data: user, error: userError } = await authDb
        .from("users")
        .upsert(
          {
            organization_id: org.id,
            email: userData.email,
            name: userData.name,
            email_verified: true,
            email_verified_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: "email" }
        )
        .select()
        .single();

      if (userError) {
        console.error(`    ❌ Error creating user ${userData.email}:`, userError.message);
        continue;
      }

      // Assign role
      const roleId = roles[userData.role];
      if (roleId) {
        const { error: roleError } = await authDb.from("user_roles").upsert(
          {
            user_id: user.id,
            role_id: roleId,
          },
          { onConflict: "user_id,role_id" }
        );

        if (roleError && !roleError.message.includes("duplicate")) {
          console.error(`    ❌ Error assigning role:`, roleError.message);
        }
      }

      console.log(`    ✅ ${userData.name} (${userData.email}) - ${userData.role}`);
    }
  }
}

async function seedSubscriptions(orgs: any[]) {
  console.log("\n💳 Seeding Subscriptions...");

  const plans = ["growth", "starter", "free"] as const;

  for (let i = 0; i < orgs.length; i++) {
    const org = orgs[i];
    const plan = plans[i];

    const { error } = await customersDb.from("subscriptions").upsert(
      {
        organization_id: org.id,
        plan_tier: plan,
        status: "active",
        billing_cycle: "monthly",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        seats_limit: plan === "growth" ? 10 : plan === "starter" ? 3 : 1,
        leads_limit: plan === "growth" ? 10000 : plan === "starter" ? 1000 : 100,
        campaigns_limit: plan === "growth" ? 20 : plan === "starter" ? 5 : 1,
        emails_per_month_limit: plan === "growth" ? 50000 : plan === "starter" ? 5000 : 500,
      },
      { onConflict: "organization_id" }
    );

    if (error) {
      console.error(`  ❌ Error creating subscription for ${org.name}:`, error.message);
    } else {
      console.log(`  ✅ ${org.name} - ${plan} plan`);
    }
  }
}

// Email accounts by organization
const emailAccountsByOrg: Record<string, Array<{ email: string; sender_name: string }>> = {
  "acme-corp": [
    { email: "john@acmecorp.com", sender_name: "John Smith" },
    { email: "sarah@acmecorp.com", sender_name: "Sarah Johnson" },
  ],
  "beta-inc": [
    { email: "emily@betainc.com", sender_name: "Emily Davis" },
  ],
  "gamma-llc": [
    { email: "david@gammallc.com", sender_name: "David Lee" },
  ],
};

// Campaigns by organization
const campaignsByOrg: Record<string, Array<{ name: string; status: string }>> = {
  "acme-corp": [
    { name: "Q1 SaaS Founders Outreach", status: "active" },
    { name: "Enterprise Decision Makers", status: "active" },
    { name: "Series A Startups", status: "paused" },
  ],
  "beta-inc": [
    { name: "Finance Leaders Campaign", status: "active" },
    { name: "CFO Outreach 2024", status: "draft" },
  ],
  "gamma-llc": [
    { name: "Healthcare Executives", status: "active" },
  ],
};

// Realistic email thread templates
const emailThreads = [
  // Thread 1: Interested lead
  {
    lead_email: "marcus.chen@techstartup.io",
    lead_name: "Marcus Chen",
    subject: "Re: Scaling your outbound sales",
    category: "interested",
    messages: [
      {
        direction: "outbound",
        body: `Hi Marcus,

I noticed TechStartup.io just raised your Series A - congrats! At this stage, most founders struggle to build a predictable outbound engine.

We've helped 50+ SaaS companies at your stage generate qualified pipeline without hiring a full sales team.

Would you be open to a quick call this week to see if we could help?

Best,
John`,
        daysAgo: 3,
      },
      {
        direction: "inbound",
        body: `Hi John,

Thanks for reaching out. We're actually actively looking for solutions in this space. Our current outbound is pretty manual and we know we need to fix that before our next fundraise.

What does your typical engagement look like? And do you have any case studies from similar stage companies?

Marcus`,
        daysAgo: 2,
        status: "read",
      },
      {
        direction: "outbound",
        body: `Marcus,

Great to hear you're thinking about this proactively. Most founders wait too long.

Our typical engagement:
- Week 1-2: We audit your ICP and build targeted lists
- Week 3-4: Launch campaigns across multiple channels
- Ongoing: We optimize based on response data

I'll send over a case study from a B2B SaaS that went from 0 to 50 qualified meetings/month.

How does Thursday at 2pm PT work for a call?

John`,
        daysAgo: 2,
      },
      {
        direction: "inbound",
        body: `Thursday 2pm works. Here's my Calendly if easier: calendly.com/marcus-chen

Looking forward to it.

Marcus`,
        daysAgo: 1,
        status: "unread",
      },
    ],
  },
  // Thread 2: Not interested
  {
    lead_email: "jennifer.walsh@bigcorp.com",
    lead_name: "Jennifer Walsh",
    subject: "Re: Quick question about your sales process",
    category: "not_interested",
    messages: [
      {
        direction: "outbound",
        body: `Hi Jennifer,

I saw BigCorp is expanding into new markets this year. Scaling outbound in new territories is always challenging.

We specialize in helping companies like yours build localized outbound campaigns that actually convert.

Worth a conversation?

Best,
Sarah`,
        daysAgo: 5,
      },
      {
        direction: "inbound",
        body: `Hi Sarah,

Thanks but we have an internal team that handles all our outbound. We're not looking for external help at this time.

Best,
Jennifer`,
        daysAgo: 4,
        status: "read",
      },
    ],
  },
  // Thread 3: Out of office
  {
    lead_email: "robert.kim@innovate.co",
    lead_name: "Robert Kim",
    subject: "Re: Automating your lead generation",
    category: "out_of_office",
    messages: [
      {
        direction: "outbound",
        body: `Hi Robert,

Your recent podcast appearance on "Scaling B2B" was great - loved your insights on product-led growth.

But even PLG companies need outbound to accelerate. We've helped similar companies add $2M+ in pipeline through targeted outreach.

Open to exploring?

John`,
        daysAgo: 2,
      },
      {
        direction: "inbound",
        body: `Thank you for your email. I am currently out of the office until February 3rd with limited access to email.

For urgent matters, please contact my colleague Alex Thompson at alex@innovate.co.

Best regards,
Robert Kim`,
        daysAgo: 2,
        status: "unread",
      },
    ],
  },
  // Thread 4: Bounced
  {
    lead_email: "no-longer-here@defunct.com",
    lead_name: null,
    subject: "Undeliverable: Partnership opportunity",
    category: "bounced",
    messages: [
      {
        direction: "outbound",
        body: `Hi there,

I wanted to reach out about a potential partnership...`,
        daysAgo: 1,
      },
      {
        direction: "inbound",
        body: `Mail delivery failed: returning message to sender

This message was created automatically by mail delivery software.

A message that you sent could not be delivered to one or more of its recipients.

The following address(es) failed:
  no-longer-here@defunct.com
    mailbox not found`,
        daysAgo: 1,
        status: "read",
      },
    ],
  },
  // Thread 5: Interested - detailed conversation
  {
    lead_email: "amanda.torres@growthco.io",
    lead_name: "Amanda Torres",
    subject: "Re: Saw your LinkedIn post about hiring SDRs",
    category: "interested",
    messages: [
      {
        direction: "outbound",
        body: `Hi Amanda,

Saw your post about the challenges of hiring SDRs in this market. It's brutal out there.

What if you could get SDR-level output without the hiring headaches? We provide done-for-you outbound that's generated $50M+ in pipeline for companies like yours.

Worth 15 mins to explore?

Sarah`,
        daysAgo: 7,
      },
      {
        direction: "inbound",
        body: `Sarah,

Your timing is interesting - we just lost our second SDR in 3 months and I'm frankly exhausted by the hiring cycle.

What's your pricing model? And how do you handle industry-specific messaging? We're in a pretty niche B2B space (supply chain software).

Amanda`,
        daysAgo: 6,
        status: "read",
      },
      {
        direction: "outbound",
        body: `Amanda,

Totally understand the SDR churn frustration - it's one of the top reasons companies come to us.

Pricing: We work on a monthly retainer based on volume. Most companies at your stage are in the $5-8k/month range.

Industry expertise: We've actually worked with 3 supply chain software companies. Happy to share specific results.

Can you do a call Wednesday or Thursday?

Sarah`,
        daysAgo: 5,
      },
      {
        direction: "inbound",
        body: `That price range works with our budget. Thursday at 11am EST?

Also - can you send those supply chain case studies beforehand? Would help me loop in my co-founder.

Amanda`,
        daysAgo: 4,
        status: "read",
      },
      {
        direction: "outbound",
        body: `Thursday 11am EST is perfect. I'll send a calendar invite.

Attaching 2 case studies:
1. LogiFlow - went from 5 to 45 demos/month in 90 days
2. SupplyAI - $1.2M pipeline in first quarter

See you Thursday!

Sarah`,
        daysAgo: 4,
      },
      {
        direction: "inbound",
        body: `These are impressive numbers. My co-founder Mike will join the call too.

Quick question before Thursday - do you also help with LinkedIn outreach or just email?

Amanda`,
        daysAgo: 3,
        status: "unread",
      },
    ],
  },
  // Thread 6: Single inbound - interested
  {
    lead_email: "chris.patel@rocketship.vc",
    lead_name: "Chris Patel",
    subject: "Re: Portfolio company intros",
    category: "interested",
    messages: [
      {
        direction: "outbound",
        body: `Hi Chris,

I know Rocketship has 40+ B2B portfolio companies. Many of them probably struggle with outbound.

We've partnered with other VCs to offer portfolio-wide outbound services at preferred rates. It's been a great value-add for their founders.

Would you be open to learning more?

John`,
        daysAgo: 1,
      },
      {
        direction: "inbound",
        body: `John,

This is actually great timing. We're putting together our portfolio services program for 2024 and outbound support has been a top request from founders.

Can you send over some info on portfolio partnerships? I'd want to bring this to our next partner meeting.

Chris`,
        daysAgo: 0,
        status: "unread",
      },
    ],
  },
  // Thread 7: Not interested - polite decline
  {
    lead_email: "diana.nakamura@enterprise.com",
    lead_name: "Diana Nakamura",
    subject: "Re: Enterprise outbound at scale",
    category: "not_interested",
    messages: [
      {
        direction: "outbound",
        body: `Hi Diana,

Enterprise sales cycles are long. But what if you could 3x your top-of-funnel without adding headcount?

We work with Fortune 500 companies to run compliant, high-converting outbound programs.

15 minutes to see if there's a fit?

Sarah`,
        daysAgo: 4,
      },
      {
        direction: "inbound",
        body: `Hi Sarah,

I appreciate the outreach. We actually just signed a 2-year contract with another vendor for this exact service last month.

Feel free to check back in 18 months or so when we're evaluating again.

Best,
Diana`,
        daysAgo: 3,
        status: "read",
      },
    ],
  },
  // Thread 8: Interested - early stage
  {
    lead_email: "kevin.wright@freshstart.ai",
    lead_name: "Kevin Wright",
    subject: "Re: AI startup outbound",
    category: "interested",
    messages: [
      {
        direction: "outbound",
        body: `Kevin,

FreshStart.ai looks interesting - using AI to automate HR workflows is a hot space.

But even with a great product, getting in front of HR leaders is tough. We've cracked the code on reaching this persona.

Interested in learning how?

John`,
        daysAgo: 0,
      },
      {
        direction: "inbound",
        body: `John - yes definitely interested. We're pre-product-market fit and need to talk to as many HR leaders as possible for discovery calls.

What's the minimum engagement? We're bootstrapped so budget is tight.

Kevin`,
        daysAgo: 0,
        status: "unread",
      },
    ],
  },
  // Thread 9: Out of office - automated
  {
    lead_email: "lisa.martinez@consulting.group",
    lead_name: "Lisa Martinez",
    subject: "Automatic reply: Building your sales pipeline",
    category: "out_of_office",
    messages: [
      {
        direction: "outbound",
        body: `Hi Lisa,

Consulting firms often struggle with feast-or-famine revenue cycles. Outbound can smooth that out.

We help professional services firms build predictable lead flow. Worth discussing?

Sarah`,
        daysAgo: 1,
      },
      {
        direction: "inbound",
        body: `Hi,

Thank you for your email. I'm currently on parental leave and will return on March 15th.

For immediate assistance, please contact our office manager at office@consulting.group.

Best,
Lisa Martinez
Partner, Consulting Group`,
        daysAgo: 1,
        status: "read",
      },
    ],
  },
  // Thread 10: Interested - wants pricing
  {
    lead_email: "tom.bradley@scaleup.io",
    lead_name: "Tom Bradley",
    subject: "Re: Outbound for Series B companies",
    category: "interested",
    messages: [
      {
        direction: "outbound",
        body: `Tom,

Congrats on the Series B! Now comes the hard part - scaling revenue to justify the valuation.

We've helped 20+ Series B companies build outbound engines that generate 100+ qualified opportunities per month.

Open to a quick call?

John`,
        daysAgo: 2,
      },
      {
        direction: "inbound",
        body: `John,

Good timing - we literally just had a board meeting where outbound came up as a gap.

Before we schedule a call, can you send over:
1. Pricing tiers
2. Case study from a similar stage company
3. Your typical ramp time to results

If those look good, I'll schedule time.

Tom`,
        daysAgo: 1,
        status: "unread",
      },
    ],
  },
];

async function seedEmailAccounts(orgs: any[]) {
  console.log("\n📧 Seeding Email Accounts...");

  for (const org of orgs) {
    const accounts = emailAccountsByOrg[org.slug];
    if (!accounts) continue;

    for (const account of accounts) {
      // Check if exists first
      const { data: existing } = await customersDb
        .schema("product")
        .from("email_accounts")
        .select("id")
        .eq("org_id", org.id)
        .eq("email", account.email)
        .single();

      if (existing) {
        console.log(`  ⏭️  ${account.email} already exists`);
        continue;
      }

      const { error } = await customersDb
        .schema("product")
        .from("email_accounts")
        .insert({
          org_id: org.id,
          email: account.email,
          sender_name: account.sender_name,
          status: "active",
          daily_limit: 50,
          smartlead_account_id: Math.floor(Math.random() * 100000),
        });

      if (error) {
        console.error(`  ❌ Error creating email account ${account.email}:`, error.message);
      } else {
        console.log(`  ✅ ${account.email} (${org.name})`);
      }
    }
  }
}

async function seedCampaigns(orgs: any[]) {
  console.log("\n📣 Seeding Campaigns...");

  const campaignIds: Record<string, string[]> = {};

  for (const org of orgs) {
    const campaigns = campaignsByOrg[org.slug];
    if (!campaigns) continue;

    campaignIds[org.slug] = [];

    for (const campaign of campaigns) {
      // Check if exists first
      const { data: existing } = await customersDb
        .schema("product")
        .from("campaigns")
        .select("id")
        .eq("org_id", org.id)
        .eq("name", campaign.name)
        .single();

      if (existing) {
        console.log(`  ⏭️  ${campaign.name} already exists`);
        campaignIds[org.slug].push(existing.id);
        continue;
      }

      const { data, error } = await customersDb
        .schema("product")
        .from("campaigns")
        .insert({
          org_id: org.id,
          name: campaign.name,
          status: campaign.status,
          smartlead_campaign_id: Math.floor(Math.random() * 100000),
          settings: {},
        })
        .select()
        .single();

      if (error) {
        console.error(`  ❌ Error creating campaign ${campaign.name}:`, error.message);
      } else {
        console.log(`  ✅ ${campaign.name} (${org.name}) - ${campaign.status}`);
        if (data) campaignIds[org.slug].push(data.id);
      }
    }
  }

  return campaignIds;
}

async function seedInboxMessages(orgs: any[], campaignIds: Record<string, string[]>) {
  console.log("\n💬 Seeding Inbox Messages...");

  // Use acme-corp for all the sample threads
  const acmeOrg = orgs.find((o) => o.slug === "acme-corp");
  if (!acmeOrg) {
    console.error("  ❌ Acme Corp not found");
    return;
  }

  // Check if messages already exist for this org
  const { data: existingMessages } = await customersDb
    .schema("product")
    .from("inbox_messages")
    .select("id")
    .eq("org_id", acmeOrg.id)
    .limit(1);

  if (existingMessages && existingMessages.length > 0) {
    console.log("  ⏭️  Inbox messages already exist, skipping...");
    return;
  }

  const acmeCampaigns = campaignIds["acme-corp"] || [];

  let messageCount = 0;

  for (const thread of emailThreads) {
    // Use proper UUID for thread_id
    const threadId = randomUUID();
    const campaignId = acmeCampaigns[Math.floor(Math.random() * acmeCampaigns.length)];

    // Get SmartLead campaign ID for this campaign
    let smartleadCampaignId: number | null = null;
    if (campaignId) {
      const { data } = await customersDb
        .schema("product")
        .from("campaigns")
        .select("smartlead_campaign_id")
        .eq("id", campaignId)
        .single();
      smartleadCampaignId = data?.smartlead_campaign_id || null;
    }

    for (let i = 0; i < thread.messages.length; i++) {
      const msg = thread.messages[i];
      const receivedAt = new Date(Date.now() - msg.daysAgo * 24 * 60 * 60 * 1000 - i * 60 * 60 * 1000);

      const isLastMessage = i === thread.messages.length - 1;
      const status = msg.status || (isLastMessage && msg.direction === "inbound" ? "unread" : "read");

      const { error } = await customersDb
        .schema("product")
        .from("inbox_messages")
        .insert({
          org_id: acmeOrg.id,
          thread_id: threadId,
          lead_email: thread.lead_email,
          lead_name: thread.lead_name,
          subject: thread.subject,
          body: msg.body,
          direction: msg.direction,
          status: status,
          category: msg.direction === "inbound" ? thread.category : null,
          received_at: receivedAt.toISOString(),
          smartlead_campaign_id: smartleadCampaignId,
        });

      if (error) {
        console.error(`  ❌ Error creating message:`, error.message);
      } else {
        messageCount++;
      }
    }
  }

  console.log(`  ✅ Created ${messageCount} messages across ${emailThreads.length} threads`);
}

async function main() {
  console.log("🌱 Seeding Test Data");
  console.log("=".repeat(50));

  // Seed organizations first
  const orgs = await seedOrganizations();
  if (!orgs) {
    console.error("\n❌ Failed to seed organizations. Exiting.");
    process.exit(1);
  }

  // Seed subscriptions
  await seedSubscriptions(orgs);

  // Seed users
  await seedUsers(orgs);

  // Seed email accounts
  await seedEmailAccounts(orgs);

  // Seed campaigns
  const campaignIds = await seedCampaigns(orgs);

  // Seed inbox messages
  await seedInboxMessages(orgs, campaignIds);

  console.log("\n" + "=".repeat(50));
  console.log("✅ Seeding complete!");
}

main().catch(console.error);
