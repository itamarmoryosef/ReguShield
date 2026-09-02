import { CompleteSignIn } from "@/components/auth/CompleteSignIn";

// The whole point of this page is to read a URL fragment at runtime.
export const dynamic = "force-dynamic";

export default function AuthCompletePage() {
  return <CompleteSignIn />;
}
