import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAcceptInputSchema } from "./accept.schema";
import { ZCancelInviteInputSchema } from "./cancelInvite.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZInviteInputSchema } from "./invite.schema";
import { ZInviteInfoInputSchema } from "./inviteInfo.schema";
import { ZRemoveMemberInputSchema } from "./removeMember.schema";
import { revalidateWorkspaceMembershipCache } from "./revalidate";

export const teamsRouter = router({
  get: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./get.handler")).getHandler;
    return handler({ ctx });
  }),
  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const handler = (await import("./create.handler")).createHandler;
    const result = await handler({ ctx, input });
    revalidateWorkspaceMembershipCache();
    return result;
  }),
  invite: authedProcedure.input(ZInviteInputSchema).mutation(async ({ ctx, input }) => {
    const handler = (await import("./invite.handler")).inviteHandler;
    return handler({ ctx, input });
  }),
  cancelInvite: authedProcedure.input(ZCancelInviteInputSchema).mutation(async ({ ctx, input }) => {
    const handler = (await import("./cancelInvite.handler")).cancelInviteHandler;
    return handler({ ctx, input });
  }),
  removeMember: authedProcedure.input(ZRemoveMemberInputSchema).mutation(async ({ ctx, input }) => {
    const handler = (await import("./removeMember.handler")).removeMemberHandler;
    const result = await handler({ ctx, input });
    revalidateWorkspaceMembershipCache();
    return result;
  }),
  leave: authedProcedure.mutation(async ({ ctx }) => {
    const handler = (await import("./leave.handler")).leaveHandler;
    const result = await handler({ ctx });
    revalidateWorkspaceMembershipCache();
    return result;
  }),
  accept: authedProcedure.input(ZAcceptInputSchema).mutation(async ({ ctx, input }) => {
    const handler = (await import("./accept.handler")).acceptHandler;
    const result = await handler({ ctx, input });
    revalidateWorkspaceMembershipCache();
    return result;
  }),
  inviteInfo: authedProcedure.input(ZInviteInfoInputSchema).query(async ({ ctx, input }) => {
    const handler = (await import("./inviteInfo.handler")).inviteInfoHandler;
    return handler({ ctx, input });
  }),
  getOwnerAvailability: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./getOwnerAvailability.handler")).getOwnerAvailabilityHandler;
    return handler({ ctx });
  }),
});
