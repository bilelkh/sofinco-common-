import type { ReactNode } from "react";
import type { LinkTracking } from "@shared/ui/Link/Link.type";

export type TopBarTab = {
  href: string;
  label: string;
  target?: string;
  ariaLabel?: string;
  /** Renders the tab with the active (filled) styling. The first tab is active by default. */
  isActive?: boolean;
  /** Delegated analytics payload, emitted as `data-tracking` (e.g. `{ event: "click_menu", ... }`). */
  tracking?: LinkTracking;
};

export type TopBarProps = {
  className?: string;
  /** Header tabs (e.g. Particuliers / Professionnels). Max 2 by convention. */
  tabs?: TopBarTab[];
  /** Search field slot — in Jahia this carries the search <Island> via <RenderChild>. */
  slotSearch?: ReactNode;
  children?: ReactNode;
};
