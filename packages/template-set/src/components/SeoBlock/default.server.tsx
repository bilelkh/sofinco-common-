import { jahiaComponent } from "@jahia/javascript-modules-library";
import { SeoBlock } from "sofinco-react";
import { isEditMode } from "#lib/renderContext";
import { mapSeoBlockProps, mapSeoBlockServerProps } from "./seoBlock.mapping";
import SeoBlockServer from "./views/SeoBlockServer";

/**
 * `sofnt:seoBlock` — editorial title + rich text block.
 *
 * Edit mode → <SeoBlockServer />: renders the DS + a warning banner when
 *   mandatory fields (`jcr:title`, `content`) are empty on a fresh
 *   autocreated node, pointing the contributor to the fields to fill.
 * Live mode → <SeoBlock {...props} />: direct DS render (no overhead).
 */
export default jahiaComponent(
	{ nodeType: "sofnt:seoBlock", displayName: "SeoBlock", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		const dsProps = mapSeoBlockProps(currentNode);

		if (isEditMode(renderContext)) {
			const serverProps = mapSeoBlockServerProps(dsProps);
			return <SeoBlockServer dsProps={dsProps} serverProps={serverProps} />;
		}

		return <SeoBlock {...dsProps} />;
	},
);
