import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerMockup } from "@/components/player/feed/PlayerMockup";
import { isProduction } from "@/lib/env";

export const metadata: Metadata = { title: "Maquette du lecteur", robots: { index: false } };

export default function PlayerMockupPage() {
  if (isProduction()) notFound();
  return <PlayerMockup />;
}
