"use client";

import { Heebo } from "next/font/google";
import { ErrorFallback } from "@/components/errors/ErrorFallback";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.className} min-h-screen bg-[#f4f7f6] antialiased`}>
        <ErrorFallback error={error} reset={reset} title="שגיאה כללית במערכת" />
      </body>
    </html>
  );
}
