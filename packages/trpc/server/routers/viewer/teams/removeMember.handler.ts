import { TeamRepository } from "@calcom/features/teams/repositories/TeamRepository";
import { TeamService } from "@calcom/features/teams/services/TeamService";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TRemoveMemberInputSchema } from "./removeMember.schema";
import { revalidateWorkspaceMembershipCache } from "./revalidate";

type RemoveMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TRemoveMemberInputSchema;
};

export const removeMemberHandler = async ({ ctx, input }: RemoveMemberOptions) => {
  const service = new TeamService(new TeamRepository(ctx.prisma));
  const result = await service.removeMember(ctx.user.id, input.userId);
  revalidateWorkspaceMembershipCache();
  return result;
};
