import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { Reassurance, type ReassuranceItem } from "sofinco-react";
import { getChildNodesByType, imgUrl, str } from "#lib/jcr";
import { readLinkChild } from "#shared/Link/readLink";
import classes from "./component.module.css";

interface Props {
	"jcr:title": string;
	"subtitle"?: string;
}

function readItem(node: JCRNodeWrapper, index: number): ReassuranceItem {
	const link = readLinkChild(node);
	return {
		id: node.getIdentifier() ?? index,
		icon: imgUrl(node, "icon") || undefined,
		iconAlt: str(node, "iconAlt", ""),
		title: str(node, "jcr:title", ""),
		text: str(node, "text", "") || undefined,
		link: link
			? {
					href: link.href,
					label: link.label,
					isExternal: link.target === "_blank",
					iconLeft: link.iconLeft,
					iconRight: link.iconRight,
					iconVariant: link.iconVariant,
				}
			: undefined,
	};
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:reassurance",
		displayName: "Reassurance",
	},
	(props: Props, { renderContext, currentNode }) => {
		const title = props["jcr:title"];
		const subtitle = props.subtitle;
		const itemNodes = getChildNodesByType(currentNode, "sofnt:reassuranceItem");

		if (renderContext.isEditMode()) {
			return (
				<div className={classes.editPreview}>
					<p className={classes.editTitle}>{title}</p>
					{subtitle && <p className={classes.editSubtitle}>{subtitle}</p>}
					<ul className={classes.editList}>
						<RenderChildren nodeTypes={["sofnt:reassuranceItem"]} />
					</ul>
				</div>
			);
		}

		return (
			<Reassurance
				title={title}
				subtitle={subtitle}
				items={itemNodes.map((n, i) => readItem(n, i))}
			/>
		);
	},
);
