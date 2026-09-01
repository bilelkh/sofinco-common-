import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import { Reassurance } from "sofinco-react";
import { mapReassuranceProps } from "./reassurance.mapping";
import classes from "./component.module.css";

interface Props {
	"jcr:title": string;
	"subtitle"?: string;
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:reassurance",
		displayName: "Reassurance",
	},
	(props: Props, { renderContext, currentNode }) => {
		if (renderContext.isEditMode()) {
			// Aperçu d'édition : les items passent par <RenderChildren> pour rester éditables
			// individuellement, ce que le rendu live ne permet pas (Island hydraté).
			return (
				<div className={classes.editPreview}>
					<p className={classes.editTitle}>{props["jcr:title"]}</p>
					{props.subtitle && <p className={classes.editSubtitle}>{props.subtitle}</p>}
					<ul className={classes.editList}>
						<RenderChildren nodeTypes={["sofnt:reassuranceItem"]} />
					</ul>
				</div>
			);
		}

		return <Reassurance {...mapReassuranceProps(currentNode)} />;
	},
);
