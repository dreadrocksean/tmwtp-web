"use client";

// THE HOST'S BUTTON.
//
// Picks which act the venue's screens are showing. Lives on the web rather
// than in the app on purpose: the host needs it while somebody else is on
// stage with their phone, from a bar stool, without an app build.
//
// The criterion is a person, not a signal — see the note in lib/stage.ts for
// why neither "who is live" nor "who is playing" can answer this. The pick is
// meant to be made a song EARLY: the changeover is the minute the next act's
// standings are empty and the room is being asked to fill them, so the wall
// wants their name on it before they sit down.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/gcp/client";
import { formatBoardCode, normalizeBoardCode } from "@/lib/board";
import { STAGE_COLLECTION, toStagePointer } from "@/lib/stage";

type Act = {
  id: string;
  name: string;
  live: boolean;
  code: string;
  testAccount: boolean;
};

const TV_HOST = "tv.tellmewhat2play.com";

export const StageControl: React.FC<{ slug: string }> = ({ slug }) => {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [isGod, setIsGod] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [acts, setActs] = useState<Act[]>([]);
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (next) => {
      setUser(next);
      setIsGod(false);
      if (next) {
        // Both branches rules use, so this page agrees with what the write
        // will actually be allowed to do: the `god` custom claim, or a user
        // doc with the GOD role. Checking only one of them would show a
        // picker whose button then fails, or hide one that would have worked.
        try {
          const token = await next.getIdTokenResult();
          if (token.claims?.god === true) setIsGod(true);
          else {
            const snap = await getDoc(doc(db, "users", next.uid));
            setIsGod(snap.exists() && snap.data()?.roleId === 1);
          }
        } catch {
          setIsGod(false);
        }
      }
      setChecking(false);
    });
    return unsub;
  }, []);

  // What the wall is showing right now, so the pick is a change to something
  // visible rather than a write into the dark.
  useEffect(() => {
    if (!isGod) return;
    const unsub = onSnapshot(
      doc(db, STAGE_COLLECTION, slug),
      (snap) => {
        const pointer = snap.exists() ? toStagePointer(snap.data()) : null;
        setCurrent(pointer?.artistId ?? null);
      },
      () => {}
    );
    return unsub;
  }, [isGod, slug]);

  useEffect(() => {
    if (!isGod) return;
    let live = true;
    getDocs(collection(db, "artists")).then(
      (snap) => {
        if (!live) return;
        const rows: Act[] = [];
        snap.forEach((d) => {
          const a = d.data() || {};
          const code = normalizeBoardCode(a.tvBoardCode as string | undefined);
          // An act with no code has no board to point at, so it is not a
          // choice — listing it would offer a button that cannot work.
          if (!code) return;
          rows.push({
            id: d.id,
            name: String(a.name || "(unnamed)"),
            live: a.live === true,
            code,
            testAccount: a.testAccount === true,
          });
        });
        // Live first, then by name — the same order the app's own artist list
        // uses, which puts tonight's bill at the top without being asked.
        rows.sort(
          (x, y) =>
            Number(y.live) - Number(x.live) || x.name.localeCompare(y.name)
        );
        setActs(rows);
      },
      () => setError("Could not load the artist list.")
    );
    return () => {
      live = false;
    };
  }, [isGod]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? acts.filter((a) => a.name.toLowerCase().includes(q))
      : acts;
    // Unsearched, the list is capped: this is a phone held in the dark at a
    // gig, and the whole directory is dozens of rows of scrolling past the
    // three that matter.
    return q ? matched.slice(0, 40) : matched.slice(0, 12);
  }, [acts, query]);

  const signIn = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError("");
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch {
        setError("Invalid credentials or network issue.");
      } finally {
        setBusy(false);
      }
    },
    [email, password]
  );

  const put = useCallback(
    async (act: Act) => {
      setBusy(true);
      setError("");
      try {
        await setDoc(doc(db, STAGE_COLLECTION, slug), {
          artistId: act.id,
          setBy: user?.uid ?? null,
          at: Date.now(),
        });
      } catch {
        // The rules are the real gate; this page's God check is only so the
        // picker is not offered to somebody it would refuse.
        setError("That write was refused. Are you signed in as God?");
      } finally {
        setBusy(false);
      }
    },
    [slug, user?.uid]
  );

  if (checking) {
    return <p className="p-6 text-cyan">Checking…</p>;
  }

  if (!user) {
    return (
      <form onSubmit={signIn} className="mx-auto max-w-sm p-6">
        <h1 className="text-xl font-bold text-white">Stage control</h1>
        <p className="mt-1 text-sm text-cyan">Sign in to choose the act on the wall.</p>
        <input
          type="email"
          autoComplete="username"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-4 w-full rounded border border-cyan/40 bg-transparent px-3 py-2 text-white"
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded border border-cyan/40 bg-transparent px-3 py-2 text-white"
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-full bg-lime px-4 py-2 font-bold text-bg disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {!!error && <p className="mt-3 text-sm text-rose">{error}</p>}
      </form>
    );
  }

  if (!isGod) {
    return (
      <div className="mx-auto max-w-sm p-6">
        <p className="text-white">This account cannot change the wall.</p>
        <button
          onClick={() => signOut(auth)}
          className="mt-4 text-sm text-cyan underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  const live = acts.find((a) => a.id === current);

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-xl font-bold text-white">Stage control</h1>
      <p className="mt-1 text-sm text-cyan">
        {TV_HOST}/stage/{slug}
      </p>

      <div className="mt-4 rounded-lg border border-cyan/30 p-3">
        <p className="text-xs uppercase tracking-widest text-cyan/70">On the wall</p>
        <p className="text-lg font-bold text-white">
          {live ? live.name : current ? current : "Nobody yet"}
        </p>
        {!!live && (
          <p className="text-sm text-cyan">{formatBoardCode(live.code)}</p>
        )}
      </div>

      <input
        type="search"
        placeholder="Search acts"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-4 w-full rounded border border-cyan/40 bg-transparent px-3 py-2 text-white"
      />

      <ul className="mt-3 space-y-2">
        {shown.map((act) => (
          <li key={act.id}>
            <button
              onClick={() => put(act)}
              disabled={busy || act.id === current}
              className="flex w-full items-center justify-between rounded-lg border border-cyan/30 px-3 py-3 text-left disabled:opacity-40"
            >
              <span>
                <span className="font-bold text-white">{act.name}</span>
                {act.testAccount && (
                  <span className="ml-2 text-xs uppercase text-cyan/60">test</span>
                )}
                <span className="block text-xs text-cyan">
                  {formatBoardCode(act.code)}
                </span>
              </span>
              {act.live ? (
                <span className="shrink-0 rounded-full bg-lime/20 px-2 py-1 text-xs font-bold uppercase text-lime">
                  live
                </span>
              ) : (
                <span className="shrink-0 text-xs uppercase text-cyan/50">off air</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {!query && acts.length > shown.length && (
        <p className="mt-3 text-xs text-cyan/60">
          Showing {shown.length} of {acts.length}. Search for the rest.
        </p>
      )}

      {!!error && <p className="mt-3 text-sm text-rose">{error}</p>}

      <button
        onClick={() => signOut(auth)}
        className="mt-6 text-sm text-cyan underline"
      >
        Sign out
      </button>
    </div>
  );
};

export default StageControl;
