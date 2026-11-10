import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import AcceptInviteView from "~/team/views/accept-invite-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("accept_invite"),
    (t) => t("team_settings_description"),
    undefined,
    undefined,
    "/settings/team/accept"
  );

type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

const Page = async ({ searchParams }: PageProps) => {
  const session = await getServerSession({
    req: buildLegacyRequest(await headers(), await cookies()),
  });
  const { token: tokenParam } = await searchParams;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  if (!session?.user?.id) {
    const callbackUrl = `/settings/team/accept${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    return redirect(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return <AcceptInviteView token={token ?? ""} />;
};

export default Page;
