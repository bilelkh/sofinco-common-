import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import type { HeroSimulatorProps } from "sofinco-react";
import { str } from "#lib/jcr";
import { buildSimulatorCtaFromNode, resolveSimulatorAmountOptions } from "#lib/simulatorCta";

/**
 * Mappe le nœud JCR `sofnt:simulatorCredit` vers les props du composant
 * React `<HeroSimulator>`.
 *
 * Champ montant (placeholder, bornes, messages d'erreur) : mixin
 * `sofmix:simulatorAmount` porté par le nœud, avec cascade vers le settings node
 * global puis les défauts de `<SimulatorForm>` — non redéfinis ici.
 */
export function mapSimulatorProps(
	node: JCRNodeWrapper,
	renderContext: RenderContext,
	t: (key: string) => string,
): HeroSimulatorProps {
	const amountOptions = resolveSimulatorAmountOptions(node);

	const cta = buildSimulatorCtaFromNode(node, renderContext, t, {
		ctaSection: "simulator-credit-cta",
	});

	return {
		simulatorTitle: str(node, "jcr:title"),
		...amountOptions,
		cta,
	};
}
