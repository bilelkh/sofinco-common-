import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

interface Props {
	conclusion: string;
	productCtaLabel: string;
	simProject: string;
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:chatBotSimulatorLeaf",
	},
	({ conclusion, productCtaLabel, simProject }: Props, { renderContext }) => {
		if (!renderContext.isEditMode()) return null;

		return (
			<li className={classes.editCategoryItem}>
				{conclusion}
				<span className={classes.editCta}>
					{" → "}
					{productCtaLabel}
					{simProject && ` (simulateur ${simProject})`}
				</span>
			</li>
		);
	},
);
