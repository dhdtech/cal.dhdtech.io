import { TeamRepository } from "@calcom/features/teams/repositories/TeamRepository";
import { TeamService } from "@calcom/features/teams/services/TeamService";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TCreateInputSchema } from "./create.schema";
import { revalidateWorkspaceMembershipCache } from "./revalidate";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const service = new TeamService(new TeamRepository(ctx.prisma));
  const result = await service.create(ctx.user.id, input.name);
  revalidateWorkspaceMembershipCache();
  return result;
};
