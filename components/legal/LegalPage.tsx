// The shared frame for the public legal pages (/terms, /privacy).
//
// It exists because these two pages have to stay visually and structurally
// identical: they are the pair a reviewer and a user read side by side, they
// link to each other, and the thing that goes wrong with legal copy is drift
// between separately-maintained copies. The heading, the dateline and the
// section shape therefore live in ONE place.
//
// `updated` is the date the CONTENT last changed, not the date of the last
// deploy. A dateline that tracks deploys is worse than none: it claims a
// review that did not happen.
//
// The frame also owns the BACKGROUND, and that is not cosmetic. The rest of
// this site paints its own dark background section by section; nothing sets
// one globally. /terms shipped without one and was therefore white text on
// white -- completely unreadable, and it stayed that way from publication
// until it was screenshotted. A legal page is the one page that is read by
// someone who was sent to it (an app store reviewer, a user who tapped the
// signup link), so it has to be self-contained rather than relying on a
// backdrop a parent might or might not provide.
import Link from "next/link";
import React from "react";

export const LegalSection = ({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) => (
  <section className="mb-8">
    <h2 className="mb-2 text-xl font-semibold text-white">{heading}</h2>
    <div className="space-y-3 text-base leading-relaxed text-white/75">
      {children}
    </div>
  </section>
);

export const LegalPage = ({
  title,
  subtitle,
  updated,
  sibling,
  children,
}: {
  title: string;
  subtitle: string;
  // ISO date (YYYY-MM-DD) the content last changed.
  updated: string;
  sibling: { href: string; label: string };
  children: React.ReactNode;
}) => {
  const updatedLabel = new Date(`${updated}T00:00:00Z`).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" },
  );
  return (
    <main className="min-h-screen bg-bg-dark px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-white">{title}</h1>
        <p className="text-sm text-white/50">{subtitle}</p>
        <p className="mb-10 text-sm text-white/50">
          Last updated{" "}
          <time dateTime={updated} className="text-white/70">
            {updatedLabel}
          </time>
          {" · "}
          <Link className="underline hover:text-white" href={sibling.href}>
            {sibling.label}
          </Link>
        </p>
        {children}
      </div>
    </main>
  );
};
