// lib/gcp/stage.ts
// Server-side read of the stage pointer, for the first paint of /tv/stage.
//
// Do NOT import this from a client component (it pulls in the Admin SDK). The
// client watches the same documents directly — both are publicly readable —
// so the only thing this buys is a board that is already correct on the first
// frame instead of one second later.

import { adminDb } from "./admin";
import { normalizeBoardCode } from "../board";
import { STAGE_COLLECTION, normalizeStageSlug, toStagePointer } from "../stage";

export type StageTarget = {
  artistId: string;
  code: string;
};

// The artist a slug currently points at, and the board code to render for
// them. Null when nothing has been chosen yet, when the chosen artist has
// vanished, or when they have never had a code minted — all three of which
// are "no act selected" on screen rather than an error, because a blank
// pointer before the first act of the night is the normal state.
export const getStageTarget = async (
  slug: string
): Promise<StageTarget | null> => {
  const normalized = normalizeStageSlug(slug);
  if (!normalized) return null;

  const snap = await adminDb
    .collection(STAGE_COLLECTION)
    .doc(normalized)
    .get();
  if (!snap.exists) return null;

  const pointer = toStagePointer(snap.data() || {});
  if (!pointer) return null;

  const artistSnap = await adminDb
    .collection("artists")
    .doc(pointer.artistId)
    .get();
  if (!artistSnap.exists) return null;

  const code = normalizeBoardCode(
    (artistSnap.data() || {}).tvBoardCode as string | undefined
  );
  if (!code) return null;

  return { artistId: pointer.artistId, code };
};
