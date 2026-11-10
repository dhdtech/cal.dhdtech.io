import { TeamRepository } from "@calcom/features/teams/repositories/TeamRepository";
import { TeamService } from "@calcom/features/teams/services/TeamService";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TCancelInviteInputSchema } from "./cancelInvite.schema";

type CancelInviteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCancelInviteInputSchema;
};

export const cancelInviteHandler = async ({ ctx, input }: CancelInviteOptions) => {
  const service = new TeamService(new TeamRepository(ctx.prisma));
  return service.cancelInvite(ctx.user.id, input.inviteId);
};
