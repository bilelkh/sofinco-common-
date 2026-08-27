import { jahiaComponent } from "@jahia/javascript-modules-library";
import { SeoMesh, type LinkProps, type BlockProps } from "sofinco-react";
import { isEditMode } from "#lib/renderContext";
import { mapSeoMeshWrapperPropsServer, mapSeoMeshProps } from "./seoMeshWrapper.mapping";
import { SeoMeshWrapperServer } from "./views/SeoMeshWrapperServer";

function withIcons(blocks: BlockProps[], maxLinksPerSection?: number): BlockProps[] {
	const addIconsToSection = (section: BlockProps["linkSectionLeft"]) => {
		if (!section) return undefined;
		return {
			...section,
			links: section.links
				?.slice(0, maxLinksPerSection)
				.map((link: LinkProps): LinkProps => ({ ...link, iconLeft: "arrow-right" as const })),
		};
	};

	return blocks.map((block) => ({
		...block,
		ctaProps: { ...block.ctaProps, iconRight: "arrow-right" },
		linkSectionLeft: addIconsToSection(block.linkSectionLeft),
		linkSectionRight: addIconsToSection(block.linkSectionRight),
	}));
}

export default jahiaComponent(
	{ nodeType: "sofnt:seoMeshWrapper", displayName: "SeoMeshWrapper", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		if (isEditMode(renderContext)) {
			return <SeoMeshWrapperServer {...mapSeoMeshWrapperPropsServer(currentNode)} />;
		}

		const props = mapSeoMeshProps(currentNode);
		return <SeoMesh {...props} blocks={withIcons(props.blocks, props.maxLinksPerSection)} />;
	},
);
