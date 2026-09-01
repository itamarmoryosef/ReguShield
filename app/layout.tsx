import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReguShield | רגולשילד — ציות רגולטורי למסעדות",
  description: "מערכת ציות רגולטורי לעסקי מזון בישראל. רמזור מסמכים, סריקת AI וניהול תיק לקוחות.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className={`${heebo.className} antialiased`}>{children}</body>
    </html>
  );
}
