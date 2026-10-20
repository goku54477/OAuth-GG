import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuthBench — Developer OAuth & App-Review Readiness Workbench",
  description:
    "Interactive scope-delta workbench, CASA assessment calculator, and Composio OAuth integration telemetry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-slate-800 selection:text-slate-200">
        {children}
      </body>
    </html>
  );
}
