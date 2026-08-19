import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Contract AI Audit",
  description: "B2B сервис ИИ-аудита договоров"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-950 antialiased dark:bg-slate-950 dark:text-slate-50">{children}</body>
    </html>
  );
}
