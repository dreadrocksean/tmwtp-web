// app/tv/[code]/page.tsx
// The venue TV board, opened on a screen in the room at /tv/ABC-123.
//
// Server-rendered so the board is already painted when the screen wakes up
// (no spinner on a wall display), then TvBoard subscribes for live updates.
import { Metadata } from "next";
import { redirect } from "next/navigation";
import QRCode from "qrcode-svg";

import {
  decodeCodeParam,
  formatBoardCode,
  normalizeBoardCode,
} from "@/lib/board";
import { getBoardByCode } from "@/lib/gcp/board";
import BoardNotFound from "./BoardNotFound";
import SoundHost from "./SoundHost";
import TvBoard from "./TvBoard";

export const dynamic = "force-dynamic";

const SITE = "https://www.tellmewhat2play.com";

interface TvPageProps {
  params: { code: string };
  // Carried through the canonical redirect below. Without this the redirect
  // rebuilds the URL from the path alone and every flag on it disappears.
  searchParams?: Record<string, string | string[] | undefined>;
}

export const generateMetadata = async ({
  params,
}: TvPageProps): Promise<Metadata> => {
  const board = await getBoardByCode(decodeCodeParam(params.code));
  return {
    title: board ? `${board.artistName} — Live Requests` : "Live Requests",
    // A venue's board URL has no business in search results.
    robots: { index: false, follow: false },
  };
};

const TvBoardPage = async ({ params, searchParams }: TvPageProps) => {
  const code = normalizeBoardCode(decodeCodeParam(params.code));
  // Nothing usable in the URL at all — show the help screen rather than
  // redirecting to an equally empty one.
  if (!code) return <BoardNotFound entered="" />;

  // Settle on one spelling (ABC-123) so a venue that bookmarks the page, or
  // casts it from history, always lands on the same URL.
  const displayCode = formatBoardCode(code);
  if (params.code !== displayCode) {
    // THE QUERY STRING SURVIVES THE REDIRECT.
    //
    // This was built from the path alone, so anything after the ? was thrown
    // away silently — and whether it happened depended on whether the code
    // was already in exact ABC-123 form. Typing the code without its dash
    // sent you to the canonical URL stripped of every flag:
    //
    //   /2TZQYS?fx=1  ->  /tv/2TZ-QYS     the flag is gone
    //   /2TZ-QYS?fx=1 ->  stays put       the flag is kept
    //
    // Which meant a board behaved differently depending on a punctuation mark
    // nobody can see in the result, with nothing on screen to say so. Found
    // 2026-11-22 while working out why the sound never came on.
    const qs = new URLSearchParams();
    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach((one) => qs.append(key, one));
      else if (value !== undefined) qs.set(key, value);
    });
    const search = qs.toString();
    redirect(`/tv/${displayCode}${search ? `?${search}` : ""}`);
  }

  const board = await getBoardByCode(code);
  if (!board) return <BoardNotFound entered={displayCode} />;

  // Generated here rather than fetched from a QR image service: the code is
  // the one thing on this screen that has to work, and a gig is no place to
  // discover a third party is down. svg-viewbox scales to whatever box the
  // layout gives it.
  const qrSvg = new QRCode({
    content: `${SITE}/go`,
    padding: 1,
    width: 512,
    height: 512,
    color: "#06062a",
    background: "#ffffff",
    ecl: "M",
    join: true,
    container: "svg-viewbox",
    xmlDeclaration: false,
  }).svg();

  // SoundHost owns the audio context. On this route the board never remounts,
  // so the wrapper changes nothing a venue can see — it is here so that ONE
  // component owns the engine on both routes, rather than the per-artist board
  // creating its own and the stage board borrowing one.
  return (
    <SoundHost>
      <TvBoard
        code={code}
        displayCode={displayCode}
        initial={board}
        qrSvg={qrSvg}
      />
    </SoundHost>
  );
};

export default TvBoardPage;
