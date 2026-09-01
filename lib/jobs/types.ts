import type { z } from "zod";
import type { jobProviderSchema } from "@/lib/validation/schemas";

export type JobProvider = z.infer<typeof jobProviderSchema>;
