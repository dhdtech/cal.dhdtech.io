import { TeamRepository } from "@calcom/features/teams/repositories/TeamRepository";
import { TeamService } from "@calcom/features/teams/services/TeamService";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TInviteInfoInputSchema } from "./inviteInfo.schema";

type InviteInfoOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TInviteInfoInputSchema;
};

export const inviteInfoHandler = async ({ ctx, input }: InviteInfoOptions) => {
  const service = new TeamService(new TeamRepository(ctx.prisma));
  return service.inviteInfo(input.token);
};
