import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-card">
        <p className="text-xs font-medium text-brand-600">404</p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-gray-900">
          העמוד לא נמצא
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          ייתכן שהקישור שגוי או שהעמוד הוסר.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
}
