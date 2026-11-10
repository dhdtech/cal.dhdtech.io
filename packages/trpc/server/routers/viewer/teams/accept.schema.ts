import { z } from "zod";

export const ZAcceptInputSchema = z.object({
  token: z.string().trim().min(1),
});

export type TAcceptInputSchema = z.infer<typeof ZAcceptInputSchema>;
