// WHICH ACT IS ON THE WALL.
//
// A per-artist board (/tv/{code}) answers this by itself: one code, one
// artist, and it follows whatever show that artist is live with. That is the
// right answer for almost every gig and it is not changing.
//
// A night with a rotating bill has no such answer. Every act is told to go
// live before doors, nobody ever ends a show (0 of 26 since August 2026), and
// "whoever went live last" is therefore noise. `currentSongId` is tempting —
// it is set when an artist opens a song and cleared when they leave, so it
// reads who is genuinely playing — and it is wrong for two reasons. The host
// needs their own app offstage, and opening lyrics there would steal the wall
// mid-set. More importantly the board has to switch BEFORE the next act
// plays: the changeover is the minute their standings are empty and the room
// is being asked to fill them, and a board that waits for the first song
// hands them a cold list nobody voted on.
//
// So the criterion is a person: the host picks, a song early, and the wall
// shows that act until they say otherwise. One document, one write.

// The artist is the identity, not the code.
//
// A board code can be rotated (getTvBoardCode(artistId, { rotate })), so a
// stored code can go stale while still looking valid. artists/{id} is
// publicly readable, so the wall resolves `tvBoardCode` itself on every
// change and a rotation mid-night fixes itself.
export type StagePointer = {
  artistId: string;
  // Who moved it and when. Not used to decide anything — it is here so that a
  // wall showing the wrong act is a question with an answer, and so a pointer
  // left on somebody at 1am is visibly stale next week rather than a mystery.
  setBy?: string | null;
  at?: number | null;
};

export const STAGE_COLLECTION = "stageBoards";

// Slugs name a physical room, not a code, so they are typed by a human on a
// remote and read from across a bar. Kept to the characters that survive both.
export const normalizeStageSlug = (raw: unknown): string =>
  String(raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 32);

// Deliberately tolerant, exactly like toBoard: this document is written by a
// control page and read by a screen that must not go blank because a field
// arrived in the wrong shape.
export const toStagePointer = (data: unknown): StagePointer | null => {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const artistId =
    typeof raw.artistId === "string" && raw.artistId.trim()
      ? raw.artistId.trim()
      : null;
  if (!artistId) return null;
  return {
    artistId,
    setBy: typeof raw.setBy === "string" ? raw.setBy : null,
    at: typeof raw.at === "number" ? raw.at : null,
  };
};
