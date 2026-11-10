import { beforeEach, describe, expect, it, vi } from "vitest";

const { membershipFindMany } = vi.hoisted(() => ({ membershipFindMany: vi.fn() }));

vi.mock("@calcom/prisma", () => ({
  __esModule: true,
  default: { membership: { findMany: membershipFindMany } },
}));

import { getEffectiveUserId, getWorkspaceForUser } from "./workspace";

const membership = (teamId: number, ownerUserId: number, role: "OWNER" | "MEMBER" = "MEMBER") => ({
  teamId,
  role,
  team: { members: [{ userId: ownerUserId }] },
});

describe("workspace", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("resolves the team owner when the caller owns the workspace", async () => {
    membershipFindMany.mockResolvedValue([membership(10, 7, "OWNER")]);

    await expect(getWorkspaceForUser(7)).resolves.toEqual({
      teamId: 10,
      ownerUserId: 7,
      isOwner: true,
    });
  });

  it("resolves the owner as the effective user for a member", async () => {
    membershipFindMany.mockResolvedValue([membership(10, 7)]);

    await expect(getWorkspaceForUser(99)).resolves.toEqual({
      teamId: 10,
      ownerUserId: 7,
      isOwner: false,
    });
    await expect(getEffectiveUserId(99)).resolves.toBe(7);
  });

  it("returns null and the caller when the user has no workspace", async () => {
    membershipFindMany.mockResolvedValue([]);

    await expect(getWorkspaceForUser(99)).resolves.toBeNull();
    await expect(getEffectiveUserId(99)).resolves.toBe(99);
  });

  it("prefers an owner membership when the user belongs to more than one team", async () => {
    membershipFindMany.mockResolvedValue([membership(10, 7), membership(20, 99, "OWNER")]);

    await expect(getWorkspaceForUser(99)).resolves.toEqual({
      teamId: 20,
      ownerUserId: 99,
      isOwner: true,
    });
  });

  it("returns null when the team has no accepted owner membership", async () => {
    membershipFindMany.mockResolvedValue([{ teamId: 10, role: "MEMBER", team: { members: [] } }]);

    await expect(getWorkspaceForUser(99)).resolves.toBeNull();
  });

  it("only considers accepted memberships of non-organization, top-level teams", async () => {
    membershipFindMany.mockResolvedValue([]);

    await getWorkspaceForUser(5);

    expect(membershipFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 5,
          accepted: true,
          team: { isOrganization: false, parentId: null },
        },
      })
    );
  });
});
