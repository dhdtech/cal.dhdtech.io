import { TeamRepository } from "@calcom/features/teams/repositories/TeamRepository";
import { TeamService } from "@calcom/features/teams/services/TeamService";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
};

export const getHandler = async ({ ctx }: GetOptions) => {
  const service = new TeamService(new TeamRepository(ctx.prisma));
  return service.get(ctx.user.id);
};
