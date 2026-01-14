"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { useSidebarContext } from "@/lib/sidebar-context";
import { useEffect, useState } from "react";
import { LogOut, ArrowLeft, PanelLeftClose, PanelLeft } from "lucide-react";

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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setImpersonating(localStorage.getItem("impersonate_email"));
    const savedCollapsed = localStorage.getItem("sidebar_collapsed");
    if (savedCollapsed === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    localStorage.setItem("sidebar_collapsed", String(newValue));
  };

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
    <aside 
      className={`shrink-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 ${
        collapsed ? "w-16" : "w-80"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-sidebar-border">
        <Link 
          href="/admin" 
          className={`flex items-center gap-3 hover:opacity-80 transition-opacity ${collapsed ? "justify-center w-full" : ""}`}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">B</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-semibold text-sidebar-foreground">Bullseye Revenue</h1>
              <p className="text-xs text-muted-foreground">GTM Intelligence</p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={toggleCollapsed}
          className="mx-auto mt-3 p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="Expand sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      )}

      {/* Scrollable middle section */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {/* Page-specific content (filters, etc.) */}
          {pageContent && (
            <div className="flex-shrink-0">
              {pageContent}
            </div>
          )}
        </div>
      )}

      {/* Spacer when collapsed */}
      {collapsed && <div className="flex-1" />}

      {/* Test accounts - admin only */}
      {isAdmin && !collapsed && (
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
      <div className={`flex-shrink-0 border-t border-sidebar-border bg-sidebar ${collapsed ? "px-2 py-3" : "px-3 py-3"}`}>
        {!collapsed && displayEmail && (
          <div className="px-2 py-2 mb-2 rounded-md bg-sidebar-accent/50">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
              {impersonating ? "Viewing as" : "Signed in"}
            </p>
            <p className="text-sm text-sidebar-foreground truncate mt-0.5">{displayEmail}</p>
          </div>
        )}
        
        <div className={collapsed ? "flex flex-col items-center gap-2" : "space-y-1"}>
          {impersonating && !collapsed && (
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
            className={`flex items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${
              collapsed ? "p-2" : "w-full gap-2 px-3 py-2 text-sm"
            }`}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && "Sign Out"}
          </button>
        </div>
      </div>
    </aside>
  );
}
