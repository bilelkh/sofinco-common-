import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import { getGlobalSettingsNode } from "../../lib/jcr";
import { AlertBand } from "sofinco-react";

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:mention",
	},
	(_, { renderContext }) => {
		const site = renderContext.getSite();
		const message = getGlobalSettingsNode("mention-settings", site)
			?.getProperty("message")
			?.getString();
		const hasMessage = !!message;

		const isEditMode = renderContext.isEditMode();

		return (
			<>
				{isEditMode ? (
					<div className={classes.mention}>
						{message ??
							"Editez la mention sanitaire dans les propriétés du site pour l'afficher ici."}
					</div>
				) : (
					hasMessage && <AlertBand message={message} />
				)}
			</>
		);
	},
);
