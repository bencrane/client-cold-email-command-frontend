import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const authDb = createClient(process.env.AUTH_DB_URL!, process.env.AUTH_DB_SERVICE_KEY!);
const customersDb = createClient(process.env.CUSTOMERS_DB_URL!, process.env.CUSTOMERS_DB_SERVICE_KEY!);

async function check() {
  const { data: user } = await authDb
    .from("user")
    .select("id, name, email, organizationId")
    .eq("email", "tools@substrate.build")
    .single();

  if (!user) {
    console.log("❌ User tools@substrate.build not found");
    return;
  }

  console.log("User:", user.name, "|", user.email);
  console.log("Organization ID:", user.organizationId || "NOT LINKED");

  if (user.organizationId) {
    const { data: org } = await customersDb
      .from("organizations")
      .select("name, domain")
      .eq("id", user.organizationId)
      .single();

    if (org) {
      console.log("✅ Linked to:", org.name, "(" + org.domain + ")");
    }
  } else {
    console.log("\n⚠️  Not linked. Backfilling...");

    const { data: org } = await customersDb
      .from("organizations")
      .select("id, name")
      .eq("domain", "substrate.build")
      .single();

    if (org) {
      const { error } = await authDb
        .from("user")
        .update({ organizationId: org.id })
        .eq("id", user.id);

      if (!error) {
        console.log("✅ Linked to:", org.name);
      } else {
        console.log("❌ Failed to link:", error.message);
      }
    } else {
      console.log("❌ No org found for substrate.build");
    }
  }
}

check();
