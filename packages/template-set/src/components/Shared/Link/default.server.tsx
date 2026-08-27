import { jahiaComponent } from "@jahia/javascript-modules-library";
import { Link } from "sofinco-react";
import { isEditMode } from "#lib/renderContext";
import { readLink } from "./readLink";
import classes from "./component.module.css";
import { str } from "#lib/jcr";
import { useAppTranslation } from "#lib/i18n";

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:link",
	},
	(_, { currentNode, renderContext }) => {
		const link = readLink(currentNode);
		if (!link) {
			if (!isEditMode(renderContext)) return null;
			const label = str(currentNode, "jcr:title");
			const { t } = useAppTranslation();
			const emptyLinkMsg = t("links.emptyLink");
			return (
				<span className={classes.editPlaceholder} aria-disabled="true">
					{label ? `${label} (${emptyLinkMsg})` : `${emptyLinkMsg}`}
				</span>
			);
		}
		return (
			<Link
				href={link.href}
				label={link.label}
				isExternal={link.target === "_blank"}
				className="link"
				iconVariant={link.iconVariant}
				iconLeft={link.iconLeft}
				iconRight={link.iconRight}
			/>
		);
	},
);
