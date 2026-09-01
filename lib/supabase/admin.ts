import { createClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new AppError("חסר מפתח שירות של Supabase לעבודות רקע", {
      code: "SERVICE_ROLE_MISSING",
      status: 503,
    });
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
