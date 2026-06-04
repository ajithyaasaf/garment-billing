import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GarmentOS – Wholesale ERP | Madurai",
  description:
    "Production-grade wholesale garment stock and billing management system for Madurai bulk dress sellers.",
  keywords: "garment ERP, wholesale billing, madurai, stock management, invoice",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: { fontFamily: "var(--font-inter)" },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
