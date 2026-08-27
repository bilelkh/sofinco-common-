import type { BlockProps } from "./Block/Block.type";

export type SeoMeshProps = {
  blocks: BlockProps[];
	backgroundColor?: string;
  maxSections?: number;
  maxLinksPerSection?: number;
};
