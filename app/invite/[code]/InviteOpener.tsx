'use client';

import { useEffect, useState } from 'react';

const APP_STORE = 'https://apps.apple.com/app/id1645821069';
const PLAY_STORE =
  'https://play.google.com/store/apps/details?id=com.dreadrocksoftware.tellmewhattoplay';

// Tries to hand the code to an installed app, then gets out of the way.
//
// THE ATTEMPT IS FIRE AND FORGET, and it has to be: there is no way to ask a
// browser whether a custom scheme resolved. If the app is installed the OS
// switches to it and this page is never seen again; if it is not, the
// navigation silently fails and the page below is what remains. So the page
// is written to be useful in BOTH cases rather than as a loading spinner that
// might never resolve.
//
// It fires once, from an effect rather than during render, because a
// navigation attempt is a side effect and React may render twice.
export const InviteOpener = ({
  code,
  display,
  complete,
}: {
  code: string;
  display: string;
  complete: boolean;
}) => {
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!complete || tried) return;
    setTried(true);
    try {
      window.location.href = `ttwtp://invite/${code}`;
    } catch {
      // Nothing to do. The page below is the answer.
    }
  }, [code, complete, tried]);

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        {complete ? (
          <>
            <h1 style={styles.h1}>Opening your invitation…</h1>
            <p style={styles.body}>
              If the app is installed it should be opening now. If nothing
              happened, use the button below.
            </p>

            <a href={`ttwtp://invite/${code}`} style={styles.primary}>
              Open in the app
            </a>

            <p style={styles.label}>Your invite code</p>
            <p style={styles.code}>{display}</p>
            <p style={styles.body}>
              Don&apos;t have the app yet? Install it, sign in, and the
              invitation will be waiting for you — or enter this code in the
              Organization section of your artist admin screen.
            </p>

            <div style={styles.stores}>
              <a href={APP_STORE} style={styles.secondary}>
                Download for iPhone
              </a>
              <a href={PLAY_STORE} style={styles.secondary}>
                Download for Android
              </a>
            </div>
          </>
        ) : (
          <>
            <h1 style={styles.h1}>That invite link is incomplete</h1>
            <p style={styles.body}>
              The code in this link is not a whole one, which usually means the
              link was cut short somewhere between the email and the browser.
              Open the email again and use the code printed in it, or ask the
              artist who invited you to send a new invitation.
            </p>
            <div style={styles.stores}>
              <a href={APP_STORE} style={styles.secondary}>
                Download for iPhone
              </a>
              <a href={PLAY_STORE} style={styles.secondary}>
                Download for Android
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

// Inline, and deliberately not reaching for the site's component kit: this
// page is opened from an email by somebody who may not have the app, on an
// unknown device, and it has exactly one job. Nothing here should be able to
// break because a shared component changed.
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: '#1c1030',
    fontFamily: 'Helvetica, Arial, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    background: '#ffffff',
    borderRadius: 14,
    padding: '32px 24px',
    textAlign: 'center',
    color: '#1c1030',
  },
  h1: { fontSize: 22, margin: '0 0 12px', lineHeight: 1.3 },
  body: { fontSize: 15, lineHeight: 1.55, color: '#444', margin: '0 0 18px' },
  label: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#412E7C',
    margin: '24px 0 6px',
    fontWeight: 700,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 28,
    letterSpacing: 4,
    color: '#412E7C',
    border: '2px dashed #412E7C',
    borderRadius: 8,
    padding: '12px 16px',
    margin: '0 0 18px',
    wordBreak: 'break-all',
  },
  primary: {
    display: 'inline-block',
    background: '#412E7C',
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 700,
    textDecoration: 'none',
    borderRadius: 8,
    padding: '14px 32px',
    margin: '0 0 8px',
  },
  stores: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
  },
  secondary: { color: '#412E7C', fontSize: 14, textDecoration: 'underline' },
};
