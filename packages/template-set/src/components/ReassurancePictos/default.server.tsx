import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import { ReassurancePictos } from "sofinco-react";
import { useAppTranslation } from "#lib/i18n";
import { isMainResourceNode } from "#lib/renderContext";
import { mapReassurancePictosProps, readMaxItems } from "./reassurancePictos.mapping";
import classes from "./component.module.css";

export default jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:reassurancePictos",
		displayName: "Réassurance Pictos",
	},
	(_, { currentNode, renderContext }) => {
		const { t } = useAppTranslation();
		if (isMainResourceNode(renderContext, "reassurance-pictos")) {
			const cap = readMaxItems(currentNode);
			return (
				<section className={classes.editPreview}>
					<p className={classes.editTitle}>{t("reassurancePictos.maxItems", { cap })}</p>
					<ul className={classes.editList}>
						<RenderChildren nodeTypes={["sofnt:reassurancePictosItem"]} />
					</ul>
				</section>
			);
		}

		const props = mapReassurancePictosProps(currentNode, t);
		return <ReassurancePictos {...props} />;
	},
);
