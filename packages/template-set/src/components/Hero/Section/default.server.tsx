import { jahiaComponent, Island } from "@jahia/javascript-modules-library";

import { isEditMode } from "#lib/renderContext";
import { useAppTranslation } from "#lib/i18n";
import { mapSectionProps } from "./section.mapper";
import type { SectionProps } from "sofinco-react";
import HeroSection from "./HeroSection.client";
import HeroSectionServer from "./views/HeroSectionServer";

export default jahiaComponent(
	{ nodeType: "sofnt:heroSection", displayName: "Hero Section", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		if (isEditMode(renderContext)) {
			return <HeroSectionServer />;
		}
		const { t } = useAppTranslation();
		const props: SectionProps = mapSectionProps(currentNode, renderContext, t);
		return <Island component={HeroSection} props={props} />;
	},
);
