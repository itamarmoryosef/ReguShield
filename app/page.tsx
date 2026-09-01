import {
  ArrowLeft,
  BellRing,
  Building2,
  CheckCircle2,
  FileSignature,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";

const FEATURES = [
  {
    icon: <ScanLine className="h-[18px] w-[18px]" />,
    title: "סריקת AI לאישורים",
    text: "מצלמים את האישור, והמערכת מזהה את סוג המסמך ומחלצת את תאריכי התוקף. אפס הקלדה.",
  },
  {
    icon: <FileSignature className="h-[18px] w-[18px]" />,
    title: "מילוי טפסים אוטומטי",
    text: "תצהיר בטיחות אש ובקשות לרשות המקומית נוצרים ממולאים מפרטי העסק, מוכנים לחתימה.",
  },
  {
    icon: <BellRing className="h-[18px] w-[18px]" />,
    title: "התראות בוואטסאפ",
    text: "תזכורת לפני שאישור פג תוקף, כדי שהחידוש יקרה בזמן ולא אחרי הביקורת.",
  },
];

const STEPS = [
  {
    title: "מגדירים את העסק",
    text: "בוחרים אילו אישורים רלוונטיים לעסק שלכם - ולא רואים את השאר.",
  },
  {
    title: "מעלים או יוצרים",
    text: "סורקים אישור קיים, או מפיקים טופס ממולא בלחיצה אחת.",
  },
  {
    title: "נשארים בירוק",
    text: "לוח רמזור אחד מראה מה בתוקף, מה פג ומה עומד לפוג.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShieldCheck className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-gray-900">ReguShield</p>
              <p className="text-[11px] text-gray-500">רגולציה ורישוי לעסקי מזון</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              התחבר
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              התחל חינם
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 shadow-card">
                <Sparkles className="h-3 w-3 text-brand-600" />
                מנוע AI לניהול ציות רגולטורי
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.12] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.4rem]">
                ReguShield - אל תחכה
                <br />
                לקנס מהעירייה.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-gray-600">
                ניהול רגולציה ורישוי עסקים באפס מאמץ.
              </p>
              <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  התחל חינם
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-700 shadow-card transition-colors hover:bg-gray-50"
                >
                  התחבר
                </Link>
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
                {["14 יום ניסיון", "ללא כרטיס אשראי", "התקנה בדקה"].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <HeroPreview />
          </div>
        </section>

        <section className="border-y border-gray-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
                כל הבירוקרטיה של העסק, במקום אחד
              </h2>
              <p className="mt-3 text-base leading-7 text-gray-600">
                רגולשילד מחליף את הקלסר ואת התזכורות בראש בתהליך אחד, ברור וממוחשב.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <Feature key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            שלושה צעדים ואתם מכוסים
          </h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-card"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl bg-brand-600 px-6 py-12 text-center sm:px-12">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              מוכנים להפסיק לרוץ אחרי אישורים?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-100">
              פתחו חשבון, בחרו את הדרישות הרלוונטיות לעסק, וקבלו לוח בקרה שמראה בדיוק מה חסר.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
              >
                התחל חינם
              </Link>
              <Link
                href="/onboarding"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                הצטרפות מלאה בליווי
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-gray-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} ReguShield. כל הזכויות שמורות.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="transition-colors hover:text-gray-900">
              התחברות
            </Link>
            <Link href="/signup" className="transition-colors hover:text-gray-900">
              הרשמה
            </Link>
            <Link href="/partner" className="transition-colors hover:text-gray-900">
              אזור שותפים
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-card transition-all hover:border-gray-300 hover:shadow-card-hover">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        {icon}
      </div>
      <h3 className="mt-3.5 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{text}</p>
    </article>
  );
}

function HeroPreview() {
  const rows: { name: string; status: string; className: string }[] = [
    { name: "רישיון עסק", status: "בתוקף", className: "bg-emerald-600" },
    { name: "אישור כיבוי אש", status: "פג תוקף", className: "bg-red-600" },
    { name: "בדיקת מטפים", status: "פג בקרוב", className: "bg-amber-500" },
    { name: "יומן הדברה", status: "בתוקף", className: "bg-emerald-600" },
  ];

  return (
    <div className="animate-scale-in rounded-2xl border border-gray-200 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">מסעדת הים התיכון</p>
          <p className="text-xs text-gray-500">8 דרישות פעילות</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Building2 className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "חסרים", value: 2, dot: "bg-red-500" },
          { label: "בקרוב", value: 1, dot: "bg-amber-500" },
          { label: "בתוקף", value: 5, dot: "bg-emerald-500" },
        ].map((tile) => (
          <div key={tile.label} className="rounded-lg border border-gray-200 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${tile.dot}`} />
              <p className="text-[11px] text-gray-500">{tile.label}</p>
            </div>
            <p className="mt-1 text-lg font-semibold leading-none text-gray-900">{tile.value}</p>
          </div>
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {rows.map((row) => (
          <li
            key={row.name}
            className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5"
          >
            <span className="text-sm text-gray-800">{row.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium text-white ${row.className}`}
            >
              {row.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
