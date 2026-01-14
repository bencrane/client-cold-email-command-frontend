"use client";

import { useRouter } from "next/navigation";

const cards = [
  {
    name: "All Leads",
    description: "View and manage all leads across your organization",
    href: "/all-leads",
  },
  {
    name: "Lead Lists",
    description: "Organize leads into targeted lists for campaigns",
    href: "/lead-lists",
  },
  {
    name: "Campaigns",
    description: "Create and manage outbound email campaigns",
    href: "/campaigns",
  },
  {
    name: "Master Inbox",
    description: "Unified inbox for all campaign responses",
    href: "/inbox",
  },
];

export default function AdminPage() {
  const router = useRouter();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Manage your GTM operations from one place
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div
            key={card.name}
            onClick={() => card.href && router.push(card.href)}
            className={`bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 transition-colors ${
              card.href
                ? "hover:border-[#2a2a2a] cursor-pointer"
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            <h2 className="text-lg font-semibold text-white mb-2">
              {card.name}
            </h2>
            <p className="text-sm text-gray-400">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
