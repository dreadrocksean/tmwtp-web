import { Metadata } from "next";

import { normalizeStageSlug } from "@/lib/stage";
import StageControl from "./StageControl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stage control",
  robots: { index: false, follow: false },
};

interface ControlPageProps {
  params: { slug: string };
}

// Deliberately a sibling of the wall it controls, so the URL is guessable
// from the one already on the TV: .../stage/main and .../stage/main/control.
// Nothing here is secret — the gate is firestore.rules, which only lets God
// write the pointer. A fan who finds this page can sign in as themselves and
// see that it refuses them.
const ControlPage = ({ params }: ControlPageProps) => (
  <StageControl slug={normalizeStageSlug(params.slug)} />
);

export default ControlPage;
