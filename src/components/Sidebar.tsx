"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { useSidebarContext } from "@/lib/sidebar-context";
import { useEffect, useState } from "react";
import { LogOut, ArrowLeft } from "lucide-react";

const ADMIN_EMAIL = "tools@substrate.build";

// Test accounts for quick switching (admin only)
const testAccounts = [
  { email: "sarah@acmecorp.com", org: "Acme Corp" },
  { email: "rachel@betainc.com", org: "Beta Inc" },
  { email: "nicole@gammallc.com", org: "Gamma LLC" },
];

export default function Sidebar() {
  const router = useRouter();
  const { data: session } = useSession();
  const { content: pageContent } = useSidebarContext();
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    setImpersonating(localStorage.getItem("impersonate_email"));
  }, []);

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  const handleSignOut = async () => {
    localStorage.removeItem("impersonate_email");
    await signOut();
    router.push("/sign-in");
  };

  const handleSwitchAccount = (email: string) => {
    localStorage.setItem("impersonate_email", email);
    window.location.reload();
  };

  const handleBackToAdmin = () => {
    localStorage.removeItem("impersonate_email");
    window.location.reload();
  };

  const displayEmail = impersonating || session?.user?.email;

  return (
    <aside className="w-72 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <Link 
        href="/admin" 
        className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">B</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-sidebar-foreground">Bullseye Revenue</h1>
          <p className="text-xs text-muted-foreground">GTM Intelligence</p>
        </div>
      </Link>

      {/* Scrollable middle section */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* Page-specific content (filters, etc.) */}
        {pageContent && (
          <div className="flex-shrink-0">
            {pageContent}
          </div>
        )}
      </div>

      {/* Test accounts - admin only */}
      {isAdmin && (
        <div className="flex-shrink-0 px-3 py-3 border-t border-sidebar-border">
          <p className="px-2 mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Test Accounts
          </p>
          <div className="space-y-1">
            {testAccounts.map((account) => (
              <button
                key={account.email}
                onClick={() => handleSwitchAccount(account.email)}
                className={`w-full px-3 py-2 rounded-md text-sm text-left transition-colors ${
                  impersonating === account.email
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <span className="block truncate text-[13px]">{account.email}</span>
                <span className="block text-[11px] opacity-60">{account.org}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User info and sign out */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-sidebar-border bg-sidebar">
        {displayEmail && (
          <div className="px-2 py-2 mb-2 rounded-md bg-sidebar-accent/50">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
              {impersonating ? "Viewing as" : "Signed in"}
            </p>
            <p className="text-sm text-sidebar-foreground truncate mt-0.5">{displayEmail}</p>
          </div>
        )}
        
        <div className="space-y-1">
          {impersonating && (
            <button
              onClick={handleBackToAdmin}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-amber-400 hover:bg-sidebar-accent transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
