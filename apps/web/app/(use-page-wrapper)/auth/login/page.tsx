import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/auth/login/getServerSideProps";

import type { PageProps as ClientPageProps } from "~/auth/login-view";
import Login from "~/auth/login-view";

export const generateMetadata = async () => {
  return {
    ...(await _generateMetadata(
      () => "Log in to DHDTech.io Calendar",
      () => "Log in to your DHDTech.io Calendar account to manage your availability, event types, and bookings.",
      true,
      undefined,
      "/auth/login"
    )),
    robots: { index: false, follow: true },
  };
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );
  return <Login {...props} />;
};

export default ServerPage;
