import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { I18nProvider } from "@/components/I18nProvider";
import { getLocale } from "@/lib/i18n/server";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export function generateMetadata(): Metadata {
  return getLocale() === "fr"
    ? { title: "FasoPay — Paie", description: "Paie, CNSS et IUTS conformes au Burkina Faso" }
    : { title: "FasoPay — Payroll", description: "Burkina Faso payroll, CNSS & IUTS compliance" };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale} className={inter.variable}>
      <body className="font-sans">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
