import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import type { CtaProps } from "sofinco-react";
import { str, getCurrentPageNode, getGlobalSettingsNode, getPropertyAsNode, num } from "#lib/jcr";
import type { TFunction } from "#lib/i18n";

/**
 * Helper pour construire un CTA pointant vers le simulateur Sofinco Vue.js
 * (`/parcours-simulateur` ou `/parcours-simulateur-rac`).
 *
 * Source de vérité unique pour TOUS les composants ayant besoin d'un CTA
 * simulateur (ProductHero, ProductCompare, Hero, TextVideoImage, etc.).
 *
 * Contrat URL piloté par le mixin Jahia `sofmix:simulatorCta` (cf. definitions.cnd).
 * Le simulateur Vue.js attend des noms de query params FIXES — cf.
 * `simulation-initializer.service.ts` du package portal-simulation-beta.
 */

// ============================================================================
// Types
// ============================================================================

export type SimulatorCtaProject = "AUTO" | "FAMILY" | "WORKS" | "MISCELLANEOUS" | "RAC";

export type SimulatorCtaCreditType = "PB" | "CR" | "RAC" | "CR_S";

export interface SimulatorCtaInput {
	project?: SimulatorCtaProject | "";
	subProject?: string;
	/**
	 * Type de crédit prédéfini (lu depuis CND `product`, envoyé en URL sous
	 * `predefinedCreditType` — contrat fixé par le simulateur Vue.js).
	 */
	predefinedCreditType?: SimulatorCtaCreditType | "";
	sourceId?: string;
	loa?: "true" | "false" | "";
	idcatorigin?: string;
	/** Hash route override. Si vide, le helper calcule automatiquement. */
	hashFragment?: string;
}

export interface SimulatorCtaBuildOptions {
	/** Tracking section (passé au composant DS `<Cta>`). */
	ctaSection?: string;
	/** Variant visuel du bouton DS. Default: "accent". */
	variant?: CtaProps["variant"];
	/** Override force le hash quel que soit l'input. Priorité sur `hashFragment`. */
	forceHash?: string;
}

// ============================================================================
// Routes Vue.js (synchronisé avec portal-simulation-beta/src/constants/routes.ts)
// ============================================================================

/** Hash routes du simulateur Vue.js — strict mirror de `RoutePath`. */
export const SIMULATOR_HASH = {
	PROJECTS: "/",
	WORKS: "/travaux",
	FAMILY: "/famille-loisirs",
	AUTO: "/auto",
	MISCELLANEOUS: "/autre",
	FUNDING_AMOUNT: "/montant-financement",
	PAYMENT_FORM: "/mensualite",
	RESULTS: "/resultats",
	RAC: "/rachat/nombre-credits",
} as const;

/**
 * Fallback hardcodés si le settings node `simulator-config` est absent ou si
 * les pickers ne sont pas configurés. Garantit que le CTA reste fonctionnel
 * même sur un environnement fraîchement déployé (avant exécution du Groovy
 * init-simulator-settings.groovy).
 */
const SIMULATOR_FALLBACK_PATH = "/parcours-simulateur";
const SIMULATOR_RAC_FALLBACK_PATH = "/parcours-simulateur-rac";

const SIMULATOR_CONFIG_PATH = "simulator-config";

const AMOUNT_MIN_FALLBACK = 150;
const AMOUNT_MAX_FALLBACK = 999999;

// ============================================================================
// Décision base path (PB/CR vs RAC)
// ============================================================================

/**
 * Résout l'URL des pages Jahia hébergeant le simulateur Vue.js.
 *
 * Ordre de priorité :
 *   1. Picker configuré dans le settings node `sofnt:simulatorConfig`
 *      (`/sites/sofinco/contents/site-settings/simulator-config`) → buildNodeUrl
 *   2. Fallback hardcodé `/parcours-simulateur(-rac)` si config absente
 *      (sécurité déploiement initial, avant exécution du Groovy bootstrap)
 *
 * Le branchement RAC se fait sur project OU predefinedCreditType === "RAC"
 * (compatibilité avec checkForRac() du simulateur Vue.js).
 */
export function resolveSimulatorBasePath(input: SimulatorCtaInput): string {
	const isRac = input.project === "RAC" || input.predefinedCreditType === "RAC";
	const pickerProp = isRac ? "simulatorRacBasePage" : "simulatorBasePage";
	const fallback = isRac ? SIMULATOR_RAC_FALLBACK_PATH : SIMULATOR_FALLBACK_PATH;

	const configNode = getGlobalSettingsNode(SIMULATOR_CONFIG_PATH);
	if (!configNode) return fallback;

	const pageNode = getPropertyAsNode(configNode, pickerProp);
	if (!pageNode) return fallback;

	try {
		return buildNodeUrl(pageNode) || fallback;
	} catch {
		return fallback;
	}
}

// ============================================================================
// Décision hash route (reproduit resumeSimulator() du Vue router)
// ============================================================================

/**
 * Calcule le hash route initial du simulateur en reproduisant la logique de
 * `resumeSimulator()` (cf. portal-simulation-beta/src/services/simulation-initializer.service.ts).
 *
 * Permet d'ANTICIPER la route côté SSR → URL canonique stable, zéro flash.
 * Si le simulateur Vue.js ajoute une route, mettre à jour cette fonction
 * + ajouter une fixture dans simulatorCta.test.ts.
 */
export function resolveSimulatorHash(input: SimulatorCtaInput): string {
	// 1. RAC — toujours #/rachat/nombre-credits
	if (input.project === "RAC" || input.predefinedCreditType === "RAC") {
		return `#${SIMULATOR_HASH.RAC}`;
	}

	// 2. Pas de project → reste sur la home du simulateur (sélection projet)
	if (!input.project) {
		return `#${SIMULATOR_HASH.PROJECTS}`;
	}

	// 3. Project seul (pas de subProject) → page de catégorie
	if (!input.subProject) {
		switch (input.project) {
			case "AUTO":
				return `#${SIMULATOR_HASH.AUTO}`;
			case "FAMILY":
				return `#${SIMULATOR_HASH.FAMILY}`;
			case "WORKS":
				return `#${SIMULATOR_HASH.WORKS}`;
			case "MISCELLANEOUS":
				return `#${SIMULATOR_HASH.MISCELLANEOUS}`;
			default:
				return `#${SIMULATOR_HASH.PROJECTS}`;
		}
	}

	// 4. Project + subProject : route directe vers le montant financement
	// (le mixin ne porte plus amount/duration → l'utilisateur saisira sur cette
	// étape ; les composants qui veulent pré-remplir le font via override URL
	// runtime ou via le forceHash sur le builder).
	return `#${SIMULATOR_HASH.FUNDING_AMOUNT}`;
}

// ============================================================================
// Builder URL
// ============================================================================

/**
 * Construit l'URL complète du simulateur depuis un input typé.
 *
 * URL canonique : `{basePath}?{params}#{hash}`
 *
 * Renommage CND → URL :
 *   - CND `product` (champ Jahia) → URL `predefinedCreditType` (contrat simulateur)
 *
 * Cas spécial RAC : hardcode `project=RAC&subProject=RAC_RAC&creditType=PB`
 * (le simulateur détecte RAC via `creditType === "PB"` + `project === "RAC"` +
 * `sourceId` présent — cf. checkForRac() du Vue router).
 *
 * Note : `amount`, `duration`, `creditTypeFixed`, `classicSubscription` ne sont
 * plus dans le mixin. Si un cas avancé veut pré-remplir, passer par l'override
 * URL runtime (?amount=, etc.) via le bootstrap Island.
 */
export function buildSimulatorCtaUrl(
	input: SimulatorCtaInput,
	opts: { forceHash?: string } = {},
): string {
	const basePath = resolveSimulatorBasePath(input);
	const isRac = input.project === "RAC" || input.predefinedCreditType === "RAC";

	const parts: string[] = [];
	const addParam = (key: string, value: string | undefined | null): void => {
		if (value === undefined || value === null || value === "") return;
		parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
	};

	if (isRac) {
		// RAC : hardcode strict — le simulateur détecte RAC via cette combinaison.
		addParam("sourceId", input.sourceId);
		addParam("project", "RAC");
		addParam("subProject", "RAC_RAC");
		addParam("creditType", "PB");
	} else {
		// Ordre params aligné sur les URLs PROD legacy launchSimulator.
		addParam("idcatorigin", input.idcatorigin);
		addParam("project", input.project);
		addParam("subProject", input.subProject);
		addParam("predefinedCreditType", input.predefinedCreditType);
		addParam("sourceId", input.sourceId);
		addParam("loa", input.loa);
	}

	const queryString = parts.join("&");
	const baseWithQuery = queryString ? `${basePath}?${queryString}` : basePath;

	// Hash route — override > input.hashFragment > auto-calculé
	const hash = opts.forceHash || input.hashFragment || resolveSimulatorHash(input);
	const normalizedHash = hash.charAt(0) === "#" ? hash : `#${hash}`;
	return `${baseWithQuery}${normalizedHash}`;
}

// ============================================================================
// Bridge JCR → input + factory CtaProps (entrée publique principale)
// ============================================================================

/**
 * Lit les propriétés `sim*` du mixin `sofmix:simulatorCta` (ou du type node
 * `sofnt:simulatorCta`) attaché au `node`, complète avec le mixin page
 * `spmix:eaPageOptions.idcat` pour `idcatorigin` (fallback), et produit un
 * objet `SimulatorCtaInput` typé.
 *
 * Convention : si `simIdcatorigin` du CTA est vide, on tombe sur l'idcat de
 * la page courante (lue via `getCurrentPageNode`). Ainsi le contributeur
 * n'a pas à dupliquer la valeur sur chaque CTA d'une même page.
 */
export function mapSimulatorCtaInput(
	node: JCRNodeWrapper,
	renderContext: RenderContext,
): SimulatorCtaInput {
	/*
	 * CASCADE « CTA > PAGE » — une seule lecture de la page pour les trois propriétés.
	 *
	 * Convention historique du module, posée pour `idcatorigin` : une valeur laissée vide sur
	 * le CTA retombe sur celle de la page, pour que le contributeur n'ait pas à la dupliquer
	 * sur chaque CTA. Elle est ici étendue au type de crédit et au sourceId, désormais portés
	 * par `sofmix:simulationParams` (cf. settings/definitions.cnd).
	 *
	 * ⚠️ Les noms diffèrent de part et d'autre, et ce n'est pas une incohérence à « corriger » :
	 *   - côté CTA  (sofmix:simulatorCta)     : `product`,    `sourceId`,    `simIdcatorigin`
	 *   - côté page (sofmix:simulationParams) : `simProduct`, `simSourceId`, (eaPageOptions) `idcat`
	 * Le préfixe `sim*` est obligatoire côté page : jnt:page accumule les mixins de plusieurs
	 * modules et un nom court y entrerait en collision.
	 */
	const pageNode = getCurrentPageNode(renderContext);

	const fromPage = (property: string): string => (pageNode ? str(pageNode, property) : "");

	const idcatorigin = str(node, "simIdcatorigin") || fromPage("idcat");
	const predefinedCreditType = str(node, "product") || fromPage("simProduct");
	const sourceId = str(node, "sourceId") || fromPage("simSourceId");

	const loaRaw = str(node, "simLoa");

	return {
		project: (str(node, "simProject") || "") as SimulatorCtaProject | "",
		subProject: str(node, "simSubProject") || undefined,
		// CND `product` (renommé depuis `simPredefinedCreditType`) → input.predefinedCreditType
		predefinedCreditType: (predefinedCreditType || "") as SimulatorCtaCreditType | "",
		// CND `sourceId` (renommé depuis `simSourceId`) → input.sourceId
		sourceId: sourceId || undefined,
		loa: loaRaw === "true" || loaRaw === "false" ? loaRaw : "",
		idcatorigin: idcatorigin || undefined,
		hashFragment: str(node, "simHashFragment") || undefined,
	};
}

/**
 * Entrée publique principale : depuis un node Jahia portant le mixin (ou un
 * `sofnt:simulatorCta`), produit les `CtaProps` prêts à passer au composant
 * DS `<Cta>`.
 *
 * Retourne TOUJOURS un `CtaProps` : sans project ni sourceId le CTA retombe sur
 * la home du simulateur (`#/`) avec le libellé par défaut — cf. les cas couverts
 * dans `simulatorCta.test.ts`. Le type de retour reste `CtaProps | null` pour que
 * les appelants gardent un accès défensif (`?.`), mais aucun chemin ne renvoie
 * `null` aujourd'hui.
 *
 * Les `CtaProps.props` portent l'attribut `data-simulator-cta="true"` qui
 * permet au bootstrap Island (cf. `simulatorCta-bootstrap.ts`) d'intercepter
 * les clics et d'injecter les overrides runtime (?j7, ?amount, mfactoryid).
 */
export function buildSimulatorCtaFromNode(
	node: JCRNodeWrapper,
	renderContext: RenderContext,
	t: TFunction,
	opts: SimulatorCtaBuildOptions = {},
): CtaProps | null {
	const input = mapSimulatorCtaInput(node, renderContext);

	const href = buildSimulatorCtaUrl(input, { forceHash: opts.forceHash });
	const label = str(node, "ctaLabel") || t("simulatorCta.defaultLabel");

	return {
		label,
		href,
		target: "_self",
		ctaSection: opts.ctaSection ?? "simulator",
		variant: opts.variant ?? "accent",
		props: {
			// Marqueur consommé par simulatorCta-bootstrap.ts pour l'enrichissement
			// runtime (overrides query + mfactoryid WEM A/B).
			"data-simulator-cta": "true",
		} as unknown as CtaProps["props"],
	};
}

/**
 * Résout amountMin/amountMax en suivant la cascade settings-node → defaults.
 * Exporté pour réutilisation éventuelle et testabilité.
 */
export function resolveAmountBounds(): {
	amountMin: number;
	amountMax: number;
} {
	const configNode = getGlobalSettingsNode(SIMULATOR_CONFIG_PATH);

	const min = configNode ? num(configNode, "amountMin", AMOUNT_MIN_FALLBACK) : AMOUNT_MIN_FALLBACK;
	const max = configNode ? num(configNode, "amountMax", AMOUNT_MAX_FALLBACK) : AMOUNT_MAX_FALLBACK;

	return {
		amountMin: min,
		amountMax: max,
	};
}

/**
 * Lit le mixin `sofmix:simulatorAmount` d'un nœud : bornes + messages d'erreur
 * du champ montant, dans la forme attendue par les composants React.
 *
 * Cascade des bornes : propriété du nœud → settings node global
 * (`resolveAmountBounds`) → défauts 150/999999. Un contributeur qui laisse les
 * champs vides hérite donc de la configuration globale.
 *
 * Le placeholder et les messages absents sont renvoyés `undefined` (et non `""`)
 * pour laisser `<SimulatorForm>` (sofinco-react) appliquer ses propres défauts —
 * une seule source de vérité pour les libellés.
 */
export function resolveSimulatorAmountOptions(node: JCRNodeWrapper): {
	amountPlaceholder?: string;
	amountMin: number;
	amountMax: number;
	requiredErrorMessage?: string;
	minErrorMessage?: string;
	maxErrorMessage?: string;
} {
	const bounds = resolveAmountBounds();

	let amountMin = num(node, "amountMin", bounds.amountMin);
	let amountMax = num(node, "amountMax", bounds.amountMax);
	// Inversion contributeur (min > max) : sans réordonnancement, aucune valeur ne
	// satisferait le champ et le formulaire resterait silencieusement non soumettable.
	if (amountMin > amountMax) [amountMin, amountMax] = [amountMax, amountMin];

	return {
		amountPlaceholder: str(node, "amountPlaceholder") || undefined,
		amountMin,
		amountMax,
		requiredErrorMessage: str(node, "requiredErrorMessage") || undefined,
		minErrorMessage: str(node, "minErrorMessage") || undefined,
		maxErrorMessage: str(node, "maxErrorMessage") || undefined,
	};
}
