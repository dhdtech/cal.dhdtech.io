import { randomUUID } from "node:crypto";
import { sendTeamInviteEmail } from "@calcom/emails/email-manager";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { slugify } from "@calcom/lib/slugify";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TeamRepository, WorkspaceForUser } from "../repositories/TeamRepository";

const INVITE_EXPIRY_DAYS = 7;
const INVITE_EXPIRY_MS = INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

const log = logger.getSubLogger({ prefix: ["features/teams/services/TeamService"] });

export class TeamService {
  constructor(private readonly teamRepository: TeamRepository) {}

  private buildJoinLink(token: string, isRegistered: boolean): string {
    // A registered user signs in and accepts; a new user must sign up so the
    // signup handler can create the membership from the same token.
    const path = isRegistered ? "/settings/team/accept" : "/auth/signup";
    return `${WEBAPP_URL}${path}?token=${token}`;
  }

  private async requireWorkspace(userId: number): Promise<WorkspaceForUser> {
    const workspace = await this.teamRepository.findWorkspaceForUser(userId);
    if (!workspace) {
      throw new ErrorWithCode(ErrorCode.NotFound, "You do not belong to a team");
    }
    return workspace;
  }

  private async requireOwner(userId: number): Promise<WorkspaceForUser> {
    const workspace = await this.requireWorkspace(userId);
    if (!workspace.isOwner || workspace.ownerUserId !== userId) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "Only the team owner can perform this action");
    }
    return workspace;
  }

  async get(userId: number) {
    const workspace = await this.teamRepository.findWorkspaceForUser(userId);
    if (!workspace) {
      return { team: null, effectiveUserId: userId, isOwner: false };
    }

    const team = await this.teamRepository.findTeamWithMembersAndInvites(workspace.teamId);
    const ownerMembership = team?.members.find((member) => member.role === MembershipRole.OWNER);
    const owner = ownerMembership?.user;

    if (!team || !owner) {
      return { team: null, effectiveUserId: workspace.ownerUserId, isOwner: workspace.isOwner };
    }

    const now = new Date();
    // Invite links are secrets: only the owner may see them.
    const pendingInviteTokens = workspace.isOwner
      ? team.inviteTokens.filter((invite) => invite.expires > now)
      : [];
    const registeredEmails = pendingInviteTokens.length
      ? await this.teamRepository.findUsersByEmails(pendingInviteTokens.map((invite) => invite.identifier))
      : [];
    const registeredEmailSet = new Set(registeredEmails.map((user) => user.email.toLowerCase()));
    const pendingInvites = pendingInviteTokens.map((invite) => ({
      id: invite.id,
      email: invite.identifier,
      token: invite.token,
      expiresAt: invite.expires,
      joinLink: this.buildJoinLink(invite.token, registeredEmailSet.has(invite.identifier.toLowerCase())),
    }));

    return {
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        owner,
        members: team.members
          .filter((member) => member.role !== MembershipRole.OWNER)
          .map((member) => member.user),
        pendingInvites,
      },
      effectiveUserId: workspace.ownerUserId,
      isOwner: workspace.isOwner,
    };
  }

  async create(userId: number, name: string) {
    const existing = await this.teamRepository.findWorkspaceForUser(userId);
    if (existing) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "You already belong to a team");
    }

    const baseSlug = slugify(name) || "team";
    const suffix = Date.now().toString(36);
    let slug = `${baseSlug}-${suffix}`;
    let attempt = 0;
    // Team @@unique([slug, parentId]) does not enforce uniqueness when parentId is NULL.
    while (await this.teamRepository.findTeamBySlug(slug)) {
      attempt += 1;
      slug = `${baseSlug}-${suffix}-${attempt}`;
    }

    const team = await this.teamRepository.createTeamWithOwner({ name, slug, ownerUserId: userId });
    return { teamId: team.id };
  }

  async invite(userId: number, email: string) {
    const workspace = await this.requireOwner(userId);
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await this.teamRepository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      const membership = await this.teamRepository.findMembership({
        teamId: workspace.teamId,
        userId: existingUser.id,
      });
      if (membership?.accepted) {
        throw new ErrorWithCode(ErrorCode.BadRequest, "This person is already a member of the team");
      }
    }

    const pendingInvites = await this.teamRepository.listInvitesByTeam(workspace.teamId);
    const now = new Date();
    if (pendingInvites.some((invite) => invite.identifier === normalizedEmail && invite.expires > now)) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "An invitation is already pending for this email");
    }

    const token = randomUUID();
    const expires = new Date(now.getTime() + INVITE_EXPIRY_MS);
    await this.teamRepository.createInviteToken({
      teamId: workspace.teamId,
      email: normalizedEmail,
      token,
      expires,
    });

    const joinLink = this.buildJoinLink(token, !!existingUser);
    const team = await this.teamRepository.findTeamById(workspace.teamId);
    const owner = await this.teamRepository.findOwner(workspace.teamId);

    let emailSent = false;
    try {
      await sendTeamInviteEmail({
        to: normalizedEmail,
        from: owner?.name || owner?.email || "A teammate",
        teamName: team?.name ?? "the team",
        joinLink,
        isRegistered: !!existingUser,
      });
      emailSent = true;
    } catch (error) {
      // Email delivery is best-effort: the invite itself is already persisted.
      log.error("Failed to send team invite email", { error, teamId: workspace.teamId });
    }

    return { joinLink, emailSent };
  }

  async cancelInvite(userId: number, inviteId: number) {
    const workspace = await this.requireOwner(userId);
    const invite = await this.teamRepository.findInviteById(inviteId);
    if (!invite || invite.teamId !== workspace.teamId) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Invitation not found");
    }

    await this.teamRepository.deleteInviteById(inviteId);
    return { ok: true as const };
  }

  async removeMember(userId: number, memberUserId: number) {
    const workspace = await this.requireOwner(userId);
    if (memberUserId === workspace.ownerUserId) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "The team owner cannot be removed");
    }

    const membership = await this.teamRepository.findMembership({
      teamId: workspace.teamId,
      userId: memberUserId,
    });
    if (!membership) {
      throw new ErrorWithCode(ErrorCode.NotFound, "This user is not a member of the team");
    }

    await this.teamRepository.deleteMembership({ teamId: workspace.teamId, userId: memberUserId });
    return { ok: true as const };
  }

  async leave(userId: number) {
    const workspace = await this.requireWorkspace(userId);
    if (workspace.ownerUserId === userId) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "The team owner cannot leave the team");
    }

    await this.teamRepository.deleteMembership({ teamId: workspace.teamId, userId });
    return { ok: true as const };
  }

  async accept(userId: number, email: string, token: string) {
    const invite = await this.teamRepository.findToken(token);
    if (!invite) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Invitation not found");
    }

    const teamId = invite.teamId;
    const team = invite.team;
    if (invite.expires.getTime() < Date.now()) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "This invitation has expired");
    }
    if (!team || team.isOrganization || team.parentId !== null || !teamId) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "This invitation is not valid for a team");
    }
    if (invite.identifier.toLowerCase() !== email.trim().toLowerCase()) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "This invitation was sent to a different email address");
    }

    const existing = await this.teamRepository.findWorkspaceForUser(userId);
    if (existing) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "You already belong to a team");
    }

    await this.teamRepository.addMember({
      teamId,
      userId,
      role: MembershipRole.MEMBER,
      accepted: true,
    });
    await this.teamRepository.deleteToken(token);

    return { teamId };
  }

  async inviteInfo(token: string) {
    const invite = await this.teamRepository.findToken(token);
    if (!invite) {
      return {
        teamName: null,
        email: null,
        expiresAt: null,
        isValid: false,
        isRegistered: false,
      };
    }

    const registeredUser = await this.teamRepository.findUserByEmail(invite.identifier);
    return {
      teamName: invite.team?.name ?? null,
      email: invite.identifier,
      expiresAt: invite.expires,
      isValid: invite.expires.getTime() > Date.now(),
      isRegistered: !!registeredUser,
    };
  }

  async getOwnerAvailability(userId: number) {
    const workspace = await this.teamRepository.findWorkspaceForUser(userId);
    const effectiveOwnerId = workspace?.ownerUserId ?? userId;

    const schedules = await this.teamRepository.findSchedulesForUser(effectiveOwnerId);
    const defaultScheduleId = await this.teamRepository.findDefaultScheduleIdForUser(effectiveOwnerId);

    return {
      schedules: schedules.map((schedule) => ({
        id: schedule.id,
        name: schedule.name,
        timeZone: schedule.timeZone ?? "UTC",
        isDefault: schedule.id === defaultScheduleId,
        availability: schedule.availability,
      })),
    };
  }
}
