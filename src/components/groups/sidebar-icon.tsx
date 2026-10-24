import Image from "next/image";
import { ChartNoAxesColumn, Gamepad2, Goal, Radio, Trophy, Volleyball } from "lucide-react";
import type { SidebarGlyph, SidebarNode } from "@/lib/polymarket/groups";

const GLYPHS: Record<SidebarGlyph, React.ComponentType<{ className?: string }>> = {
  live: Radio,
  futures: ChartNoAxesColumn,
  soccer: Goal,
  tennis: Volleyball,
  esports: Gamepad2,
  cricket: Trophy,
};

const SIZE = 20;

/** League image, or a generic icon for Live / Futures / sport groups. */
export function SidebarIcon({ node }: { node: SidebarNode }) {
  if (node.icon) {
    return <Image src={node.icon} alt="" width={SIZE} height={SIZE} className="size-5 shrink-0 object-contain" />;
  }
  const Glyph = node.glyph ? GLYPHS[node.glyph] : null;
  return Glyph ? (
    <Glyph className={node.glyph === "live" ? "size-5 shrink-0 text-no" : "size-5 shrink-0 text-base-content/70"} />
  ) : null;
}
