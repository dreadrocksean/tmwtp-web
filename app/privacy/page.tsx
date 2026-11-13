import type { Metadata } from 'next';

import {
  LegalPage,
  LegalSection as Section,
} from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — Tell Me What To Play',
  description:
    'What the Tell Me What To Play app collects, who processes it, what the device permissions are for, and how to get your data deleted.',
};

// The app had no public privacy policy, which App Store Connect requires a URL
// for. What it had instead was FOUR copies, none of them here: an in-app
// screen, an unused src/assets/privacy.html, and -- the one the signup
// checkbox actually linked to -- a generated boilerplate page on a
// third-party host (doc-hosting.flycricket.io) that described a different
// app: it named an individual rather than the LLC, called the service free
// when it takes payments, did not mention Stripe at all, contradicted itself
// on location, and carried someone else's ads and analytics.
//
// This is the canonical one. It is written from what the app actually does --
// the permissions it declares in app.json and the processors it really uses --
// and it lives beside /terms so the pair can only be updated together.
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy of Dreadrock Software LLC"
      subtitle="Applies to the Tell Me What To Play app."
      updated="2026-11-12"
      sibling={{ href: '/terms', label: 'Terms of Service' }}
    >
      <Section heading="The short version">
        <p>
          We collect what the app needs in order to work: who you are, what you
          asked us to play, and what you paid. We do not sell your personal
          data, and we do not share it with anyone except the services that
          process payments and run the app, or where the law requires it.
        </p>
      </Section>

      <Section heading="What we collect">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Account details</strong> — your name, email address and
            profile photo. If you sign in with Apple or Google, we receive these
            from them rather than asking you to type them again.
          </li>
          <li>
            <strong>What you do in the app</strong> — songs you request or vote
            for, tips and bids, comments, shout&#8209;outs you submit to a
            venue screen, and (for artists) your setlist, show schedule and
            profile.
          </li>
          <li>
            <strong>Payment records</strong> — the amount, the date and the
            result. Card numbers are entered into Stripe and never reach our
            servers.
          </li>
          <li>
            <strong>Content you upload</strong> — photos and video you add to a
            profile or a show.
          </li>
          <li>
            <strong>Device and usage data</strong> — device type, operating
            system version, app version, and crash and error reports.
          </li>
        </ul>
      </Section>

      <Section heading="Device permissions, and what each one is for">
        <p>
          The app asks for these only when a feature needs them, and you can
          refuse or revoke any of them in your device settings. Refusing one
          disables that feature and nothing else.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Location</strong> — to work out which region you are in, so
            the app can show the shows near you and tell you whether it is
            available where you are. We do not track you in the background and
            we do not keep a history of where you have been.
          </li>
          <li>
            <strong>Camera and photo library</strong> — so you can add a profile
            photo or upload a picture or video to a show.
          </li>
          <li>
            <strong>Microphone</strong> — for the in&#8209;app audio features
            that need to listen while you are using them.
          </li>
          <li>
            <strong>Notifications</strong> — so an artist knows when a request
            or an offer arrives. Optional.
          </li>
        </ul>
      </Section>

      <Section heading="Who processes it for us">
        <p>
          These are the companies that handle data on our behalf in order for
          the app to function. Each has its own privacy policy.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Stripe</strong> — payments, including Apple Pay and Cash App
            Pay, and artist payouts. Stripe receives payment details directly;
            we receive only the record of the transaction.
          </li>
          <li>
            <strong>Google Firebase</strong> (Google Cloud) — accounts,
            database, file storage and push notifications.
          </li>
          <li>
            <strong>Apple and Google</strong> — sign&#8209;in, if you choose to
            use it, and app distribution.
          </li>
          <li>
            <strong>Expo</strong> — app builds and over&#8209;the&#8209;air
            updates.
          </li>
        </ul>
      </Section>

      <Section heading="What is shown publicly">
        <p>
          Some of what you submit is meant to be seen. A shout&#8209;out you
          pay to put on a venue screen appears on that screen with the display
          name you gave it. A comment on an artist&rsquo;s profile is visible to
          anyone who views that profile. An artist&rsquo;s own profile, setlist
          and schedule are public by design.
        </p>
        <p>
          Your email address, your payment details and your legal name are never
          displayed to other users or shown on a venue screen.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          The app is for adults. You must be 18 or older to use it, because it
          is used in licensed venues and handles real money. We do not knowingly
          collect information from anyone under 18, and if we find that an
          account belongs to a minor we delete it.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          Account and content data is kept for as long as your account exists.
          Payment records are kept for as long as tax and accounting rules
          require, which is longer, and that obligation survives deleting your
          account.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          You can ask to see the personal information we hold about you, to have
          it corrected, or to have your account and its data deleted. Email{' '}
          <a className="underline" href="mailto:adrian@dreadrocksoftware.com">
            adrian@dreadrocksoftware.com
          </a>{' '}
          from the address on the account and we will action it. You do not need
          a reason, and asking costs you nothing.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          If this policy changes, the date at the top of this page changes with
          it. Material changes will also be announced in the app.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Dreadrock Software LLC, Kansas, United States.{' '}
          <a className="underline" href="mailto:adrian@dreadrocksoftware.com">
            adrian@dreadrocksoftware.com
          </a>
        </p>
      </Section>
    </LegalPage>
  );
}
