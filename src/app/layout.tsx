import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backend Odyssey",
  description:
    "An immersive first-person 3D portfolio where you play an HTTP request traveling through a fictional backend infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full flex flex-col font-mono">{children}</body>
    </html>
  );
}
