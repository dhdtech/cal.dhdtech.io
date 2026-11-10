import { z } from "zod";

export const ZCreateInputSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(255),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
