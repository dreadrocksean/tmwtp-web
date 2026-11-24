"use client";

// WHO OWNS THE AUDIO CONTEXT.
//
// This used to live inside TvBoard, which was right while a board showed one
// artist for the whole night. It is wrong the moment a screen can be pointed
// at a different act without reloading: the board itself WANTS to remount on
// a swap, because every "is this news?" guard on it (the Top-5 seen set, the
// last tip, the last gong, the game winner, the phrase key) is a ref holding
// the previous artist's state, and a remount is the only way to reset all of
// them without hand-writing a re-prime that the next ref added to that file
// would silently miss.
//
// But a remount tore down the engine with it — the cleanup calls close(), and
// it must, because browsers cap how many audio contexts a page may hold and
// leaking one per swap is how the board went silent before. So the engine
// moves UP, above the remount boundary, and the board borrows it.
//
// Fullscreen needs no such help: it is requested on document.documentElement,
// which React never unmounts, so it survives a remount already. Only a real
// navigation drops it. That is what makes an in-place swap possible at all.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";

import { createSoundBoard, type SoundBoard } from "@/lib/soundFx";

interface SoundHostValue {
  // A REF, not the board itself.
  //
  // Deliberate: every call site in TvBoard reads `soundRef.current` from
  // inside a useCallback with no dependencies, and several of those callbacks
  // are themselves dependencies of effects that fire cues. Handing over the
  // instance instead would change those callbacks' identity the moment the
  // engine finished arming, re-running the gong, fanfare and reveal effects
  // for events that had already happened. A stable ref keeps all of that
  // exactly as it was.
  soundRef: MutableRefObject<SoundBoard | null>;
  soundReady: boolean;
  enableSound: () => void;
}

const SoundContext = createContext<SoundHostValue | null>(null);

export const useSound = (): SoundHostValue => {
  const value = useContext(SoundContext);
  if (!value) {
    throw new Error("useSound must be used inside a <SoundHost>");
  }
  return value;
};

export const SoundHost: React.FC<{ children: ReactNode }> = ({ children }) => {
  const soundRef = useRef<SoundBoard | null>(null);
  const [soundReady, setSoundReady] = useState(false);

  useEffect(() => {
    const sounds = createSoundBoard();
    soundRef.current = sounds;
    // Try without a gesture first. A kiosk-mode or autoplay-allowed browser
    // lets this through, and then the venue never sees a prompt at all.
    let mounted = true;
    sounds.unlock().then(
      (ok) => {
        if (mounted) setSoundReady(ok);
      },
      // unlock() is written never to reject, and this is here anyway: if it
      // ever does, an unhandled rejection leaves the board reporting
      // `locked` with no way back, which is a bad way to find out.
      () => {
        if (mounted) setSoundReady(false);
      }
    );

    // Hand the audio context back BEFORE the document goes away.
    //
    // React's cleanup does not reliably run on a reload, and a browser caps
    // how many audio contexts a page may hold. Leaking one per refresh is
    // how the board reached that cap and stopped making any sound at all —
    // and why refreshing never fixed it while closing the page did, since
    // only tearing the tab down reclaimed them.
    const release = () => sounds.close();
    window.addEventListener("pagehide", release);

    return () => {
      window.removeEventListener("pagehide", release);
      mounted = false;
      // Only surrender the ref if it still points at THIS board. React runs
      // this effect twice in development, and an older instance's cleanup
      // landing after the newer one has claimed the ref would blank it —
      // leaving a board that reports itself armed while every play() call
      // quietly no-ops through the optional chain.
      if (soundRef.current === sounds) soundRef.current = null;
      sounds.close();
    };
  }, []);

  const enableSound = useCallback(() => {
    const sounds = soundRef.current;
    if (!sounds) return;
    sounds.unlock().then(
      (ok) => {
        setSoundReady(ok);
        // Immediate proof it works, and it doubles as the level-setting tone.
        if (ok) sounds.play("test", { force: true });
      },
      () => setSoundReady(false)
    );
  }, []);

  const value = useMemo(
    () => ({ soundRef, soundReady, enableSound }),
    [soundReady, enableSound]
  );

  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
};

export default SoundHost;
