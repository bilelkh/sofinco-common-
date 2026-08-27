import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import {
	getPropertyAsNode,
	str,
	getAsBoolean,
	getChildNode,
	getGlobalSettingsNode,
	num,
} from "#lib/jcr";
import type { CtaProps } from "sofinco-react";
import type { TFunction } from "#lib/i18n";

/**
 * `consent` ouvre le panneau de préférences du CMP au lieu de naviguer. Offert au seul
 * `sofnt:footerLink` (cf. `forms/sofnt_footerLink.json`).
 *
 * L'entrée est signalée au design system par `isConsent` (cf. `footerLink.mapping`),
 * qui la rend alors en `<button>` nu, sans destination. Le `href` produit ici n'atteint
 * donc jamais le DOM ; il n'existe que parce que `FooterLinkProps` l'exige, et parce
 * qu'un `href` vide ferait écarter le CTA par `getCtaProps` comme un lien sans cible.
 * Une ancre nommée plutôt qu'un `"#"` nu : dans les props sérialisées, elle dit de quoi
 * il s'agit.
 */
export type CtaMode = "internal" | "external" | "consent" | "none";

/** Valeur de repli du `href` d'une entrée de consentement — cf. le commentaire ci-dessus. */
export const CONSENT_HASH = "#gerer-mes-cookies";

/**
 * Supports four mixin configurations:
 *  - sofmix:cta          : generic CTA with ctaType switch (internal/external/consent/none)
 *  - sofmix:ctaInternal  : locked-internal CTA (no ctaType property)
 *  - sofmix:ctaExternal  : locked-external CTA (no ctaType property)
 *  - sofmix:ctaConsent   : action CTA — opens the CMP preferences panel, no target
 *
 * Returns null when:
 *  - CTA is explicitly disabled (ctaType === "none")
 *  - No target URL can be resolved (missing internal node or external URL)
 *
 * Le mode `consent` résout `"#"`, il n'est donc jamais écarté par le filtre ci-dessous.
 * L'option n'étant proposée que sur `sofnt:footerLink`, elle ne peut pas apparaître
 * ailleurs par inadvertance.
 */
export const getCtaProps = (
	node: JCRNodeWrapper,
	ctaSection: string,
	variant: CtaProps["variant"] = "accent",
): CtaProps | null => getCtaPropsWithMode(node, ctaSection, variant).props;

/**
 * Même résolution que `getCtaProps`, mais rend AUSSI le mode retenu.
 *
 * Pour les appelants qui doivent se comporter différemment selon la nature du CTA —
 * aujourd'hui le seul pied de page, qui marque l'entrée de consentement d'un
 * `isConsent`. Sans cela ils rappelleraient `resolveCtaMode` sur le même nœud, soit une
 * seconde traversée des types pour une information que l'on vient de calculer.
 *
 * `getCtaProps` délègue ici : une seule implémentation, donc aucun risque que les deux
 * chemins divergent.
 */
export const getCtaPropsWithMode = (
	node: JCRNodeWrapper,
	ctaSection: string,
	variant: CtaProps["variant"] = "accent",
): { props: CtaProps | null; mode: CtaMode } => {
	const mode = resolveCtaMode(node);
	if (mode === "none") return { props: null, mode };

	const href = resolveCtaHref(node, mode);
	if (!href) return { props: null, mode };

	return { props: buildCtaProps(node, mode, href, ctaSection, variant), mode };
};

/**
 * Required CTA: used by content types that mix in `sofmix:cta` (mandatory link),
 * where the consuming React prop expects a non-nullable `CtaProps`.
 * Always returns a `CtaProps` (href falls back to an empty string if unresolved).
 */
export const getRequiredCtaProps = (
	node: JCRNodeWrapper,
	ctaSection: string,
	variant: CtaProps["variant"] = "accent",
): CtaProps => {
	const mode = resolveCtaMode(node);
	const href = resolveCtaHref(node, mode);

	return buildCtaProps(node, mode, href, ctaSection, variant);
};

const buildCtaProps = (
	node: JCRNodeWrapper,
	mode: CtaMode,
	href: string,
	ctaSection: string,
	variant: CtaProps["variant"],
): CtaProps => {
	const internalNode = mode === "internal" ? getPropertyAsNode(node, "ctaInternalNode") : null;
	const label =
		str(node, "ctaLabel") || internalNode?.getPropertyAsString("jcr:title") || "En savoir plus";

	const target = str(node, "ctaTarget") || "_self";

	return { label, href, target, ctaSection, variant };
};

export const resolveCtaMode = (node: JCRNodeWrapper): CtaMode => {
	if (node.isNodeType("sofmix:ctaInternal")) return "internal";
	if (node.isNodeType("sofmix:ctaExternal")) return "external";
	if (node.isNodeType("sofmix:ctaConsent")) return "consent";

	const ctaType = str(node, "ctaType");
	if (ctaType === "internal" || ctaType === "external" || ctaType === "consent") return ctaType;

	return "none";
};

const resolveCtaHref = (node: JCRNodeWrapper, mode: CtaMode): string => {
	if (mode === "internal") {
		const internalNode = getPropertyAsNode(node, "ctaInternalNode");
		return internalNode ? buildNodeUrl(internalNode) : "";
	}
	if (mode === "external") {
		return str(node, "ctaExternalUrl");
	}
	if (mode === "consent") {
		return CONSENT_HASH;
	}
	return "";
};

// `buildProductHeroSimCta` (helper minimaliste avec juste `?provenance=`) a été
// retiré : remplacé par l'architecture partagée `sofmix:simulatorCta` +
// `buildSimulatorCtaFromNode` (cf. #lib/simulatorCta).
// ProductHero étend désormais directement le mixin et obtient tous les
// paramètres simulateur (project, sourceId, amount, etc.) au lieu du seul
// `?provenance=` legacy.

export const buildSimulatorCta = (
	node: JCRNodeWrapper,
	ctaSection: string,
	t: TFunction,
): CtaProps | undefined => {
	const simNode = getChildNode(node, "simulator");
	if (!simNode) return undefined;

	const product = str(simNode, "product");
	const sourceId = str(simNode, "sourceId");
	if (!product || !sourceId) return undefined;

	const configNode = getGlobalSettingsNode("representative-example-config");
	if (!configNode) return undefined;

	const href = buildSimulatorUrl(node, simNode, configNode, product, sourceId);
	if (!href) return undefined;

	const label = str(node, "ctaLabel") || t("representativeExample.cta.defaultLabel");

	return {
		label,
		href,
		target: "_self",
		ctaSection,
		variant: "accent",
	};
};

/**
 * Construit l'URL `/parcours-simulateur(-rac)?...#...` que le simulateur
 * Vue.js v2 lit à l'arrivée pour se pré-configurer.
 *
 * Référence : `services/simulation-initializer.service.ts` du package
 * @sofinco/portail-simulateur-v2.
 *
 * Différences clés selon le variant :
 *   - PB / CR → path `/parcours-simulateur`, utilise `predefinedCreditType`
 *               + `creditTypeFixed` + `loa`
 *   - RAC     → path `/parcours-simulateur-rac`, utilise `creditType=PB`
 *               (cf. router.ts checkForRac() qui matche project=RAC + creditType=PB)
 *
 * URLs PROD reproduites fidèlement (validé sur 3 cas : PB Auto, CR, RAC).
 */
function buildSimulatorUrl(
	node: JCRNodeWrapper,
	simNode: JCRNodeWrapper,
	configNode: JCRNodeWrapper,
	product: string,
	sourceId: string,
): string | null {
	const isRac = product === "RAC";

	// 1. Base URL — depuis le config node du site, avec fallback hardcodé
	const baseUrl = isRac
		? str(configNode, "simulatorRacUrl", "/parcours-simulateur-rac")
		: str(configNode, "simulatorLoanUrl", "/parcours-simulateur");

	// Helper local pour pousser un param dans la query string (skip si vide)
	const parts: string[] = [];
	const addParam = (key: string, value: string | undefined | null): void => {
		if (value === undefined || value === null || value === "") return;
		parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
	};

	// 2. Type de crédit (asymétrie PB/CR vs RAC)
	if (isRac) {
		// RAC : pattern Sofinco — creditType='PB' + project='RAC' active le mode RAC
		// (cf. router.ts checkForRac() dans le simulateur v2)
		addParam("creditType", "PB");
	} else {
		addParam("predefinedCreditType", product);
		const fixed = getAsBoolean(node, "simCreditTypeFixed", true);
		addParam("creditTypeFixed", String(fixed));
	}

	// 3. sourceId — mandatory pour tous les variants
	addParam("sourceId", sourceId);

	// 4. amount / duration depuis le child `simulator` si > 0
	const amount = num(simNode, "amount", 0);
	const duration = num(simNode, "dueNumber", 0);
	if (amount > 0) addParam("amount", String(amount));
	if (duration > 0) addParam("duration", String(duration));

	// 5. project (commun aux 3 variants si renseigné)
	addParam("project", str(node, "simProject"));

	// 6. subProject (commun aux 3 variants si renseigné)
	addParam("subProject", str(node, "simSubProject"));

	// 7. loa : PB/CR uniquement (pas observé dans les URLs PROD RAC)
	if (!isRac) {
		const loa = getAsBoolean(node, "simLoa", false);
		addParam("loa", String(loa));
	}

	// 8. Tracking optionnels
	addParam("idcatorigin", str(node, "simIdcatorigin"));
	addParam("mfactoryid", str(node, "simMfactoryid"));

	// 9. classicSubscription : sérialisé UNIQUEMENT si le contributeur l'a coché
	// (matche les URLs PROD qui ne le contiennent jamais par défaut)
	if (getAsBoolean(node, "simClassicSubscription", false)) {
		addParam("classicSubscription", "true");
	}

	// 10. Assemblage final de l'URL
	const queryString = parts.join("&");
	const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

	// 11. Hash fragment (libre : /auto, /montant-financement, /rachat/nombre-credits, ...)
	const hash = str(node, "simHashFragment");
	if (!hash) return url;

	const normalizedHash = hash.charAt(0) === "/" ? hash : `/${hash}`;
	return `${url}#${normalizedHash}`;
}
