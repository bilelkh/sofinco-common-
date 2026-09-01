import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import type { SimulatorBlockProps } from "sofinco-react";
import { str } from "#lib/jcr";
import { buildSimulatorCtaFromNode, resolveSimulatorAmountOptions } from "#lib/simulatorCta";
import type { TFunction } from "#lib/i18n";
import { readTitleLevel } from "#cms/Shared/HeadingStyle/headingStyle.mapping";

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

	/*
	 * `readTitleLevel` SEUL, et surtout pas `buildTitleProps`.
	 *
	 * On remonte la BALISE (`titleLevel`), validee par le garde-fou du mixin plutot que par
	 * un cast en dur comme auparavant. On ne remonte PAS l'apparence : la typographie de ce
	 * composant est sur mesure (`.simulator-block__title`) et le DS force `visualStyle="none"`.
	 * Emettre un `titleStyle` ici serait une donnee morte cote rendu, et une invitation a
	 * reintroduire la course de cascade que ce lot vient de corriger.
	 */
	return {
		title: { children: str(node, "jcr:title"), as: readTitleLevel(node) },
		...amountOptions,
		cta,
	};
}
