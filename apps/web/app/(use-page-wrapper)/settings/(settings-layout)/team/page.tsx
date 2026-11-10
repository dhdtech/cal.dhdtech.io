import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import TeamView from "~/team/views/team-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("team"),
    (t) => t("team_settings_description"),
    undefined,
    undefined,
    "/settings/team"
  );

const Page = async () => {
  const session = await getServerSession({
    req: buildLegacyRequest(await headers(), await cookies()),
  });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  return <TeamView />;
};

export default Page;
