import { TeamRepository } from "@calcom/features/teams/repositories/TeamRepository";
import { TeamService } from "@calcom/features/teams/services/TeamService";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TInviteInputSchema } from "./invite.schema";

type InviteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TInviteInputSchema;
};

export const inviteHandler = async ({ ctx, input }: InviteOptions) => {
  const service = new TeamService(new TeamRepository(ctx.prisma));
  return service.invite(ctx.user.id, input.email);
};
