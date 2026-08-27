import { jahiaComponent } from "@jahia/javascript-modules-library";
import { Cta } from "sofinco-react";
import { buildSimulatorCtaFromNode } from "#lib/simulatorCta";
import { useAppTranslation } from "#lib/i18n";

/**
 * Vue par défaut pour un node `sofnt:simulatorCta` utilisé en CHILD d'un host
 * qui peut en avoir plusieurs (ex : `sofnt:productCompareRow`, cartes, etc.).
 *
 * Pour les hosts qui n'ont qu'UN CTA simulateur, ne PAS créer de child node —
 * étendre directement `sofmix:simulatorCta` sur le host et appeler
 * `buildSimulatorCtaFromNode(currentNode, renderContext, t)` dans la vue host.
 *
 * Cette vue est intentionnellement minimale : tout est dans le helper
 * `buildSimulatorCtaFromNode` (lib/simulatorCta.ts). Le contributeur édite
 * les sim* du child node ; le rendu est un simple `<Cta>` du DS.
 */
jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:simulatorCta",
		displayName: "CTA Simulateur Sofinco",
	},
	(_, { currentNode, renderContext }) => {
		const { t } = useAppTranslation();
		const ctaProps = buildSimulatorCtaFromNode(currentNode, renderContext, t);

		// CTA mal configuré (ni project ni sourceId) → ne rien rendre côté front,
		// mais permettre quand même l'édition en mode édit Jahia.
		if (!ctaProps) return null;

		return <Cta {...ctaProps} />;
	},
);
