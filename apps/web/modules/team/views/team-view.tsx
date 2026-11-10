"use client";

import dayjs from "@calcom/dayjs";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { nameOfDay } from "@calcom/lib/weekday";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { TextField } from "@calcom/ui/components/form";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { useMemo, useState } from "react";

type ConfirmAction =
  | { type: "remove"; userId: number; email: string }
  | { type: "cancelInvite"; inviteId: number; email: string }
  | { type: "leave" };

// Availability rows store the wall-clock time as a UTC instant, so formatting
// in UTC preserves the configured hours for every schedule time zone.
const formatTime = (date: Date) => dayjs.utc(date).format("HH:mm");

const TeamView = () => {
  const { t, i18n } = useLocale();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.viewer.teams.get.useQuery();
  const ownerAvailability = trpc.viewer.teams.getOwnerAvailability.useQuery(undefined, {
    enabled: !!data?.team,
  });

  const [teamName, setTeamName] = useState<string | null>(null);
  const effectiveTeamName = teamName ?? t("default_team_name");
  const [inviteEmail, setInviteEmail] = useState("");
  const [joinLink, setJoinLink] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const createMutation = trpc.viewer.teams.create.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.get.invalidate();
      showToast(t("team_created"), "success");
    },
    onError: (error) => showToast(t(error.message), "error"),
  });

  const inviteMutation = trpc.viewer.teams.invite.useMutation({
    onSuccess: async (result) => {
      setJoinLink(result.joinLink);
      setInviteEmail("");
      await utils.viewer.teams.get.invalidate();
      showToast(t("invite_created"), "success");
    },
    onError: (error) => showToast(t(error.message), "error"),
  });

  const cancelInviteMutation = trpc.viewer.teams.cancelInvite.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.get.invalidate();
      showToast(t("invite_cancelled"), "success");
    },
    onError: (error) => showToast(t(error.message), "error"),
  });

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.get.invalidate();
      showToast(t("member_removed"), "success");
    },
    onError: (error) => showToast(t(error.message), "error"),
  });

  const leaveMutation = trpc.viewer.teams.leave.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.get.invalidate();
      showToast(t("left_team"), "success");
    },
    onError: (error) => showToast(t(error.message), "error"),
  });

  const availabilityRows = useMemo(() => {
    const schedules = ownerAvailability.data?.schedules ?? [];
    const schedule = schedules.find((item) => item.isDefault) ?? schedules[0];
    const slots = schedule?.availability ?? [];
    return Array.from({ length: 7 }, (_, day) => ({
      day,
      label: nameOfDay(i18n.language, day, "long"),
      ranges: slots.filter((slot) => slot.date === null && slot.days.includes(day)),
    }));
  }, [ownerAvailability.data, i18n.language]);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(t("link_copied"), "success");
    } catch {
      showToast(t("something_went_wrong"), "error");
    }
  };

  const confirmDialogCopy = () => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case "remove":
        return t("remove_member_confirmation", { email: confirmAction.email });
      case "cancelInvite":
        return t("cancel_invite_confirmation", { email: confirmAction.email });
      case "leave":
        return t("leave_team_confirmation");
    }
  };

  const confirmDialogTitle = () => {
    if (!confirmAction) return "";
    switch (confirmAction.type) {
      case "remove":
        return t("remove_member");
      case "cancelInvite":
        return t("cancel_invite");
      case "leave":
        return t("leave_team");
    }
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case "remove":
        removeMemberMutation.mutate({ userId: confirmAction.userId });
        break;
      case "cancelInvite":
        cancelInviteMutation.mutate({ inviteId: confirmAction.inviteId });
        break;
      case "leave":
        leaveMutation.mutate();
        break;
    }
    setConfirmAction(null);
  };

  if (isLoading) {
    return (
      <SettingsHeader title={t("team")} description={t("team_settings_description")} borderInShellHeader>
        <div className="border-subtle border-x px-4 py-8 sm:px-6">
          <SkeletonContainer>
            <SkeletonText className="h-8 w-full" />
            <SkeletonText className="mt-4 h-8 w-full" />
          </SkeletonContainer>
        </div>
      </SettingsHeader>
    );
  }

  const team = data?.team;
  const isOwner = data?.isOwner ?? false;

  if (!team) {
    return (
      <SettingsHeader title={t("team")} description={t("team_settings_description")} borderInShellHeader>
        <div className="border-subtle border-x px-4 py-8 sm:px-6">
          <p className="text-subtle mb-6 text-sm">{t("no_team_description")}</p>
          <form
            className="max-w-md space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate({ name: effectiveTeamName.trim() });
            }}>
            <TextField
              name="team-name"
              label={t("team_name")}
              value={effectiveTeamName}
              onChange={(event) => setTeamName(event.target.value)}
              required
            />
            <Button type="submit" loading={createMutation.isPending} disabled={!effectiveTeamName.trim()}>
              {t("create_team")}
            </Button>
          </form>
        </div>
      </SettingsHeader>
    );
  }

  const members = team.members.filter(
    (member) => member.email.toLowerCase() !== team.owner.email.toLowerCase()
  );
  const pendingInvites = team.pendingInvites ?? [];

  return (
    <SettingsHeader title={t("team")} description={t("team_settings_description")} borderInShellHeader>
      <div className="border-subtle space-y-6 border-x p-4 sm:p-6">
        <section className="border-subtle rounded-lg border p-4">
          <h2 className="text-emphasis mb-4 text-base font-semibold">{team.name}</h2>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar size="md" imageSrc={team.owner.avatarUrl} alt={team.owner.name || team.owner.email} />
              <div>
                <p className="text-emphasis text-sm font-medium">{team.owner.name || team.owner.email}</p>
                <p className="text-subtle text-xs">{team.owner.email}</p>
              </div>
            </div>
            <Badge variant="blue">{t("owner")}</Badge>
          </div>
        </section>

        <section className="border-subtle rounded-lg border p-4">
          <h2 className="text-emphasis mb-4 text-base font-semibold">{t("team_members")}</h2>
          {members.length === 0 ? (
            <p className="text-subtle text-sm">{t("no_members_yet")}</p>
          ) : (
            <ul className="divide-subtle divide-y">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar size="md" imageSrc={member.avatarUrl} alt={member.name || member.email} />
                    <div>
                      <p className="text-emphasis text-sm font-medium">{member.name || member.email}</p>
                      <p className="text-subtle text-xs">{member.email}</p>
                    </div>
                  </div>
                  {isOwner && (
                    <Button
                      color="destructive"
                      variant="button"
                      onClick={() =>
                        setConfirmAction({
                          type: "remove",
                          userId: member.id,
                          email: member.email,
                        })
                      }>
                      {t("remove_member")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {isOwner && (
          <section className="border-subtle rounded-lg border p-4">
            <h2 className="text-emphasis mb-4 text-base font-semibold">{t("pending_invites")}</h2>
            {pendingInvites.length === 0 ? (
              <p className="text-subtle text-sm">{t("pending_invites_empty")}</p>
            ) : (
              <ul className="divide-subtle divide-y">
                {pendingInvites.map((invite) => (
                  <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <p className="text-emphasis text-sm">{invite.email}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        color="secondary"
                        variant="button"
                        onClick={() => copyToClipboard(invite.joinLink)}>
                        {t("copy_invite_link")}
                      </Button>
                      <Button
                        color="destructive"
                        variant="button"
                        onClick={() =>
                          setConfirmAction({
                            type: "cancelInvite",
                            inviteId: invite.id,
                            email: invite.email,
                          })
                        }>
                        {t("cancel_invite")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {isOwner && (
          <section className="border-subtle rounded-lg border p-4">
            <h2 className="text-emphasis mb-4 text-base font-semibold">{t("invite")}</h2>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                inviteMutation.mutate({ email: inviteEmail.trim() });
              }}>
              <TextField
                name="invite-email"
                type="email"
                label={t("email")}
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
              />
              <Button type="submit" loading={inviteMutation.isPending} disabled={!inviteEmail.trim()}>
                {t("invite")}
              </Button>
            </form>
            {joinLink && (
              <div className="border-subtle bg-subtle mt-4 rounded-md border p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <TextField
                    name="join-link"
                    label={t("join_link")}
                    value={joinLink}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                    containerClassName="min-w-0 flex-1"
                  />
                  <Button color="secondary" variant="button" onClick={() => copyToClipboard(joinLink)}>
                    {t("copy_invite_link")}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="border-subtle rounded-lg border p-4">
          <h2 className="text-emphasis mb-4 text-base font-semibold">{t("team_availability")}</h2>
          <dl className="space-y-2">
            {availabilityRows.map((row) => (
              <div key={row.day} className="flex items-center justify-between gap-4 text-sm">
                <dt className="text-default">{row.label}</dt>
                <dd className="text-subtle text-right">
                  {row.ranges.length === 0
                    ? t("no_availability_set")
                    : row.ranges
                        .map((range) => `${formatTime(range.startTime)} - ${formatTime(range.endTime)}`)
                        .join(", ")}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {!isOwner && (
          <div className="flex justify-end">
            <Button color="destructive" variant="button" onClick={() => setConfirmAction({ type: "leave" })}>
              {t("leave_team")}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        {confirmAction && (
          <ConfirmationDialogContent
            variety="danger"
            title={confirmDialogTitle()}
            isPending={
              removeMemberMutation.isPending || cancelInviteMutation.isPending || leaveMutation.isPending
            }
            onConfirm={handleConfirm}>
            {confirmDialogCopy()}
          </ConfirmationDialogContent>
        )}
      </Dialog>
    </SettingsHeader>
  );
};

export default TeamView;
