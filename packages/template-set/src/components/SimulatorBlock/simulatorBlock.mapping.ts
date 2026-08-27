import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import type { SimulatorBlockProps } from "sofinco-react";
import { str } from "#lib/jcr";
import { buildSimulatorCtaFromNode, resolveSimulatorAmountOptions } from "#lib/simulatorCta";
import type { TFunction } from "#lib/i18n";

export function mapSimulatorBlockProps(
	node: JCRNodeWrapper,
	renderContext: RenderContext,
	t: TFunction,
): SimulatorBlockProps {
	// Champ montant (mixin sofmix:simulatorAmount) : placeholder, bornes et messages
	// d'erreur. Bornes en cascade nœud → config globale ; libellés absents → défauts
	// portés par <SimulatorForm>, jamais redéfinis ici.
	const amountOptions = resolveSimulatorAmountOptions(node);

	const cta = buildSimulatorCtaFromNode(node, renderContext, t, {
		ctaSection: "simulator-block-cta",
	});

	const titleLevel = (str(node, "titleLevel") || "h2") as "h1" | "h2" | "h3" | "h4";

	return {
		title: {
			children: str(node, "jcr:title"),
			as: titleLevel,
		},
		...amountOptions,
		cta,
	};
}
