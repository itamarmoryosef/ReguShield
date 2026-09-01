import { Check } from "lucide-react";

const CONFETTI = Array.from({ length: 28 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: (index % 9) * 0.12,
  duration: 1.9 + ((index % 5) * 0.22),
  color: ["bg-brand-500", "bg-emerald-500", "bg-amber-400", "bg-brand-300", "bg-rose-400"][
    index % 5
  ],
  size: index % 3 === 0 ? "h-2.5 w-1.5" : "h-1.5 w-1.5",
}));

export function SuccessOverlay({ planName }: { planName: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-white/95 backdrop-blur-sm animate-fade-in">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-full">
        {CONFETTI.map((piece, index) => (
          <span
            key={index}
            className={`absolute top-0 rounded-sm ${piece.color} ${piece.size} animate-confetti`}
            style={{
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative px-6 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 animate-pop-in">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600">
            <Check className="h-8 w-8 text-white" strokeWidth={3} />
          </span>
        </span>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-gray-900 animate-fade-in-up">
          הכול מוכן!
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 animate-fade-in-up">
          {planName} הופעל והחשבון שלכם נוצר. מעבירים אותך ללוח הבקרה...
        </p>
      </div>
    </div>
  );
}
