const sampleLeads = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@acmecorp.com",
    company: "Acme Corporation",
    title: "VP of Sales",
    status: "New",
    lastContact: "2024-01-10",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah.j@techstart.io",
    company: "TechStart Inc",
    title: "CEO",
    status: "Contacted",
    lastContact: "2024-01-08",
  },
  {
    id: 3,
    name: "Michael Chen",
    email: "m.chen@globalsoft.com",
    company: "GlobalSoft",
    title: "Head of Marketing",
    status: "Qualified",
    lastContact: "2024-01-12",
  },
  {
    id: 4,
    name: "Emily Davis",
    email: "emily.davis@innovate.co",
    company: "Innovate Co",
    title: "Director of Operations",
    status: "New",
    lastContact: "2024-01-11",
  },
  {
    id: 5,
    name: "Robert Wilson",
    email: "rwilson@enterprise.com",
    company: "Enterprise Solutions",
    title: "CTO",
    status: "Contacted",
    lastContact: "2024-01-09",
  },
  {
    id: 6,
    name: "Amanda Lee",
    email: "amanda.lee@growth.io",
    company: "Growth Partners",
    title: "VP of Business Development",
    status: "Qualified",
    lastContact: "2024-01-07",
  },
  {
    id: 7,
    name: "David Brown",
    email: "dbrown@nexgen.com",
    company: "NexGen Systems",
    title: "Founder",
    status: "New",
    lastContact: "2024-01-13",
  },
  {
    id: 8,
    name: "Jessica Martinez",
    email: "jmartinez@cloudtech.io",
    company: "CloudTech Solutions",
    title: "Head of Sales",
    status: "Contacted",
    lastContact: "2024-01-06",
  },
];

const statusColors: Record<string, string> = {
  New: "bg-blue-500/20 text-blue-400",
  Contacted: "bg-yellow-500/20 text-yellow-400",
  Qualified: "bg-green-500/20 text-green-400",
};

export default function AllLeadsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">All Leads</h1>
        <p className="text-gray-400 mt-1">
          Manage and track all your leads in one place
        </p>
      </div>

      <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                Name
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                Email
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                Company
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                Title
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                Status
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                Last Contact
              </th>
            </tr>
          </thead>
          <tbody>
            {sampleLeads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors"
              >
                <td className="px-4 py-3 text-sm text-white">{lead.name}</td>
                <td className="px-4 py-3 text-sm text-gray-300">{lead.email}</td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {lead.company}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">{lead.title}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${statusColors[lead.status]}`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {lead.lastContact}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
