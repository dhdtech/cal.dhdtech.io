import { TeamRepository } from "@calcom/features/teams/repositories/TeamRepository";
import { TeamService } from "@calcom/features/teams/services/TeamService";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import { revalidateWorkspaceMembershipCache } from "./revalidate";

type LeaveOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
};

export const leaveHandler = async ({ ctx }: LeaveOptions) => {
  const service = new TeamService(new TeamRepository(ctx.prisma));
  const result = await service.leave(ctx.user.id);
  revalidateWorkspaceMembershipCache();
  return result;
};
