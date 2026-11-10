import { z } from "zod";

export const ZInviteInputSchema = z.object({
  email: z.string().trim().email(),
});

export type TInviteInputSchema = z.infer<typeof ZInviteInputSchema>;
