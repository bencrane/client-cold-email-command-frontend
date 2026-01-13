import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-white mb-8">Bullseye Revenue</h1>
      <Link
        href="/all-leads"
        className="px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
      >
        Enter Dashboard
      </Link>
    </div>
  );
}
