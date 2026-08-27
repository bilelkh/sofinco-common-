import { jahiaComponent, RenderChild } from "@jahia/javascript-modules-library";
import { imgUrl } from "#lib/jcr";
import { readLinkChild } from "#shared/Link/readLink";
import classes from "../component.module.css";

interface Props {
	"jcr:title"?: string;
	"text"?: string;
	"iconAlt"?: string;
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:reassuranceItem",
		displayName: "ReassuranceItem",
	},
	({ "jcr:title": title = "", text = "", iconAlt = "" }: Props, { currentNode }) => {
		const icon = imgUrl(currentNode, "icon");
		const link = readLinkChild(currentNode);

		const placeholder = !title && !text && !icon && !link;

		return (
			<li className={classes.editItem}>
				{icon && <img src={icon} alt={iconAlt} className={classes.editItemIcon} />}
				<p className={classes.editItemTitle}>
					{title || <em>Reassurance item — click to edit</em>}
				</p>
				{text && <p className={classes.editItemText}>{text}</p>}
				<div className={classes.editItemLinkSlot}>
					<RenderChild name="link" nodeTypes={["sofnt:link"]} />
				</div>
				{placeholder && (
					<p className={classes.editItemText}>
						<small>Add an icon, title, text or link.</small>
					</p>
				)}
			</li>
		);
	},
);
