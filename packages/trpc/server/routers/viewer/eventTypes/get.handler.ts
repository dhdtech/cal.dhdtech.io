import getEventTypeById from "@calcom/features/eventtypes/lib/getEventTypeById";
import { getEffectiveUserId } from "@calcom/features/teams/lib/workspace";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  const effectiveOwnerId = await getEffectiveUserId(ctx.user.id, ctx.prisma);
  return getEventTypeById({
    currentOrganizationId: ctx.user.profile?.organizationId ?? null,
    eventTypeId: input.id,
    userId: effectiveOwnerId,
    prisma: ctx.prisma,
    isTrpcCall: true,
    isUserOrganizationAdmin: !!ctx.user?.organization?.isOrgAdmin,
    userLocale: ctx.user.locale,
  });
};
