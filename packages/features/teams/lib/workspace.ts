import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import { TeamRepository, type WorkspaceForUser } from "../repositories/TeamRepository";

/**
 * A workspace is a top-level, non-organization team. A user has at most one,
 * enforced by the service on create and accept.
 */
export async function getWorkspaceForUser(
  userId: number,
  prismaClient: PrismaClient = prisma
): Promise<WorkspaceForUser | null> {
  const repository = new TeamRepository(prismaClient);
  return repository.findWorkspaceForUser(userId);
}

/**
 * Members operate on the owner's event types, bookings and availability.
 * Owners and users without a workspace act as themselves.
 */
export async function getEffectiveUserId(
  userId: number,
  prismaClient: PrismaClient = prisma
): Promise<number> {
  const workspace = await getWorkspaceForUser(userId, prismaClient);
  return workspace?.ownerUserId ?? userId;
}
