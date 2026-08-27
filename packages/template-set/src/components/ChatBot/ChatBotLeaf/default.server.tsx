import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./component.module.css";

interface Props {
	"label": string;
	"conclusion": string;
	"features": string;
	"ctaLabel": string;
	"linkType": string;
	"j:linknode": JCRNodeWrapper;
	"j:url": string;
	"j:target": string;
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:chatBotLeaf",
	},
	({ label, ctaLabel, linkType }: Props, { renderContext }) => {
		if (!renderContext.isEditMode()) return null;

		const hasLink = linkType && linkType !== "none";

		return (
			<li key={label} className={classes.editCategoryItem}>
				{label}
				{hasLink && (
					<span className={classes.editCta}>
						{" → "}
						{ctaLabel}
					</span>
				)}
			</li>
		);
	},
);
