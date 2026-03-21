import type { Metadata } from "next";
import { Nav } from "@/src/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "claude-monitor",
  description: "Terminal-themed monitoring dashboard for Claude Code sessions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
