import { jahiaComponent } from "@jahia/javascript-modules-library";
import { strLimit } from "#lib/jcr";

import type { ArgumentItem } from "sofinco-react";
import classes from "./argument.module.css";

export default jahiaComponent(
	{ nodeType: "sofnt:heroArgument", displayName: "Hero Argument", componentType: "view" },
	(_, { currentNode }) => {
		const props: ArgumentItem = {
			id: currentNode.getIdentifier(),
			label: strLimit(currentNode, "jcr:title", 36),
		};

		return <div className={`${classes.pill} ${classes.pillEdit}`}>{props.label}</div>;
	},
);
