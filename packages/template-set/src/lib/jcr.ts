import { buildNodeUrl, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import { useAppTranslation } from "./i18n";
import { manageFooterNote, superscriptFootnoteTokens } from "./footnotes";
import { shouldProcessFootnotes } from "./footnoteFields";
import { isCollectingFootnotes, setFootnoteLocation } from "./footnoteCollector";
import { substituteInsuranceVars } from "./insuranceVars";
import { addNodeCacheDependency, addDirectChildrenCacheDependency } from "./cacheDependency";

/**
 *  extracts a string property from a JCR node.
 *
 * When the (nodeType, propertyName) pair is registered in `FOOTNOTE_FIELDS`, the rich-text
 * value is run through `manageFooterNote` so footnote markers/notes become accessible
 * anchors — transparently, so every existing `str` call site benefits. The a11y labels are
 * resolved here via `useAppTranslation` (safe to call in this SSR helper, like the
 * `useServerContext` calls elsewhere in this file).
 *
 * EVERY value additionally goes through `superscriptFootnoteTokens`, which turns a `((n))`
 * reference authored in a plain-text field into `⁽¹⁾`. It is applied unconditionally, with
 * no registry, because it is a text→text transform: harmless in a URL or a choicelist
 * value, and safe wherever the result lands — attribute, `<title>`, meta tag, jContent tree
 * label, search index. That is what lets a footnote reference be contributed in ANY string
 * property without touching a single component. See the note on that function.
 */
export const str = (node: JCRNodeWrapper, propertyName: string, fallback: string = ""): string => {
	if (!node.hasProperty(propertyName)) return fallback;
	const value = node.getProperty(propertyName).getString();
	if (!value) return value;

	/*
	 * Contrôle éditorial : on déclare le composant et la propriété en cours de lecture.
	 * `str` est le passage obligé de tout texte contributeur ; les points de collecte, eux,
	 * sont de simples fonctions de chaîne sans accès au JCR. Sans ce repère, le contributeur
	 * apprend qu'une mention manque mais pas où la corriger.
	 *
	 * Actif en mode édition uniquement — les appels JCR ci-dessous ne sont donc jamais faits
	 * sur le site public.
	 */
	if (isCollectingFootnotes()) {
		try {
			/*
			 * Nom TRONQUÉ : `getDisplayableName()` renvoie le `jcr:title` du nœud, qui pour un
			 * bloc SEO est le titre entier — le libellé reprenait alors tout le texte fautif et
			 * faisait doublon avec l'extrait. Quarante caractères suffisent à reconnaître le
			 * composant.
			 */
			const name = node.getDisplayableName();
			const short = name.length > 40 ? `${name.slice(0, 40)}…` : name;
			setFootnoteLocation({
				id: node.getIdentifier(),
				path: node.getPath(),
				property: propertyName,
				label: `${short} — ${propertyName}`,
			});
		} catch {
			setFootnoteLocation(null);
		}
	}

	/*
	 * Variables de simulation (`{{taea}}`, `{{monthlyAmount}}`…) — AVANT le traitement des
	 * renvois de note. L'ordre compte : une valeur substituée peut contenir un `((n))`
	 * contribué dans la mention, qui doit ensuite être transformé en renvoi comme le reste du
	 * texte. L'inverse laisserait ce renvoi brut.
	 *
	 * Inerte tant qu'aucun jeton n'est présent — cf. `insuranceVars.ts`.
	 */
	const substituted = substituteInsuranceVars(value);

	if (shouldProcessFootnotes(node, propertyName)) {
		const { t } = useAppTranslation();
		return superscriptFootnoteTokens(
			manageFooterNote(
				substituted,
				{
					note: t("a11y.noteBasDePage"),
					back: t("a11y.retourRef"),
				},
				// Origine de la mention, pour le contrôle éditorial : celles du pied de page
				// sont rendues sur TOUTES les pages du site et ne sont donc jamais signalées
				// « jamais citées » (cf. footnoteCollector.ts).
				node.getPrimaryNodeTypeName(),
			),
		);
	}
	return superscriptFootnoteTokens(substituted);
};

/**
 * Extracts a multi-valued string property from a JCR node as a string array.
 */
export const strList = (node: JCRNodeWrapper, propertyName: string): string[] => {
	if (!node.hasProperty(propertyName)) return [];
	try {
		return node
			.getProperty(propertyName)
			.getValues()
			.map((v) => v.getString());
	} catch {
		return [];
	}
};

/**
 * Extracts a string property from a JCR node and limits its length.
 */
export const strLimit = (
	node: JCRNodeWrapper,
	propertyName: string,
	limit: number,
	fallback: string = "",
): string => {
	const paragraph = str(node, propertyName, fallback);
	return paragraph ? paragraph.slice(0, limit) : fallback;
};

/**
 *  extracts an image/file URL from a weakreference property.
 */
export const imgUrl = (node: JCRNodeWrapper, propertyName: string): string => {
	const r = getPropertyAsNode(node, propertyName);
	return r ? buildNodeUrl(r) : "";
};

/**
 * Métadonnées d'une image référencée par une weakreference : URL, dimensions
 * intrinsèques et texte alternatif.
 *
 * Les nœuds `jmix:image` portent déjà `j:width` / `j:height`. Les exposer permet
 * aux crawlers sociaux (Facebook, LinkedIn) de composer la carte de partage dès
 * le premier scrape, sans devoir télécharger le fichier au préalable —
 * cf. `#lib/openGraph`.
 */
export interface ImageMeta {
	url: string;
	/** `j:width` en pixels ; `0` quand le nœud ne la porte pas (fichier non `jmix:image`). */
	width: number;
	/** `j:height` en pixels ; `0` quand le nœud ne la porte pas. */
	height: number;
	/** Nom affichable du fichier — même repli que `navMenu` / `NewsBlock`. */
	alt: string;
}

/**
 * Comme `imgUrl`, mais retourne aussi les dimensions et le texte alternatif.
 * `null` quand la référence est absente ou non résolvable.
 *
 * **Cache dep** : déclarée par `getPropertyAsNode` sur le nœud pointé.
 */
export const imgMeta = (node: JCRNodeWrapper, propertyName: string): ImageMeta | null => {
	const referenced = getPropertyAsNode(node, propertyName);
	if (!referenced) return null;
	return {
		url: buildNodeUrl(referenced),
		width: num(referenced, "j:width"),
		height: num(referenced, "j:height"),
		alt: referenced.getDisplayableName() ?? "",
	};
};

/**
 *  extracts an video/file URL from a weakreference property.
 */
export const vidUrl = (node: JCRNodeWrapper, propertyName: string): string => {
	return imgUrl(node, propertyName);
};

/**
 *  extracts an node URL from a weakreference property.
 */
export const nodeUrl = (node: JCRNodeWrapper, propertyName?: string): string => {
	if (propertyName) {
		return imgUrl(node, propertyName);
	}
	return node ? buildNodeUrl(node) : "";
};

/**
 * Retrieves a child node by its name, returning null if it doesn't exist.
 *
 * **Cache dep** : quand le child est résolu on déclare `{ node: child }`.
 * Quand il est absent, le CALLER est responsable d'ajouter une dépendance
 * `{ path: parent.getPath() + "/" + childName }` s'il souhaite que la
 * (re)création future de l'enfant invalide son fragment.
 */
export const getChildNode = (node: JCRNodeWrapper, childName: string): JCRNodeWrapper | null => {
	if (node.hasNode(childName)) {
		const child = node.getNode(childName) as JCRNodeWrapper;
		addNodeCacheDependency(child);
		return child;
	}
	return null;
};

/**
 * Retrieves a node referenced by a weakreference property, returning null if
 * unresolvable.
 *
 * **Cache dep** : dépendance déclarée sur le nœud pointé — ainsi tout
 * changement de la cible (ex : remplacement d'une image dans un picker) invalide
 * le fragment qui l'utilise.
 */
export const getPropertyAsNode = (
	node: JCRNodeWrapper,
	propertyName: string,
): JCRNodeWrapper | null => {
	if (!node.hasProperty(propertyName)) return null;
	try {
		const referenced = node.getProperty(propertyName).getNode() as JCRNodeWrapper;
		addNodeCacheDependency(referenced);
		return referenced;
	} catch {
		return null;
	}
};

/**
 * extracts a numeric (Long) property from a JCR node.
 * Returns the provided fallback value if the property doesn't exist or is invalid.
 */
export const num = (node: JCRNodeWrapper, propertyName: string, fallback: number = 0): number => {
	if (!node.hasProperty(propertyName)) {
		return fallback;
	}

	try {
		return node.getProperty(propertyName).getLong();
	} catch {
		return fallback;
	}
};

export const getDouble = (
	node: JCRNodeWrapper,
	propertyName: string,
	fallback: number = 0,
): number => {
	if (!node.hasProperty(propertyName)) return fallback;
	try {
		return node.getProperty(propertyName).getDouble();
	} catch {
		return fallback;
	}
};

/**
 * Returns the child nodes of a given node filtered by node type.
 *
 * **Cache dep** :
 *  - `{ flushOnPathMatchingRegexp: parent + "/[^/]+$" }` — couvre ajouts,
 *    suppressions et réordonnancements d'enfants.
 *  - `{ node: child }` sur chaque enfant retourné.
 */
export function getChildNodesByType(node: JCRNodeWrapper, nodeType: string): JCRNodeWrapper[] {
	addDirectChildrenCacheDependency(node);
	const children = [...node.getNodes()].filter((n: JCRNodeWrapper) => n.isNodeType(nodeType));
	for (const child of children) {
		addNodeCacheDependency(child);
	}
	return children;
}

/**
 * Returns true when the node carries the given mixin (or node type).
 */
export const hasMixin = (node: JCRNodeWrapper, mixinName: string): boolean =>
	node.isNodeType(mixinName);

/**
 * Extracts a boolean property from a JCR node.
 * Returns the provided fallback value if the property doesn't exist.
 */
export const getAsBoolean = (
	node: JCRNodeWrapper,
	propertyName: string,
	fallback: boolean = false,
): boolean => {
	return node.hasProperty(propertyName) ? node.getProperty(propertyName).getBoolean() : fallback;
};

/**
 * Récupère un nœud de configuration globale depuis le dossier "site-settings"
 * du site courant.
 *
 * **Cache dep** :
 *  - `{ node: settings }` déclarée automatiquement par `getChildNode` en aval.
 *  - `{ flushOnPathMatchingRegexp: sitePath/contents/site-settings/[^/]+$ }` —
 *    couvre la (re)création future du nœud settings.
 */
export const getGlobalSettingsNode = (
	configNodeName: string,
	siteNode?: JCRNodeWrapper,
): JCRNodeWrapper | null => {
	if (!siteNode) {
		const { renderContext } = useServerContext();
		siteNode = renderContext.getSite();
	}
	// Défensif : renderContext.getSite() peut être null/undefined dans certains
	// contextes (tests, requêtes hors site).
	if (!siteNode) return null;

	addDirectChildrenCacheDependency(siteNode, "contents/site-settings");

	const relativePath = `contents/site-settings/${configNodeName}`;
	return getChildNode(siteNode, relativePath);
};

/**
 * Walks up the JCR hierarchy from `node` (inclusive) and returns the closest
 * ancestor matching `nodeType`, or `null` if none is found.
 *
 * **Cache dep** : dépendance déclarée sur l'ancêtre trouvé.
 */
export const findAncestor = (
	node: JCRNodeWrapper,
	nodeType: string = "jnt:page",
): JCRNodeWrapper | null => {
	// Un seul try/catch : il enveloppe les 3 seuls appels susceptibles de lever
	// (`isNodeType`, `getParent`, `addNodeCacheDependency`). Un try externe serait
	// du code mort — l'affectation et la condition du while ne peuvent pas lever.
	let current: JCRNodeWrapper | null = node;
	while (current) {
		try {
			if (current.isNodeType(nodeType)) {
				addNodeCacheDependency(current);
				return current;
			}
			current = current.getParent() as JCRNodeWrapper;
		} catch {
			return null;
		}
	}
	return null;
};

export const getAncestorUrl = (node: JCRNodeWrapper, nodeType: string = "jnt:page"): string => {
	const ancestor = findAncestor(node, nodeType);
	return ancestor ? buildNodeUrl(ancestor) : "";
};

/**
 * Returns the `jnt:page` JCR node owning the current request, or `null` when
 * unresolvable.
 */
export const getCurrentPageNode = (renderContext: RenderContext): JCRNodeWrapper | null => {
	try {
		const main = renderContext.getMainResource().getNode() as JCRNodeWrapper;
		return findAncestor(main, "jnt:page");
	} catch {
		return null;
	}
};

/**
 * Default formatter used by `getDate` — French long form (e.g. "12 mars 2026").
 */
export const DEFAULT_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
	day: "numeric",
	month: "long",
	year: "numeric",
});

/**
 * Formats a date as `yyyy-mm-dd` in the SERVER's calendar, not in UTC.
 *
 * `toISOString()` would convert first: a `2026-02-18T00:00:00+01:00` picked in the
 * Jahia date widget (Europe/Paris) becomes `2026-02-17T23:00:00Z`, i.e. a published
 * date one day earlier than the one rendered on the page. The JCR `Calendar` already
 * carries the timezone the contributor typed in, so the local getters are the ones
 * that round-trip it.
 */
const toLocalIsoDate = (date: Date): string => {
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * Reads a JCR Date property and returns a displayable + ISO (yyyy-mm-dd) pair.
 * Returns empty strings when the property is missing or unreadable.
 */
export const getDate = (
	node: JCRNodeWrapper,
	propertyName: string,
	formatter: Intl.DateTimeFormat = DEFAULT_DATE_FORMATTER,
): { display: string; iso: string } => {
	if (!node.hasProperty(propertyName)) return { display: "", iso: "" };
	try {
		const property = node.getProperty(propertyName) as unknown as {
			getDate(): { getTimeInMillis(): number };
		};
		const millis = property.getDate().getTimeInMillis();
		const date = new Date(millis);
		return {
			display: formatter.format(date),
			iso: toLocalIsoDate(date),
		};
	} catch {
		return { display: "", iso: "" };
	}
};

/**
 * Returns the first child of a given node type, or null if none found.
 *
 * **Cache dep** :
 *  - `{ flushOnPathMatchingRegexp: parent + "/[^/]+$" }` — création ultérieure
 *    d'un child du bon type doit flusher le fragment appelant.
 *  - `{ node: child }` sur le child trouvé.
 */
export const findChildByType = (
	parent: JCRNodeWrapper,
	nodeType: string,
): JCRNodeWrapper | null => {
	addDirectChildrenCacheDependency(parent);
	const iterator = parent.getNodes();
	while (iterator.hasNext()) {
		const child = iterator.nextNode() as JCRNodeWrapper;
		if (child.isNodeType(nodeType)) {
			addNodeCacheDependency(child);
			return child;
		}
	}
	return null;
};

/**
 * Retrieves all children of a wrapper, filtered by an expected node type.
 * Returns an empty array if the wrapper doesn't exist (safe-by-default).
 *
 * Wrapper resolution :
 *  - **By default (no `wrapperName`)** — lookup by TYPE via `findChildByType`.
 *  - **When `wrapperName` is provided** — lookup by NAME via `getChildNode`.
 */
export const getWrapperItems = (
	parent: JCRNodeWrapper,
	wrapperType: string,
	itemType: string,
	wrapperName?: string,
): JCRNodeWrapper[] => {
	// `getChildNode` / `findChildByType` déclarent déjà `{ node: wrapper }`.
	const wrapper = wrapperName
		? getChildNode(parent, wrapperName)
		: findChildByType(parent, wrapperType);
	if (!wrapper) return [];

	// Ajouts / suppressions / réordonnancements d'items sous le wrapper.
	addDirectChildrenCacheDependency(wrapper);

	const items: JCRNodeWrapper[] = [];
	const iterator = wrapper.getNodes();
	while (iterator.hasNext()) {
		const child = iterator.nextNode() as JCRNodeWrapper;
		if (child.isNodeType(itemType)) {
			addNodeCacheDependency(child);
			items.push(child);
		}
	}
	return items;
};
