import { TeamRepository } from "@calcom/features/teams/repositories/TeamRepository";
import { TeamService } from "@calcom/features/teams/services/TeamService";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TAcceptInputSchema } from "./accept.schema";
import { revalidateWorkspaceMembershipCache } from "./revalidate";

type AcceptOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TAcceptInputSchema;
};

export const acceptHandler = async ({ ctx, input }: AcceptOptions) => {
  const service = new TeamService(new TeamRepository(ctx.prisma));
  const result = await service.accept(ctx.user.id, ctx.user.email, input.token);
  revalidateWorkspaceMembershipCache();
  return result;
};
