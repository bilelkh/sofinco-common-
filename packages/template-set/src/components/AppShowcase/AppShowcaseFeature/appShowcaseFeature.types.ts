import type { TitleTag } from "sofinco-react";

export interface AppShowcaseFeatureProps {
	iconUrl?: string;
	featureTitle: string;
	/** Balise du libellé de carte — l'apparence reste celle du composant. */
	featureTitleAs?: TitleTag;
	featureText: string;
}
