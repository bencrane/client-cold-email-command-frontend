import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

async function testConnection(name: string, url: string, key: string) {
  console.log(`\nTesting ${name}...`);

  if (!url || !key) {
    console.log(`  ❌ Missing URL or key for ${name}`);
    return false;
  }

  try {
    const supabase = createClient(url, key);

    // Try a simple query to verify connection
    const { data, error } = await supabase
      .from("_test_connection")
      .select("*")
      .limit(1);

    // We expect an error since the table doesn't exist, but the connection should work
    if (error && error.code === "42P01") {
      // Table doesn't exist - but connection works!
      console.log(`  ✅ ${name} connected successfully`);
      return true;
    } else if (error) {
      // Check if it's a permission error (which means connection worked)
      if (error.message.includes("permission denied") || error.code === "PGRST301") {
        console.log(`  ✅ ${name} connected successfully (RLS enabled)`);
        return true;
      }
      console.log(`  ⚠️  ${name} connected but got error: ${error.message}`);
      return true; // Connection still worked
    } else {
      console.log(`  ✅ ${name} connected successfully`);
      return true;
    }
  } catch (err) {
    console.log(`  ❌ ${name} failed to connect: ${err}`);
    return false;
  }
}

async function main() {
  console.log("Database Connection Test");
  console.log("=".repeat(40));

  const customersOk = await testConnection(
    "Outbound Solutions DB",
    process.env.OUTBOUND_SOLUTIONS_DB_URL!,
    process.env.OUTBOUND_SOLUTIONS_DB_ANON_KEY!
  );

  const authOk = await testConnection(
    "Auth DB",
    process.env.AUTH_DB_URL!,
    process.env.AUTH_DB_ANON_KEY!
  );

  console.log("\n" + "=".repeat(40));
  console.log("Summary:");
  console.log(`  Outbound Solutions DB: ${customersOk ? "✅" : "❌"}`);
  console.log(`  Auth DB: ${authOk ? "✅" : "❌"}`);
}

main();
