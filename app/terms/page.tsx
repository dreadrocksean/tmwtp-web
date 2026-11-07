import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Tell Me What To Play',
  description:
    'The terms governing use of the Tell Me What To Play app, including age requirement, user-generated content and moderation.',
};

// Ported from the long-standing terms document, with one deliberate change:
// the Age Requirement now states 18+, to match the gate the app shows on first
// launch. The App Store rating has to align with the minimum stated here, and
// an app that asks a fan to confirm they are 18 cannot link to terms that say
// anything else.
const Section = ({
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

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold text-white">
        Terms of Service of Dreadrock Software LLC
      </h1>
      <p className="mb-10 text-sm text-white/50">
        Applies to the Tell Me What To Play app.
      </p>

      <Section heading="Age Requirement">
        <p>
          You must be 18 years of age or older to use the Tell Me What To Play
          app (the &ldquo;Service&rdquo;). The Service is used in licensed
          venues and allows adults to tip and to bid real money, and it is not
          directed to children. By using the Service you confirm that you are 18
          or older.
        </p>
      </Section>

      <Section heading="User Accounts">
        <p>
          You are responsible for maintaining the confidentiality of your
          account and for all activities that occur under your account.
        </p>
        <p>
          We reserve the right to suspend or terminate accounts that violate
          these Terms.
        </p>
      </Section>

      <Section heading="User-Generated Content">
        <p>
          The Service allows users to upload photos, videos, comments, and other
          content (&ldquo;User Content&rdquo;). You are solely responsible for
          the content you upload.
        </p>
        <p>
          By submitting User Content, you grant Dreadrock Software LLC a
          non-exclusive, worldwide, royalty-free license to use, display,
          reproduce, and distribute such content within the Service.
        </p>
      </Section>

      <Section heading="Prohibited Content">
        <p>Users may not upload, post, or share content that:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Is sexually explicit or pornographic</li>
          <li>Contains nudity intended to arouse or exploit</li>
          <li>Depicts violence, abuse, or harassment</li>
          <li>Promotes hate speech or discrimination</li>
          <li>Encourages illegal activity</li>
          <li>Violates intellectual property rights</li>
          <li>Impersonates another person</li>
          <li>Contains spam or malicious content</li>
        </ul>
        <p>
          We reserve the right to remove any content that violates these Terms
          at our sole discretion.
        </p>
      </Section>

      <Section heading="Content Reporting and Moderation">
        <p>
          Text submitted by users for display on a venue screen is screened
          automatically against a list of prohibited words. Anything that trips
          that screening is not shown, and where a payment was authorised for
          it, the payment is cancelled and not taken.
        </p>
        <p>
          The performing artist controls what appears during their own show.
          They can take a submitted phrase down from their screen at any time,
          switch audience sound effects off entirely, add further prohibited
          words for their own shows, and block a user from commenting on their
          profile.
        </p>
        <p>
          To report content you believe violates these Terms, contact us at{' '}
          <a className="underline" href="mailto:adrian@dreadrocksoftware.com">
            adrian@dreadrocksoftware.com
          </a>
          . We review reports promptly and remove content that violates these
          Terms.
        </p>
        <p>
          Repeat violators may have their accounts suspended or permanently
          terminated.
        </p>
      </Section>

      <Section heading="Intellectual Property">
        <p>
          All content and materials within the Service, excluding User Content,
          are the property of Dreadrock Software LLC and are protected by
          intellectual property laws.
        </p>
      </Section>

      <Section heading="Privacy">
        <p>
          We may collect personally identifiable information including name,
          email address, and usage data to provide and improve the Service.
        </p>
        <p>
          We do not knowingly collect information from minors. If we discover
          that a minor has created an account, we will delete the account
          immediately.
        </p>
      </Section>

      <Section heading="Limitation of Liability">
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any
          kind. Dreadrock Software LLC shall not be liable for any indirect,
          incidental, or consequential damages arising from use of the Service.
        </p>
      </Section>

      <Section heading="Changes to These Terms">
        <p>
          We may update these Terms from time to time. Continued use of the
          Service after changes are posted constitutes acceptance of the new
          Terms.
        </p>
      </Section>

      <Section heading="Governing Law">
        <p>
          These Terms shall be governed by the laws of the United States and the
          State of Kansas, without regard to conflict of law principles.
        </p>
      </Section>

      <Section heading="Contact Us">
        <p>
          If you have questions about these Terms, please contact us at{' '}
          <a
            className="underline"
            href="mailto:adrian@dreadrocksoftware.com"
          >
            adrian@dreadrocksoftware.com
          </a>
          .
        </p>
      </Section>
    </main>
  );
}
