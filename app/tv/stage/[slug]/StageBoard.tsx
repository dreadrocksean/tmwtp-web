"use client";

// THE WALL THAT FOLLOWS THE BILL.
//
// One URL on the TV for the whole night. The host picks who is on it from
// their phone, and this swaps the board underneath without navigating —
// which is the entire point, because a navigation would drop both fullscreen
// and the audio handshake and put somebody back on a remote at every
// changeover.
//
// Two things make the swap survivable, and neither is an accident:
//
//   FULLSCREEN is requested on document.documentElement, which React never
//   unmounts. Re-rendering or remounting the board cannot drop it.
//
//   THE AUDIO CONTEXT lives in SoundHost, above this component, so the board
//   below can be remounted freely while the engine stays armed.
//
// And the board below IS remounted, with `key={code}`. That is deliberate:
// every "is this news?" guard in TvBoard is a ref holding the previous
// artist's state (the Top-5 seen set, the last tip, the last gong, the game
// winner, the phrase key). Swapping the data under those refs would fire a
// burst of celebrations for events that happened in a different room — five
// Top-5 entrants at once, confetti for an hour-old tip, a gong strike for
// somebody else's accepted gong. A remount resets all of them at once, and
// it keeps that correctness from depending on anyone remembering to re-prime
// the next ref somebody adds to that file.

import React, { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/gcp/client";
import { Board, formatBoardCode, normalizeBoardCode, toBoard } from "@/lib/board";
import { STAGE_COLLECTION, toStagePointer } from "@/lib/stage";
import type { StageTarget } from "@/lib/gcp/stage";
import TvBoard from "../../[code]/TvBoard";
import { useSound } from "../../[code]/SoundHost";

interface StageBoardProps {
  slug: string;
  // Resolved on the server so the first frame is already the right act.
  initialTarget: StageTarget | null;
  initialBoard: Board | null;
  qrSvg: string;
}

export const StageBoard: React.FC<StageBoardProps> = ({
  slug,
  initialTarget,
  initialBoard,
  qrSvg,
}) => {
  const [artistId, setArtistId] = useState<string | null>(
    initialTarget?.artistId ?? null
  );
  const [code, setCode] = useState<string | null>(initialTarget?.code ?? null);
  const [board, setBoard] = useState<Board | null>(initialBoard);

  // Borrowed for the holding screen's own setup buttons — see the note where
  // it renders. The board below gets the same engine from the same host.
  const { soundReady, enableSound } = useSound();

  // Full screen, duplicated from the board for the holding screen only.
  // documentElement, exactly as the board requests it, which is what lets the
  // grant survive every later swap.
  const [fsAvailable, setFsAvailable] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const d = document as Document & { webkitFullscreenElement?: Element };
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    setFsAvailable(!!(el.requestFullscreen || el.webkitRequestFullscreen));
    const sync = () =>
      setIsFullscreen(!!(d.fullscreenElement || d.webkitFullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else el.webkitRequestFullscreen?.();
  }, []);

  // WHO THE HOST HAS CHOSEN. One document, watched for the night.
  useEffect(() => {
    const ref = doc(db, STAGE_COLLECTION, slug);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const pointer = snap.exists() ? toStagePointer(snap.data()) : null;
        setArtistId(pointer?.artistId ?? null);
      },
      () => {
        // Terminal, like every other listener here: leave the wall showing
        // whatever it last had rather than blanking a screen in a venue.
      }
    );
    return unsub;
  }, [slug]);

  // THEIR CODE, RESOLVED LIVE rather than stored alongside the pointer.
  // getTvBoardCode can rotate a code, and a rotation mid-night would
  // otherwise leave the wall pointing at a code that no longer exists.
  useEffect(() => {
    if (!artistId) {
      setCode(null);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "artists", artistId),
      (snap) => {
        const next = normalizeBoardCode(
          snap.exists() ? (snap.data()?.tvBoardCode as string | undefined) : ""
        );
        setCode(next || null);
      },
      () => {}
    );
    return unsub;
  }, [artistId]);

  // The new act's standings, WATCHED rather than read once.
  //
  // This was a single getDoc, on the reasoning that TvBoard subscribes to the
  // same document itself and owns it from there. That reasoning has a dead
  // end in it: when the document does not exist YET, this set board to null,
  // the holding screen rendered instead of TvBoard, TvBoard's own listener
  // therefore never ran, and nothing was left to notice the document
  // appearing. The wall sat on the holding screen until the host changed the
  // pointer again.
  //
  // Which is not a corner case, because the app now mints a TV code the first
  // time an act is put on the wall. publicBoards/{code} is built by a
  // separate Cloud Function AFTER that, so for a few seconds the pointer
  // names a real act with a real code and no board document — exactly the
  // state this used to get stuck in. Adrian, 2026-11-24: "it took 26secs to
  // change", at random. Random because it only happened to acts being put up
  // for the first time.
  //
  // A listener costs one extra subscription on one document while the board
  // below holds its own, and it removes the whole class of problem.
  useEffect(() => {
    if (!code) {
      setBoard(null);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "publicBoards", code),
      (snap) => {
        if (snap.exists()) setBoard(toBoard(snap.data() || {}));
        // A missing document is NOT cleared back to null once we have one:
        // an act that rotates its code mid-set would otherwise blank the
        // wall. The holding screen is for before the first board arrives.
      },
      () => {
        // Terminal, like every other listener here: leave the wall showing
        // whatever it last had rather than blanking a screen in a venue.
      }
    );
    return unsub;
  }, [code]);

  // NO ACT SELECTED is a normal state, not a fault — it is where this screen
  // sits before the first act of the night. Deliberately quiet: a venue
  // leaves this up for an hour before doors, so it must not look broken and
  // must not burn a bright panel into a plasma.
  //
  // DARK, LIKE THE BOARD IT IS ABOUT TO BECOME — `bg-bg-dark`, and never a
  // colour that is not in tailwind.config. This shipped as `bg-bg`, which is
  // not a colour in that config, so the class did nothing: the screen fell
  // through to white and the white heading below went invisible on it. What
  // Adrian saw was a blank page with one grey line in the middle of it.
  //
  // IT CARRIES THE TWO SETUP BUTTONS, which is not decoration. This screen
  // renders INSTEAD of the board, so without them the one state a venue is
  // in while setting up — TVs on, nobody picked yet — is the one state where
  // full screen and sound cannot be armed. That turns "arm the screens
  // whenever" into "arm them only after picking an act", which is exactly the
  // kind of ordering rule that gets discovered at 7:45pm.
  if (!code || !board) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg-dark px-[max(16px,env(safe-area-inset-left,0px))] text-center text-cyan">
        <p className="text-[clamp(1.25rem,3.4vw,4rem)] font-bold leading-tight text-white">
          Up next
        </p>
        <p className="mt-[1.2vw] text-[clamp(0.85rem,1.6vw,2rem)] leading-tight">
          Waiting for the next act.
        </p>

        {!soundReady && (
          <button
            type="button"
            onClick={enableSound}
            className="mt-[3vw] rounded-full border border-rose/50 bg-rose/20 px-[1.4vw] py-[0.6vw] text-[clamp(0.6rem,1vw,1.2rem)] font-bold uppercase tracking-[0.2em] leading-none text-rose focus:outline-none focus-visible:ring-[0.25vw] focus-visible:ring-lime"
          >
            🔇 Press to enable sound
          </button>
        )}

        {fsAvailable && !isFullscreen && (
          <button
            type="button"
            onClick={enterFullscreen}
            className="fixed bottom-[1vw] left-[1.2vw] z-30 rounded-full border border-cyan/40 bg-bg-overly/80 px-[1vw] py-[0.4vw] text-[clamp(0.5rem,0.8vw,1rem)] font-bold uppercase tracking-[0.2em] leading-none text-cyan hover:text-white focus:outline-none focus-visible:ring-[0.25vw] focus-visible:ring-lime"
          >
            ⛶ Full screen
          </button>
        )}
      </main>
    );
  }

  return (
    <TvBoard
      key={code}
      code={code}
      displayCode={formatBoardCode(code)}
      initial={board}
      qrSvg={qrSvg}
    />
  );
};

export default StageBoard;
