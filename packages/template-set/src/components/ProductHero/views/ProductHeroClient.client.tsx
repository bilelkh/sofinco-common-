import { HeroPP, type HeroPPProps } from "sofinco-react";

/**
 * Hydration client du HeroPP côté Jahia Island. Composant DS importé depuis
 * sofinco-react (features/Hero/HeroPP).
 */
export default function ProductHeroClient(props: HeroPPProps) {
	return <HeroPP {...props} />;
}
