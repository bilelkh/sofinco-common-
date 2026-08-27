import { jahiaComponent } from "@jahia/javascript-modules-library";
import { createElement } from "react";
import { ICONS } from "sofinco-react";
import { str } from "#lib/jcr";
import classes from "./comparativeTableRow.module.css";

/** Renders the real sofinco-react SVG icon for a value, or nothing when "none"/unset. */
const ValueIcon = ({ icon }: { icon: string }) => {
	if (!icon || !Object.hasOwn(ICONS, icon)) return null;
	return <span className={classes.icon}>{createElement(ICONS[icon as keyof typeof ICONS])}</span>;
};

export default jahiaComponent(
	{
		nodeType: "sofnt:comparativeTableRow",
		displayName: "Ligne de comparaison",
		componentType: "view",
	},
	(_, { currentNode }) => (
		<li className={classes.row}>
			<span className={classes.label}>{str(currentNode, "label")}</span>
			<span className={classes.value}>
				<ValueIcon icon={str(currentNode, "leftValueIcon")} />
				{str(currentNode, "leftValueLabel")}
			</span>
			<span className={classes.value}>
				<ValueIcon icon={str(currentNode, "rightValueIcon")} />
				{str(currentNode, "rightValueLabel")}
			</span>
		</li>
	),
);
