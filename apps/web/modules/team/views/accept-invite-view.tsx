"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

const AcceptInviteView = ({ token }: { token: string }) => {
  const { t } = useLocale();
  const router = useRouter();
  const { data, isLoading } = trpc.viewer.teams.inviteInfo.useQuery({ token }, { enabled: token.length > 0 });

  const acceptMutation = trpc.viewer.teams.accept.useMutation({
    onSuccess: () => {
      showToast(t("invite_accepted"), "success");
      router.push("/settings/team");
    },
    onError: (error) => showToast(t(error.message), "error"),
  });

  if (isLoading) {
    return (
      <SettingsHeader
        title={t("accept_invite")}
        description={t("team_settings_description")}
        borderInShellHeader>
        <div className="border-subtle border-x px-4 py-8 sm:px-6">
          <SkeletonContainer>
            <SkeletonText className="h-8 w-full" />
            <SkeletonText className="mt-4 h-8 w-3/4" />
          </SkeletonContainer>
        </div>
      </SettingsHeader>
    );
  }

  if (!data?.isValid) {
    return (
      <SettingsHeader
        title={t("accept_invite")}
        description={t("team_settings_description")}
        borderInShellHeader>
        <div className="border-subtle space-y-4 border-x px-4 py-8 sm:px-6">
          <Alert severity="error" title={t("invite_invalid")} />
          <Link href="/settings/team" className="text-emphasis text-sm font-medium underline">
            {t("back")}
          </Link>
        </div>
      </SettingsHeader>
    );
  }

  return (
    <SettingsHeader
      title={t("accept_invite")}
      description={t("team_settings_description")}
      borderInShellHeader>
      <div className="border-subtle space-y-4 border-x px-4 py-8 sm:px-6">
        <p className="text-default text-sm">
          {t("invite_to_team", { teamName: data.teamName ?? t("team") })}
        </p>
        {data.email && (
          <div className="text-sm">
            <span className="text-subtle">{t("email")}: </span>
            <span className="text-emphasis font-medium">{data.email}</span>
          </div>
        )}
        {!data.isRegistered && (
          <div className="border-subtle bg-subtle space-y-2 rounded-md border p-4">
            <p className="text-default text-sm">{t("create_account_to_join")}</p>
            <Link
              href={`/auth/signup?token=${encodeURIComponent(token)}`}
              className="text-emphasis text-sm font-medium underline">
              {t("create_account")}
            </Link>
          </div>
        )}
        <Button loading={acceptMutation.isPending} onClick={() => acceptMutation.mutate({ token })}>
          {t("join_team")}
        </Button>
      </div>
    </SettingsHeader>
  );
};

export default AcceptInviteView;
