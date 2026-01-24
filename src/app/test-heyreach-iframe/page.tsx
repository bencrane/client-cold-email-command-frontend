"use client";

import { useState } from "react";

const testUrls = [
  {
    label: "Dashboard",
    url: "https://app.heyreach.io",
  },
  {
    label: "LinkedIn Accounts",
    url: "https://app.heyreach.io/linkedin-accounts",
  },
  {
    label: "Campaigns",
    url: "https://app.heyreach.io/campaigns",
  },
  {
    label: "New Campaign",
    url: "https://app.heyreach.io/campaigns/new",
  },
  {
    label: "Inbox",
    url: "https://app.heyreach.io/inbox",
  },
];

export default function TestHeyReachIframePage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadStatus, setLoadStatus] = useState<Record<string, string>>({});

  const selectedUrl = testUrls[selectedIndex];

  const handleLoad = (url: string) => {
    setLoadStatus((prev) => ({
      ...prev,
      [url]: "Loaded (but may be blocked by X-Frame-Options)",
    }));
  };

  const handleError = (url: string) => {
    setLoadStatus((prev) => ({
      ...prev,
      [url]: "Error loading iframe",
    }));
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <h1 className="text-2xl font-bold text-white mb-2">
        HeyReach Iframe Embedding Test
      </h1>
      <p className="text-gray-400 mb-6">
        Testing if HeyReach allows iframe embedding for potential modal
        integration.
      </p>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {testUrls.map((item, index) => (
          <button
            key={item.url}
            onClick={() => setSelectedIndex(index)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedIndex === index
                ? "bg-blue-600 text-white"
                : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Selected URL Info */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 font-mono">{selectedUrl.url}</p>
      </div>

      {/* Iframe Container */}
      <div className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#0a0a0a]">
        <iframe
          key={selectedUrl.url}
          src={selectedUrl.url}
          width="100%"
          height={700}
          className="w-full"
          onLoad={() => handleLoad(selectedUrl.url)}
          onError={() => handleError(selectedUrl.url)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      {/* Status */}
      <div className="mt-4 text-sm">
        <span className="text-gray-400">Status: </span>
        <span
          className={
            loadStatus[selectedUrl.url]?.includes("Error")
              ? "text-red-400"
              : loadStatus[selectedUrl.url]
                ? "text-yellow-400"
                : "text-gray-500"
          }
        >
          {loadStatus[selectedUrl.url] || "Loading..."}
        </span>
      </div>

      <p className="text-xs text-gray-600 mt-2">
        Note: Even if &quot;Loaded&quot; shows, check the iframe content. If
        it&apos;s blank or shows &quot;Refused to connect&quot;, the site blocks
        iframe embedding via X-Frame-Options or CSP headers.
      </p>

      {/* How to interpret */}
      <div className="mt-8 p-4 bg-[#111] border border-[#2a2a2a] rounded-lg">
        <h3 className="text-white font-semibold mb-2">How to interpret:</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>
            • <span className="text-green-400">Content visible</span> = Iframe
            embedding allowed
          </li>
          <li>
            • <span className="text-red-400">Blank/error in iframe</span> =
            Blocked by X-Frame-Options or CSP
          </li>
          <li>
            • Check browser console (F12) for &quot;Refused to display&quot;
            errors
          </li>
        </ul>
      </div>

      {/* All URLs Reference */}
      <div className="mt-6 p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
        <h3 className="text-white font-semibold mb-3">All Test URLs:</h3>
        <div className="space-y-2">
          {testUrls.map((item, index) => (
            <div
              key={item.url}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-400">{item.label}</span>
              <code className="text-gray-600 text-xs">{item.url}</code>
              <span
                className={`text-xs ${
                  loadStatus[item.url]?.includes("Error")
                    ? "text-red-400"
                    : loadStatus[item.url]
                      ? "text-yellow-400"
                      : "text-gray-600"
                }`}
              >
                {loadStatus[item.url]
                  ? loadStatus[item.url].includes("Error")
                    ? "Error"
                    : "Loaded"
                  : index === selectedIndex
                    ? "Testing..."
                    : "Not tested"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
