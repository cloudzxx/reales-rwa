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
      <body className="bg-gradient-to-br from-slate-50 via-white to-blue-50 text-gray-900 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
