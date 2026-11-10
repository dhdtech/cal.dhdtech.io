import type { Prisma, PrismaClient } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

export type WorkspaceForUser = {
  teamId: number;
  ownerUserId: number;
  isOwner: boolean;
};

export class TeamRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findWorkspaceForUser(userId: number): Promise<WorkspaceForUser | null> {
    const memberships = await this.prismaClient.membership.findMany({
      where: {
        userId,
        accepted: true,
        team: {
          isOrganization: false,
          parentId: null,
        },
      },
      select: {
        teamId: true,
        role: true,
        team: {
          select: {
            members: {
              where: { accepted: true, role: MembershipRole.OWNER },
              select: { userId: true },
              take: 1,
            },
          },
        },
      },
    });

    if (memberships.length === 0) return null;

    const membership =
      memberships.find((candidate) => candidate.role === MembershipRole.OWNER) ?? memberships[0];
    const owner = membership.team.members[0];
    if (!owner) return null;

    return {
      teamId: membership.teamId,
      ownerUserId: owner.userId,
      isOwner: membership.role === MembershipRole.OWNER,
    };
  }

  async findTeamWithMembersAndInvites(teamId: number) {
    return this.prismaClient.team.findFirst({
      where: { id: teamId, isOrganization: false, parentId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        members: {
          where: { accepted: true },
          select: {
            role: true,
            user: { select: userSummarySelect },
          },
        },
        inviteTokens: {
          select: {
            id: true,
            identifier: true,
            token: true,
            expires: true,
          },
          orderBy: { id: "desc" },
        },
      },
    });
  }

  async findTeamById(teamId: number) {
    return this.prismaClient.team.findFirst({
      where: { id: teamId, isOrganization: false, parentId: null },
      select: { id: true, name: true, slug: true },
    });
  }

  async findTeamBySlug(slug: string) {
    return this.prismaClient.team.findFirst({
      where: { slug, parentId: null, isOrganization: false },
      select: { id: true },
    });
  }

  async createTeamWithOwner({
    name,
    slug,
    ownerUserId,
  }: {
    name: string;
    slug: string;
    ownerUserId: number;
  }) {
    return this.prismaClient.team.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId: ownerUserId,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
      },
      select: { id: true },
    });
  }

  async addMember({
    teamId,
    userId,
    role = MembershipRole.MEMBER,
    accepted = true,
  }: {
    teamId: number;
    userId: number;
    role?: MembershipRole;
    accepted?: boolean;
  }) {
    return this.prismaClient.membership.upsert({
      where: { userId_teamId: { userId, teamId } },
      create: { teamId, userId, role, accepted },
      update: { role, accepted },
      select: { id: true },
    });
  }

  async findMembership({ teamId, userId }: { teamId: number; userId: number }) {
    return this.prismaClient.membership.findUnique({
      where: { userId_teamId: { userId, teamId } },
      select: { id: true, role: true, accepted: true },
    });
  }

  async removeMember({ teamId, userId }: { teamId: number; userId: number }) {
    return this.prismaClient.membership.delete({
      where: { userId_teamId: { userId, teamId } },
      select: { id: true },
    });
  }

  async deleteMembership({ teamId, userId }: { teamId: number; userId: number }) {
    return this.removeMember({ teamId, userId });
  }

  async findUserByEmail(email: string) {
    return this.prismaClient.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: userSummarySelect,
    });
  }

  async findUsersByEmails(emails: string[]) {
    if (emails.length === 0) return [];
    return this.prismaClient.user.findMany({
      where: { email: { in: emails, mode: "insensitive" } },
      select: { email: true },
    });
  }

  async findOwner(teamId: number) {
    const membership = await this.prismaClient.membership.findFirst({
      where: { teamId, accepted: true, role: MembershipRole.OWNER },
      select: { user: { select: userSummarySelect } },
    });
    return membership?.user ?? null;
  }

  async createInviteToken({
    teamId,
    email,
    token,
    expires,
  }: {
    teamId: number;
    email: string;
    token: string;
    expires: Date;
  }) {
    return this.prismaClient.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token,
        expires,
        teamId,
      },
      select: { id: true, token: true, expires: true },
    });
  }

  async findToken(token: string) {
    return this.prismaClient.verificationToken.findUnique({
      where: { token },
      select: {
        id: true,
        identifier: true,
        token: true,
        expires: true,
        teamId: true,
        team: {
          select: { id: true, name: true, isOrganization: true, parentId: true },
        },
      },
    });
  }

  async findInviteById(inviteId: number) {
    return this.prismaClient.verificationToken.findUnique({
      where: { id: inviteId },
      select: { id: true, teamId: true, identifier: true },
    });
  }

  async deleteToken(token: string) {
    return this.prismaClient.verificationToken.delete({
      where: { token },
      select: { id: true },
    });
  }

  async deleteInviteById(inviteId: number) {
    return this.prismaClient.verificationToken.delete({
      where: { id: inviteId },
      select: { id: true },
    });
  }

  async listInvitesByTeam(teamId: number) {
    return this.prismaClient.verificationToken.findMany({
      where: { teamId },
      select: {
        id: true,
        identifier: true,
        token: true,
        expires: true,
      },
      orderBy: { id: "desc" },
    });
  }

  async findSchedulesForUser(userId: number) {
    return this.prismaClient.schedule.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        timeZone: true,
        availability: {
          select: {
            days: true,
            startTime: true,
            endTime: true,
            date: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });
  }

  async findDefaultScheduleIdForUser(userId: number) {
    const user = await this.prismaClient.user.findUnique({
      where: { id: userId },
      select: { defaultScheduleId: true },
    });
    return user?.defaultScheduleId ?? null;
  }
}
