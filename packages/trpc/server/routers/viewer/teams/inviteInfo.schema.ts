import { z } from "zod";

export const ZInviteInfoInputSchema = z.object({
  token: z.string().trim().min(1),
});

export type TInviteInfoInputSchema = z.infer<typeof ZInviteInfoInputSchema>;
