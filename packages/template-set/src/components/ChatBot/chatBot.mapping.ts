import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import type { ChatBotData, Category } from "./ChatBot.client";
import { getChildNodesByType, getPropertyAsNode, imgUrl, nodeUrl, str, strList } from "#lib/jcr";
import { addSubtreeCacheDependency } from "#lib/cacheDependency";
import {
	buildSimulatorCtaFromNode,
	resolveSimulatorAmountOptions,
	SIMULATOR_HASH,
} from "#lib/simulatorCta";
import type { TFunction } from "#lib/i18n";

const CATEGORY = "sofnt:chatBotCategory";
const LEAF = "sofnt:chatBotLeaf";
const SIM_LEAF = "sofnt:chatBotSimulatorLeaf";

/**
 * Contexte de mapping propagé jusqu'aux feuilles simulateur : `buildSimulatorCtaFromNode`
 * a besoin du `renderContext` (fallback idcat de la page) et de `t` (libellé par défaut).
 */
interface MapCtx {
	renderContext: RenderContext;
	t: TFunction;
}

/**
 * Maps a terminal `sofnt:chatBotLeaf` node into a `Category` carrying a
 * `conclusion` (the response). Link resolution mirrors the legacy inline
 * logic: a `j:linknode` reference wins, else a raw `j:url`, else `"#"`.
 */
function mapLeaf(leaf: JCRNodeWrapper): Category {
	const linkedNode = getPropertyAsNode(leaf, "j:linknode");
	const url = str(leaf, "j:url");
	const target = str(leaf, "j:target");
	const href = linkedNode ? nodeUrl(linkedNode) : url || "#";

	return {
		label: str(leaf, "label"),
		conclusion: str(leaf, "conclusion"),
		features: strList(leaf, "features"),
		ctaLabel: str(leaf, "ctaLabel"),
		ctaUrl: href,
		ctaTarget: target || undefined,
	};
}

/**
 * Maps a terminal `sofnt:chatBotSimulatorLeaf` into a result-shaped `Category`.
 *
 * Deux CTA cohabitent :
 *   - CTA produit (navy) : lien éditorial classique, même mécanisme que `mapLeaf`
 *     (`j:linknode` > `j:url`), libellé lu depuis `productCtaLabel`.
 *   - CTA simulateur (turquoise) : URL forgée via `buildSimulatorCtaFromNode`
 *     (mixin `sofmix:simulatorCta`), le montant saisi est injecté côté client.
 *
 * Pas de `label` : cette feuille est l'unique enfant de sa catégorie et ne rend
 * jamais de puce cliquable — la `question` de la catégorie parente sert de prompt.
 */
function mapSimulatorLeaf(leaf: JCRNodeWrapper, ctx: MapCtx): Category {
	const linkedNode = getPropertyAsNode(leaf, "j:linknode");
	const url = str(leaf, "j:url");
	const target = str(leaf, "j:target");
	const productHref = linkedNode ? nodeUrl(linkedNode) : url || "#";

	const sim = buildSimulatorCtaFromNode(leaf, ctx.renderContext, ctx.t, {
		ctaSection: "chatbot-result-cta",
		// Le chatbot a déjà collecté un montant : on force l'étape « montant financement »
		// du simulateur. Sinon `resolveSimulatorHash` renverrait la page catégorie projet
		// (#/auto, #/famille-loisirs, …) tant que `simSubProject` n'est pas renseigné, et
		// le montant injecté côté client via `?amount=` serait ignoré.
		forceHash: SIMULATOR_HASH.FUNDING_AMOUNT,
	});

	// Bornes + messages d'erreur du mixin `sofmix:simulatorAmount` : override par
	// feuille, sinon cascade globale (settings node → défauts 150/999999) ; le
	// réordonnancement min > max est assuré par le helper.
	const amountOptions = resolveSimulatorAmountOptions(leaf);

	return {
		label: "",
		conclusion: str(leaf, "conclusion"),
		features: strList(leaf, "features"),
		// CTA produit (navy)
		ctaLabel: str(leaf, "productCtaLabel"),
		ctaUrl: productHref,
		ctaTarget: target || undefined,
		// CTA simulateur (turquoise) + champ montant
		simulator: {
			amountCtaLabel: str(leaf, "amountCtaLabel") || undefined,
			...amountOptions,
			simulatorCtaLabel: sim?.label ?? ctx.t("simulatorCta.defaultLabel"),
			simulatorCtaUrl: sim?.href ?? "#",
			project: str(leaf, "simProject") || undefined,
		},
	};
}

/**
 * Dispatch a single terminal/branch child, preserving authored order.
 */
function mapChild(child: JCRNodeWrapper, ctx: MapCtx): Category {
	if (child.isNodeType(SIM_LEAF)) return mapSimulatorLeaf(child, ctx);
	if (child.isNodeType(LEAF)) return mapLeaf(child);
	return mapCategory(child, ctx);
}

/**
 * Recursively maps a `sofnt:chatBotCategory` node. Its children are walked in a
 * single ordered pass so leaves and sub-categories keep their authored order:
 * a `sofnt:chatBotLeaf` / `sofnt:chatBotSimulatorLeaf` becomes a terminal
 * response, a nested `sofnt:chatBotCategory` recurses. This supports arbitrary
 * nesting depth and mixed depth (a category may hold leaves and sub-categories
 * side by side); the fixed 2-level limit lived only in the previous hand-unrolled
 * mapping.
 */
function mapCategory(node: JCRNodeWrapper, ctx: MapCtx): Category {
	// Aucune dépendance de cache déclarée ici : `mapChatBotData` couvre déjà tout
	// le sous-arbre en un seul appel (cf. `addSubtreeCacheDependency`). Enregistrer
	// en plus une dépendance par catégorie traversée serait redondant et coûteux
	// sur un arbre profond.
	const children = [...node.getNodes()]
		.filter(
			(child: JCRNodeWrapper) =>
				child.isNodeType(CATEGORY) || child.isNodeType(LEAF) || child.isNodeType(SIM_LEAF),
		)
		.map((child: JCRNodeWrapper) => mapChild(child, ctx));

	return {
		label: str(node, "label"),
		question: str(node, "question"),
		children,
	};
}

/**
 * Maps a `sofnt:chatBot` node into the serializable `ChatBotData` consumed by
 * the React Island. The root holds only categories (per the CND); each branch
 * recurses to any depth and always terminates in a leaf (the response).
 *
 * `renderContext` + `t` are threaded down to the simulator leaves so
 * `buildSimulatorCtaFromNode` can resolve the forged URL and default label.
 */
export function mapChatBotData(
	node: JCRNodeWrapper,
	greeting: string,
	question: string,
	renderContext: RenderContext,
	t: TFunction,
): ChatBotData {
	// L'arbre de catégories est parcouru récursivement en `node.getNodes()` brut
	// (`mapCategory`), ce qui court-circuite l'enregistrement par nœud de `#lib/jcr`.
	// On déclare donc le sous-arbre entier : publier n'importe quelle catégorie ou
	// feuille, à n'importe quelle profondeur, invalide ce fragment.
	addSubtreeCacheDependency(node);

	const ctx: MapCtx = { renderContext, t };
	return {
		greeting,
		question,
		categories: getChildNodesByType(node, CATEGORY).map((cat) => mapCategory(cat, ctx)),
		avatarUrl: imgUrl(node, "avatarUrl"),
	};
}
