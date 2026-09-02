"use client";

import { LinkIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";

type State = { kind: "working" } | { kind: "dead"; title: string; message: string };

const EXPIRED = {
  title: "הקישור אינו בתוקף",
  message:
    "הקישור תקף לשעה אחת ולשימוש אחד בלבד. אם ביקשתם יותר מקישור אחד, רק האחרון שנשלח עובד.",
};

const FAILED = {
  title: "האימות נכשל",
  message: "לא הצלחנו לאמת את הקישור. בקשו קישור חדש והשתמשו בו מיד כשהוא מגיע.",
};

/** Same-origin paths only: `next` is echoed back from a link inside an email. */
function safePath(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

/**
 * Finishes a sign-in whose payload arrived after the '#'.
 *
 * Supabase's implicit flow returns the session, or the reason it refused, in
 * the URL fragment. Browsers never send a fragment to the server, so a server
 * route sees an empty-looking request and cannot tell success from failure.
 * That is why this step runs in the browser.
 */
export function CompleteSignIn() {
  const [state, setState] = useState<State>({ kind: "working" });

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const read = (key: string) => fragment.get(key) ?? query.get(key);

    const errorCode = read("error_code");
    const errorText = read("error_description") ?? read("error");

    if (errorCode === "otp_expired" || /expired|invalid/i.test(errorText ?? "")) {
      setState({ kind: "dead", ...EXPIRED });
      return;
    }

    if (errorCode || errorText) {
      setState({ kind: "dead", ...FAILED });
      return;
    }

    const accessToken = read("access_token");
    const refreshToken = read("refresh_token");

    if (!accessToken || !refreshToken) {
      setState({ kind: "dead", ...EXPIRED });
      return;
    }

    const next =
      safePath(query.get("next")) ??
      (read("type") === "recovery" ? "/reset-password" : "/auth/resolve");

    // Loaded on demand so the spinner paints before the Supabase bundle
    // arrives, which matters on the phone this link is usually opened on.
    void (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const { error } = await createClient().auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setState({ kind: "dead", ...FAILED });
          return;
        }

        // A full navigation rather than a router push: the page being opened is
        // rendered on the server, and it has to receive the new session cookies.
        window.location.replace(next);
      } catch {
        setState({ kind: "dead", ...FAILED });
      }
    })();
  }, []);

  if (state.kind === "working") {
    return (
      <AuthShell
        title="רק רגע"
        subtitle="מאמתים את הקישור"
        footer={
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            חזרה להתחברות
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          <p className="text-sm text-gray-500">עוד שנייה ואתם בפנים</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={state.title}
      subtitle="קישורי אימות הם חד-פעמיים"
      footer={
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          חזרה להתחברות
        </Link>
      }
    >
      <div className="mb-5 flex justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <LinkIcon className="h-6 w-6" />
        </span>
      </div>

      <p className="text-center text-sm leading-relaxed text-gray-700">{state.message}</p>

      <Link
        href="/forgot-password"
        className="mt-5 block rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        בקשת קישור חדש
      </Link>
    </AuthShell>
  );
}
