import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  membership: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  team: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  verificationToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  schedule: {
    findMany: vi.fn(),
  },
}));

vi.mock("@calcom/prisma", () => ({
  __esModule: true,
  default: prismaMock,
  PrismaClient: vi.fn().mockImplementation(function () {
    return prismaMock;
  }),
}));

vi.mock("@calcom/emails/email-manager", () => ({
  sendTeamInviteEmail: vi.fn(),
}));

import { sendTeamInviteEmail } from "@calcom/emails/email-manager";
import { PrismaClient } from "@calcom/prisma";
import { TeamRepository } from "../repositories/TeamRepository";
import { TeamService } from "./TeamService";

const prisma = new PrismaClient();
const service = new TeamService(new TeamRepository(prisma));

const future = () => new Date(Date.now() + 60 * 60 * 1000);
const past = () => new Date(Date.now() - 60 * 60 * 1000);

const ownerMembership = { teamId: 1, role: "OWNER" as const, team: { members: [{ userId: 10 }] } };
const memberMembership = { teamId: 1, role: "MEMBER" as const, team: { members: [{ userId: 10 }] } };

const ownerUser = { id: 10, name: "Owner", email: "owner@example.com", username: "owner", avatarUrl: null };
const memberUser = {
  id: 11,
  name: "Member",
  email: "member@example.com",
  username: "member",
  avatarUrl: null,
};

const teamRecord = {
  id: 1,
  name: "Acme",
  slug: "acme-abc",
  members: [
    { role: "OWNER" as const, user: ownerUser },
    { role: "MEMBER" as const, user: memberUser },
  ],
  inviteTokens: [
    { id: 5, identifier: "pending@example.com", token: "pending-token", expires: future() },
    { id: 6, identifier: "expired@example.com", token: "expired-token", expires: past() },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sendTeamInviteEmail).mockResolvedValue(undefined);
});

describe("TeamService.get", () => {
  it("returns an empty workspace for a user with no team", async () => {
    prismaMock.membership.findMany.mockResolvedValue([]);

    await expect(service.get(99)).resolves.toEqual({
      team: null,
      effectiveUserId: 99,
      isOwner: false,
    });
  });

  it("hides pending invite links from members", async () => {
    prismaMock.membership.findMany.mockResolvedValue([memberMembership]);
    prismaMock.team.findFirst.mockResolvedValue(teamRecord);

    const result = await service.get(11);

    expect(result.isOwner).toBe(false);
    expect(result.team?.pendingInvites).toEqual([]);
  });

  it("maps the team, owner, members and pending invites", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);
    prismaMock.team.findFirst.mockResolvedValue(teamRecord);
    prismaMock.user.findMany.mockResolvedValue([]);

    const result = await service.get(10);

    expect(result.effectiveUserId).toBe(10);
    expect(result.isOwner).toBe(true);
    expect(result.team).toMatchObject({
      id: 1,
      name: "Acme",
      slug: "acme-abc",
      owner: ownerUser,
      members: [memberUser],
    });
    expect(result.team?.pendingInvites).toEqual([
      {
        id: 5,
        email: "pending@example.com",
        token: "pending-token",
        expiresAt: expect.any(Date),
        joinLink: expect.stringContaining("/auth/signup?token=pending-token"),
      },
    ]);
  });

  it("uses the accept link for an invitee who is already registered", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);
    prismaMock.team.findFirst.mockResolvedValue(teamRecord);
    prismaMock.user.findMany.mockResolvedValue([{ email: "pending@example.com" }]);

    const result = await service.get(10);

    expect(result.team?.pendingInvites[0].joinLink).toContain("/settings/team/accept?token=pending-token");
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: { in: ["pending@example.com"], mode: "insensitive" } },
      })
    );
  });
});

describe("TeamService.create", () => {
  it("rejects a user who already belongs to a team", async () => {
    prismaMock.membership.findMany.mockResolvedValue([memberMembership]);

    await expect(service.create(11, "Another team")).rejects.toMatchObject({
      code: "bad_request_error",
    });
  });

  it("creates a team with a unique slug and the caller as owner", async () => {
    prismaMock.membership.findMany.mockResolvedValue([]);
    prismaMock.team.findFirst.mockResolvedValue(null);
    prismaMock.team.create.mockResolvedValue({ id: 7 });

    await expect(service.create(10, "Acme Team")).resolves.toEqual({ teamId: 7 });

    const createArgs = prismaMock.team.create.mock.calls[0][0];
    expect(createArgs.data.slug).toMatch(/^acme-team-[a-z0-9]+$/);
    expect(createArgs.data.members.create).toEqual({ userId: 10, role: "OWNER", accepted: true });
  });

  it("retries the slug when it is already taken", async () => {
    prismaMock.membership.findMany.mockResolvedValue([]);
    prismaMock.team.findFirst.mockResolvedValueOnce({ id: 99 }).mockResolvedValueOnce(null);
    prismaMock.team.create.mockResolvedValue({ id: 7 });

    await service.create(10, "Acme Team");

    expect(prismaMock.team.create.mock.calls[0][0].data.slug).toMatch(/^acme-team-[a-z0-9]+-1$/);
  });
});

describe("TeamService.invite", () => {
  it("forbids a member from inviting", async () => {
    prismaMock.membership.findMany.mockResolvedValue([memberMembership]);

    await expect(service.invite(11, "new@example.com")).rejects.toMatchObject({
      code: "forbidden_error",
    });
  });

  it("rejects an email that is already an accepted member", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);
    prismaMock.user.findFirst.mockResolvedValue(memberUser);
    prismaMock.membership.findUnique.mockResolvedValue({ id: 2, role: "MEMBER", accepted: true });

    await expect(service.invite(10, "member@example.com")).rejects.toMatchObject({
      code: "bad_request_error",
    });
  });

  it("rejects a duplicate pending invite", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.verificationToken.findMany.mockResolvedValue([
      { id: 5, identifier: "pending@example.com", token: "token", expires: future() },
    ]);

    await expect(service.invite(10, "pending@example.com")).rejects.toMatchObject({
      code: "bad_request_error",
    });
  });

  it("creates the token, sends the email and returns the join link", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.verificationToken.findMany.mockResolvedValue([]);
    prismaMock.verificationToken.create.mockResolvedValue({
      id: 5,
      token: "generated-token",
      expires: future(),
    });
    prismaMock.team.findFirst.mockResolvedValue({ id: 1, name: "Acme", slug: "acme" });
    prismaMock.membership.findFirst.mockResolvedValue({ user: ownerUser });

    const result = await service.invite(10, "New@Example.com");

    expect(result.emailSent).toBe(true);
    expect(result.joinLink).toMatch(/\/auth\/signup\?token=.+/);
    expect(prismaMock.verificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ identifier: "new@example.com", teamId: 1 }),
      })
    );
    expect(sendTeamInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "new@example.com", from: "Owner", teamName: "Acme" })
    );
  });

  it("sends an existing user to the accept page instead of signup", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);
    prismaMock.user.findFirst.mockResolvedValue({ id: 12, email: "existing@example.com" });
    prismaMock.membership.findUnique.mockResolvedValue(null);
    prismaMock.verificationToken.findMany.mockResolvedValue([]);
    prismaMock.verificationToken.create.mockResolvedValue({
      id: 6,
      token: "existing-token",
      expires: future(),
    });
    prismaMock.team.findFirst.mockResolvedValue({ id: 1, name: "Acme", slug: "acme" });
    prismaMock.membership.findFirst.mockResolvedValue({ user: ownerUser });

    const result = await service.invite(10, "existing@example.com");

    expect(result.joinLink).toMatch(/\/settings\/team\/accept\?token=.+/);
  });

  it("still persists the invite when the email fails", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.verificationToken.findMany.mockResolvedValue([]);
    prismaMock.verificationToken.create.mockResolvedValue({
      id: 5,
      token: "generated-token",
      expires: future(),
    });
    prismaMock.team.findFirst.mockResolvedValue({ id: 1, name: "Acme", slug: "acme" });
    prismaMock.membership.findFirst.mockResolvedValue({ user: ownerUser });
    vi.mocked(sendTeamInviteEmail).mockRejectedValueOnce(new Error("smtp down"));

    await expect(service.invite(10, "new@example.com")).resolves.toMatchObject({
      emailSent: false,
    });
  });
});

describe("TeamService.accept", () => {
  const invite = {
    id: 5,
    identifier: "Member@Example.com",
    token: "invite-token",
    expires: future(),
    teamId: 1,
    team: { id: 1, name: "Acme", isOrganization: false, parentId: null },
  };

  it("accepts a valid invite for the matching email", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(invite);
    prismaMock.membership.findMany.mockResolvedValue([]);
    prismaMock.membership.upsert.mockResolvedValue({ id: 2 });
    prismaMock.verificationToken.delete.mockResolvedValue({ id: 5 });

    await expect(service.accept(11, "member@example.com", "invite-token")).resolves.toEqual({
      teamId: 1,
    });
    expect(prismaMock.membership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { teamId: 1, userId: 11, role: "MEMBER", accepted: true },
      })
    );
    expect(prismaMock.verificationToken.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: "invite-token" } })
    );
  });

  it("rejects an expired token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({ ...invite, expires: past() });

    await expect(service.accept(11, "member@example.com", "invite-token")).rejects.toMatchObject({
      code: "bad_request_error",
    });
  });

  it("rejects a token issued for another email address", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(invite);

    await expect(service.accept(11, "someone-else@example.com", "invite-token")).rejects.toMatchObject({
      code: "forbidden_error",
    });
  });

  it("rejects a caller who already belongs to a team", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(invite);
    prismaMock.membership.findMany.mockResolvedValue([memberMembership]);

    await expect(service.accept(11, "member@example.com", "invite-token")).rejects.toMatchObject({
      code: "bad_request_error",
    });
  });

  it("rejects an unknown token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(null);

    await expect(service.accept(11, "member@example.com", "missing")).rejects.toMatchObject({
      code: "not_found_error",
    });
  });
});

describe("TeamService.removeMember", () => {
  it("forbids a member from removing anyone", async () => {
    prismaMock.membership.findMany.mockResolvedValue([memberMembership]);

    await expect(service.removeMember(11, 12)).rejects.toMatchObject({ code: "forbidden_error" });
  });

  it("forbids removing the owner", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);

    await expect(service.removeMember(10, 10)).rejects.toMatchObject({ code: "bad_request_error" });
  });

  it("removes an existing member", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);
    prismaMock.membership.findUnique.mockResolvedValue({ id: 2, role: "MEMBER", accepted: true });
    prismaMock.membership.delete.mockResolvedValue({ id: 2 });

    await expect(service.removeMember(10, 11)).resolves.toEqual({ ok: true });
    expect(prismaMock.membership.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_teamId: { userId: 11, teamId: 1 } } })
    );
  });

  it("rejects a user who is not a member of the team", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);
    prismaMock.membership.findUnique.mockResolvedValue(null);

    await expect(service.removeMember(10, 12)).rejects.toMatchObject({ code: "not_found_error" });
  });
});

describe("TeamService.leave", () => {
  it("forbids the owner from leaving", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);

    await expect(service.leave(10)).rejects.toMatchObject({ code: "bad_request_error" });
  });

  it("removes a member's own membership", async () => {
    prismaMock.membership.findMany.mockResolvedValue([memberMembership]);
    prismaMock.membership.delete.mockResolvedValue({ id: 2 });

    await expect(service.leave(11)).resolves.toEqual({ ok: true });
    expect(prismaMock.membership.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_teamId: { userId: 11, teamId: 1 } } })
    );
  });
});

describe("TeamService.cancelInvite", () => {
  it("deletes an invite that belongs to the owner's team", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      id: 5,
      teamId: 1,
      identifier: "invite@example.com",
    });
    prismaMock.verificationToken.delete.mockResolvedValue({ id: 5 });

    await expect(service.cancelInvite(10, 5)).resolves.toEqual({ ok: true });
    expect(prismaMock.verificationToken.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } })
    );
  });

  it("rejects an invite from another team", async () => {
    prismaMock.membership.findMany.mockResolvedValue([ownerMembership]);
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      id: 5,
      teamId: 2,
      identifier: "invite@example.com",
    });

    await expect(service.cancelInvite(10, 5)).rejects.toMatchObject({ code: "not_found_error" });
  });
});

describe("TeamService.getOwnerAvailability", () => {
  it("returns the effective owner's schedules for a member", async () => {
    prismaMock.membership.findMany.mockResolvedValue([memberMembership]);
    prismaMock.schedule.findMany.mockResolvedValue([
      {
        id: 3,
        name: "Work hours",
        timeZone: "Europe/London",
        availability: [{ days: [1, 2], startTime: new Date(0), endTime: new Date(0), date: null }],
      },
    ]);
    prismaMock.user.findUnique.mockResolvedValue({ defaultScheduleId: 3 });

    await expect(service.getOwnerAvailability(11)).resolves.toEqual({
      schedules: [
        {
          id: 3,
          name: "Work hours",
          timeZone: "Europe/London",
          isDefault: true,
          availability: [{ days: [1, 2], startTime: new Date(0), endTime: new Date(0), date: null }],
        },
      ],
    });
    expect(prismaMock.schedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 10 } })
    );
  });
});
