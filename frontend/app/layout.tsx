import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "RWA Tokenization",
  description: "Real World Asset Tokenization Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0b1e] min-h-screen text-gray-100">
        <div className="fixed inset-0 bg-gradient-to-br from-blue-950/30 via-[#0a0b1e] to-violet-950/20 pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.15),transparent)] pointer-events-none" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
