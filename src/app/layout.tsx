import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculator",
  description: "A sleek dark-themed calculator with history",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-900 antialiased">{children}</body>
    </html>
  );
}
