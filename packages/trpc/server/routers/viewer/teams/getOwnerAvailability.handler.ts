import { TeamRepository } from "@calcom/features/teams/repositories/TeamRepository";
import { TeamService } from "@calcom/features/teams/services/TeamService";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";

type GetOwnerAvailabilityOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
};

export const getOwnerAvailabilityHandler = async ({ ctx }: GetOwnerAvailabilityOptions) => {
  const service = new TeamService(new TeamRepository(ctx.prisma));
  return service.getOwnerAvailability(ctx.user.id);
};
