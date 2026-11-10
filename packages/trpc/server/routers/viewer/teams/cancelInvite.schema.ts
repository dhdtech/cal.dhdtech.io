import { z } from "zod";

export const ZCancelInviteInputSchema = z.object({
  inviteId: z.number().int().positive(),
});

export type TCancelInviteInputSchema = z.infer<typeof ZCancelInviteInputSchema>;
