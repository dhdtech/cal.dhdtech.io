import type { Metadata } from "next";
import Link from "next/link";

const CANONICAL_URL = "https://cal.dhdtech.io/about";
const UPSTREAM_URL = "https://github.com/calcom/cal.diy";

const TITLE = "DHDTech.io Calendar — free, self-hosted scheduling";
const DESCRIPTION =
  "A free, self-hosted instance of Cal.diy — open-source scheduling software (MIT) — hosted by DHDTech.io. Share your availability and let people book a time with you.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL_URL,
    type: "website",
    siteName: "DHDTech.io Calendar",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DHDTech.io Calendar",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: CANONICAL_URL,
  description: DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  isBasedOn: UPSTREAM_URL,
  sameAs: UPSTREAM_URL,
  license: "https://github.com/calcom/cal.diy/blob/main/LICENSE",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-default text-emphasis">
      <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-widest text-brand">DHDTech.io</p>
        <h1 className="mt-4 font-cal text-4xl font-extrabold tracking-tight sm:text-5xl">
          A free, self-hosted calendar you can hand to anyone.
        </h1>
        <p className="mt-6 text-lg text-subtle">
          DHDTech.io Calendar is a hosted instance of Cal.diy, the open-source scheduling project. It is
          maintained and paid for by DHDTech.io, and it is free to use.
        </p>
        <p className="mt-4 text-lg text-subtle">
          Set the hours you are available, create event types, and share a single link. Anyone with the
          link sees your open slots in their own timezone and books one — no account, no back-and-forth.
        </p>

        <h2 className="mt-12 font-cal text-2xl font-bold">Who it is for</h2>
        <p className="mt-3 text-lg text-subtle">
          Anyone who takes meetings: freelancers, consultants, and small teams who would rather share a
          booking page than trade emails to agree on an hour.
        </p>

        <h2 className="mt-12 font-cal text-2xl font-bold">Credit</h2>
        <p className="mt-3 text-lg text-subtle">
          This instance runs{" "}
          <a className="text-brand underline" href={UPSTREAM_URL} rel="noopener noreferrer" target="_blank">
            Cal.diy
          </a>
          , a community project released under the MIT license. All credit for the software belongs to its
          authors and community.
        </p>

        <p className="mt-12">
          <Link
            href="/auth/login"
            className="inline-block border-2 border-brand bg-brand px-6 py-3 font-cal text-base font-bold text-white shadow-dropdown hover:bg-brand-emphasis">
            Log in
          </Link>
        </p>
      </div>

      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </main>
  );
}
