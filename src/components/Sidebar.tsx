"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "All Leads", href: "/all-leads" },
  { name: "Lead Lists", href: "/lead-lists" },
  { name: "Campaigns", href: "/campaigns" },
  { name: "Master Inbox", href: "/master-inbox" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col">
      <div className="p-4 border-b border-[#1a1a1a]">
        <h1 className="text-lg font-semibold text-white">GTM Dashboard</h1>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`block px-4 py-2 rounded-md text-sm mb-1 transition-colors ${
                isActive
                  ? "bg-[#1a1a1a] text-white"
                  : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
