import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuthBench — Developer OAuth & App-Review Readiness Workbench",
  description:
    "Evidence-aware OAuth registration, scope, and app-review readiness guides backed by the Composio catalog.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="min-h-screen bg-[#090a0f] text-zinc-300 antialiased">
        {children}
      </body>
    </html>
  );
}
