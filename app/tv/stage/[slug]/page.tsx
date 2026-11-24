import { Metadata } from "next";
import QRCode from "qrcode-svg";

import { getStageTarget } from "@/lib/gcp/stage";
import { getBoardByCode } from "@/lib/gcp/board";
import { normalizeStageSlug } from "@/lib/stage";
import SoundHost from "../../[code]/SoundHost";
import StageBoard from "./StageBoard";

export const dynamic = "force-dynamic";

const SITE = "https://www.tellmewhat2play.com";

interface StagePageProps {
  params: { slug: string };
}

export const generateMetadata = async ({
  params,
}: StagePageProps): Promise<Metadata> => ({
  title: "Live Requests",
  // Same as the per-artist board: a venue screen is not a page anybody should
  // reach from a search result.
  robots: { index: false, follow: false },
});

// A STAGE, NOT AN ARTIST.
//
// /tv/{code} is one artist's board and is not changing — it is the right
// answer for virtually every gig, and artists have that URL written down.
// This is the second door, for a night with a rotating bill: the TV sits here
// all night and the host chooses who is on it.
//
// Why this is a separate route rather than a mode of the other one: the
// per-artist board must keep working exactly as it does even if everything
// here is wrong. If this page misbehaves at a gig, the fallback is the
// bookmark the venue already has.
const StagePage = async ({ params }: StagePageProps) => {
  const slug = normalizeStageSlug(params.slug);

  // Resolved on the server so the first frame is already the right act rather
  // than a holding screen that corrects itself a moment later.
  const target = slug ? await getStageTarget(slug) : null;
  const board = target ? await getBoardByCode(target.code) : null;

  // The QR is the SAME on every board — it carries no code, only
  // tellmewhat2play.com/go, which sniffs the UA and sends the phone to the
  // right store. So it is generated once here and survives every swap, which
  // is also why "scan the screen to join the new act" was never a thing this
  // can offer: scanning only ever opens the store.
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

  return (
    <SoundHost>
      <StageBoard
        slug={slug}
        initialTarget={target}
        initialBoard={board}
        qrSvg={qrSvg}
      />
    </SoundHost>
  );
};

export default StagePage;
