import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/lib/trpc/provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Syncora — AI-Powered Operations OS",
    template: "%s | Syncora",
  },
  description:
    "Syncora is a unified operations platform for service businesses. CRM, Projects, Billing, and AI in one workspace.",
  keywords: ["operations", "CRM", "project management", "billing", "AI", "SaaS"],
  authors: [{ name: "Ripple Nexus" }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://syncora.app"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Syncora",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <TRPCReactProvider>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}
