import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

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

  console.log("\n" + "=".repeat(50));
  console.log("✅ Seeding complete!");
}

main().catch(console.error);
