import type { Metadata } from 'next';

import { InviteOpener } from './InviteOpener';

// THE ACCEPT BUTTON IN AN ORGANIZATION INVITATION EMAIL LANDS HERE.
//
// It exists because the button did not work. The email linked straight to
// `ttwtp://invite/<CODE>`, which is the only URL that reaches an installed
// app -- and mail clients strip or refuse to linkify custom schemes, so the
// button was simply dead. Gmail is the common case.
//
// An https link is never stripped. So the email points here, and this page
// does the one thing a mail client will not: it tries the app scheme from a
// real browser, where it is allowed.
//
// It also has to work for somebody who does NOT have the app, which is a real
// case here -- an artist can be invited into an organization before they have
// ever installed anything. So the code is on the page in readable form and the
// store links are right there, rather than this being a redirect that dead
// ends.
//
// Related: app/go/route.ts is the same funnel for QR codes, but a bare
// redirect, because there is no app scheme to attempt first.

export const metadata: Metadata = {
  title: 'Your invitation — Tell Me What To Play',
  description:
    'Accept an invitation to join an organization on Tell Me What To Play.',
  // Mail clients and chat apps unfurl links. An invite code is not secret —
  // it is single-use and expires — but there is no reason to publish one into
  // a link preview or a search index.
  robots: { index: false, follow: false },
};

// Normalised the same way the app does it: uppercase, drop anything outside
// the alphabet. "abcd-2345", "ABCD 2345" and "abcd2345" are one code.
// Mirrors normalizeOrgCode in the app's src/config/organizations.ts.
const CODE_LEN = 8;

const normalize = (raw: string) =>
  (raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LEN);

const format = (code: string) =>
  code.length === CODE_LEN ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = normalize(decodeURIComponent(raw ?? ''));
  const complete = code.length === CODE_LEN;

  return (
    <InviteOpener
      code={code}
      display={format(code)}
      complete={complete}
    />
  );
}
