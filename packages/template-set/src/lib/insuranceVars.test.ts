import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { JCRNodeWrapper } from "org.jahia.services.content";
// Non mocké : `insuranceVars` réutilise le repère posé par `str()` via ce registre, plutôt
// que de recapturer le composant courant de son côté.
import { startFootnoteCollection, setFootnoteLocation } from "./footnoteCollector";

/*
 * `insuranceVars` est volontairement sans dépendance sur `#lib/jcr` (cycle : jcr → insuranceVars).
 * Ses seules portes vers l'extérieur sont donc mockées ici :
 *   - `server.osgi.getService` / `useServerContext` (moteur Jahia) ;
 *   - `getRequestAttribute` (attribut posé par le filtre sofinco-core).
 */
const { getService, mainResourceNode, getRequestAttribute, requestAttributes } = vi.hoisted(() => ({
	getService: vi.fn(),
	mainResourceNode: { current: null as JCRNodeWrapper | null },
	getRequestAttribute: vi.fn(),
	/*
	 * Les attributs de requête sont un VRAI magasin, pas une valeur figée : le repli bridge y
	 * mémorise son record pour la durée de la requête. Un mock en lecture seule ne verrait pas
	 * cette écriture et ferait croire à une résolution par consommateur.
	 */
	requestAttributes: new Map<string, unknown>(),
}));

vi.mock("@jahia/javascript-modules-library", () => ({
	server: { osgi: { getService } },
	useServerContext: () => ({
		renderContext: {
			getMainResource: () => ({ getNode: () => mainResourceNode.current }),
			getRequest: () => ({
				getAttribute: (name: string) => requestAttributes.get(name) ?? null,
				setAttribute: (name: string, value: unknown) => {
					requestAttributes.set(name, value);
				},
			}),
		},
	}),
}));

vi.mock("./renderContext", () => ({ getRequestAttribute }));

import {
	startInsuranceVars,
	stopInsuranceVars,
	substituteInsuranceVars,
	readSimulationRecord,
	collectUnknownInsuranceVars,
	readUnresolvedInsuranceVars,
	buildInsuranceVarMap,
	INSURANCE_VAR_TOKENS,
	SIMULATION_REQUEST_ATTRIBUTE,
	CAMPAIGN_REQUEST_ATTRIBUTE,
	CAMPAIGN_VAR_TOKENS,
	SIMULATION_PARAMS_MIXIN,
} from "./insuranceVars";

/* ──────────────────────────────────────────────────────────────────────────
   Fixtures
   ────────────────────────────────────────────────────────────────────────── */

/** Nœud JCR minimal : juste ce que `insuranceVars` lit réellement. */
function pageNode({
	mixin = true,
	product = "CR",
	sourceId = "",
	parent = null as JCRNodeWrapper | null,
	isPage = true,
}: {
	mixin?: boolean;
	product?: string;
	/** Provenance — precondition de la famille CAMPAGNE, independante du produit. */
	sourceId?: string;
	parent?: JCRNodeWrapper | null;
	isPage?: boolean;
} = {}) {
	const props: Record<string, string> = product ? { simProduct: product } : {};
	if (sourceId) props.simSourceId = sourceId;
	return {
		isNodeType: (type: string) =>
			(type === "jnt:page" && isPage) || (type === SIMULATION_PARAMS_MIXIN && mixin),
		hasProperty: (name: string) => name in props,
		getProperty: (name: string) => ({ getString: () => props[name] }),
		getParent: () => parent,
	} as unknown as JCRNodeWrapper;
}

/**
 * `JavaRecord` tel que renvoyé par `RepresentativeExampleBridge.getExample` — jeu COMPLET,
 * volet hors assurance compris (cf. `RepresentativeExampleMapper.buildInsuranceMap`).
 */
const RECORD = {
	exampleAmount: "3 000 €",
	insurance: {
		taeg: "21,150 %",
		debitRate: "19,500 %",
		monthlyWithoutInsurance: "87,80 €",
		lastWithoutInsurance: "87,65 €",
		totalWithoutInsurance: "3 160,80 €",
		totalWithInsurance: "3 322,80 €",
		monthlyAmount: "4,50 €",
		firstMonthlyAmount: "5,10 €",
		taea: "1,20 %",
		totalInsuranceCost: "162,00 €",
		monthlyWithInsurance: "92,30 €",
		lastWithInsurance: "92,15 €",
		dueNumber: "36",
		dueNumberMinusOne: "35",
	},
};

/**
 * Campagne telle que renvoyée par le pont, jetons DÉJÀ formatés côté Java.
 *
 * Valeurs de la vraie réponse de production sur `NEOURL41` : un jeu inventé ne dirait rien du
 * formatage réellement attendu dans une mention légale.
 */
const CAMPAIGN: Record<string, string> = {
	minAmount: "3 001 €",
	maxAmount: "75 000 €",
	minDuration: "12",
	maxDuration: "120",
	minAnnualDebitRate: "4,314 %",
	maxAnnualDebitRate: "14,628 %",
	minAnnualGlobalEffectiveRate: "4,400 %",
	maxAnnualGlobalEffectiveRate: "15,650 %",
	promoGlobalEffectiveRate: "4,900 %",
	startDate: "25/09/2017",
	endDate: "26/08/2026",
};

beforeEach(() => {
	getService.mockReset();
	requestAttributes.clear();
	// Par défaut, la lecture d'attribut reflète le magasin — donc aussi ce que le repli y écrit.
	getRequestAttribute
		.mockReset()
		.mockImplementation((name: string) => requestAttributes.get(name) ?? null);
	mainResourceNode.current = null;
	stopInsuranceVars();
});

/* ──────────────────────────────────────────────────────────────────────────
   Inertie
   ────────────────────────────────────────────────────────────────────────── */

describe("inertie", () => {
	it("registre non armé → texte inchangé, aucune résolution tentée", () => {
		expect(substituteInsuranceVars("TAEA {{taea}}")).toBe("TAEA {{taea}}");
		expect(getRequestAttribute).not.toHaveBeenCalled();
		expect(getService).not.toHaveBeenCalled();
	});

	it("texte sans jeton → aucune résolution, même armé", () => {
		startInsuranceVars();
		expect(substituteInsuranceVars("Un texte parfaitement ordinaire.")).toBe(
			"Un texte parfaitement ordinaire.",
		);
		expect(getRequestAttribute).not.toHaveBeenCalled();
		expect(getService).not.toHaveBeenCalled();
	});

	it.each(["", "   "])("texte vide ou blanc → inchangé (%j)", (input) => {
		startInsuranceVars();
		expect(substituteInsuranceVars(input)).toBe(input);
	});
});

/* ──────────────────────────────────────────────────────────────────────────
   Résolution via l'attribut de requête (filtre Java — cible)
   ────────────────────────────────────────────────────────────────────────── */

describe("résolution via le filtre sofinco-core", () => {
	beforeEach(() => {
		getRequestAttribute.mockReturnValue(RECORD);
		startInsuranceVars();
	});

	it("lit l'attribut de requête attendu", () => {
		substituteInsuranceVars("{{taea}}");
		expect(getRequestAttribute).toHaveBeenCalledWith(SIMULATION_REQUEST_ATTRIBUTE);
	});

	it("substitue tous les jetons canoniques", () => {
		expect(substituteInsuranceVars("{{exampleAmount}}")).toBe("3 000 €");
		expect(substituteInsuranceVars("{{dueNumber}}")).toBe("36");
		expect(substituteInsuranceVars("{{dueNumberMinusOne}}")).toBe("35");
		// Hors assurance
		expect(substituteInsuranceVars("{{taeg}}")).toBe("21,150 %");
		expect(substituteInsuranceVars("{{debitRate}}")).toBe("19,500 %");
		expect(substituteInsuranceVars("{{monthlyWithoutInsurance}}")).toBe("87,80 €");
		expect(substituteInsuranceVars("{{lastWithoutInsurance}}")).toBe("87,65 €");
		expect(substituteInsuranceVars("{{totalWithoutInsurance}}")).toBe("3 160,80 €");
		// Assurance
		expect(substituteInsuranceVars("{{taea}}")).toBe("1,20 %");
		expect(substituteInsuranceVars("{{monthlyAmount}}")).toBe("4,50 €");
		expect(substituteInsuranceVars("{{firstMonthlyAmount}}")).toBe("5,10 €");
		expect(substituteInsuranceVars("{{totalInsuranceCost}}")).toBe("162,00 €");
		expect(substituteInsuranceVars("{{monthlyWithInsurance}}")).toBe("92,30 €");
		expect(substituteInsuranceVars("{{lastWithInsurance}}")).toBe("92,15 €");
		expect(substituteInsuranceVars("{{totalWithInsurance}}")).toBe("3 322,80 €");
	});

	/*
	 * Vocabulaire de l'ancien site, relevé dans `exempleCr` du simulateur Vue
	 * (sofinco_project/portal-simulation/.../message.json). Ces jetons figurent dans des
	 * mentions déjà publiées : sans ces alias, une reprise de contenu les afficherait bruts.
	 */
	it("résout les alias hors assurance de l'ancien site", () => {
		expect(substituteInsuranceVars("{{annualDebitRate}}")).toBe("19,500 %");
		expect(substituteInsuranceVars("{{monthlyAmountNonInsurance}}")).toBe("87,80 €");
		expect(substituteInsuranceVars("{{lastMonthlyAmountNonInsurance}}")).toBe("87,65 €");
		expect(substituteInsuranceVars("{{totalAmountNonInsurance}}")).toBe("3 160,80 €");
	});

	/** La phrase `exempleCr` de l'ancien site doit se résoudre intégralement. */
	it("résout la mention legacy complète, sans jeton résiduel", () => {
		const legacy =
			"vous remboursez {dueNumberMinus1} mensualités de {monthlyAmountNonInsurance} et une " +
			"{dueNumber}ème ajustée de {lastMonthlyAmountNonInsurance} hors assurance facultative. " +
			"Montant total dû de {totalAmountNonInsurance}. TAEG révisable de {taeg}. Taux débiteur " +
			"révisable de {annualDebitRate}. La première prime la plus élevée est de " +
			"{firstMonthlyInsuranceAmountT1}. En cas d'adhésion, {dueNumberMinus1} mensualités de " +
			"{monthlyAmountWitInsurance} et une dernière ajustée de {lastMonthlyAmountWithInsurance}. " +
			"Le TAEA est de {insuranceRate}. Le montant total dû au titre de l'assurance est de " +
			"{totalInsuranceAmountT1}.";

		expect(substituteInsuranceVars(legacy)).not.toMatch(/\{\{?\w+\}?\}/);
	});

	it("le service OSGi n'est jamais appelé quand le filtre a fourni la donnée", () => {
		substituteInsuranceVars("{{taea}}");
		expect(getService).not.toHaveBeenCalled();
	});

	it("substitue plusieurs jetons dans une même phrase", () => {
		expect(
			substituteInsuranceVars(
				"{{dueNumberMinusOne}} x {{monthlyWithInsurance}} puis {{lastWithInsurance}}, TAEA {{taea}}.",
			),
		).toBe("35 x 92,30 € puis 92,15 €, TAEA 1,20 %.");
	});

	it("accepte la forme à une seule accolade (contenu legacy)", () => {
		expect(substituteInsuranceVars("TAEA {taea}")).toBe("TAEA 1,20 %");
	});

	/*
	 * JETONS RÉSERVÉS — ceux d'autres moteurs de gabarit du site.
	 *
	 * `str()` applique la substitution à toute propriété chaîne : elle croise donc les `{min}` /
	 * `{max}` des messages d'erreur du champ montant, et le motif d'URL de Jahia lui-même
	 * — `/cms/{mode}/{workspace}/{lang}/…` — qu'un lien interne inséré dans un richtext suffit
	 * à faire apparaître. Aucun des deux ne lui appartient.
	 */
	it("laisse intacts les jetons d'autres moteurs, sans les signaler", () => {
		// Le motif exact que Jahia stocke dans un lien interne et ne resout qu'au rendu.
		const lienJahia =
			'Voir <a href="/cms/{mode}/{workspace}/{lang}/sites/sofinco/x.html">la page</a>.';
		const bornes = "Le montant minimum est de {min}€, le maximum de {max}€.";

		expect(substituteInsuranceVars(lienJahia)).toBe(lienJahia);
		expect(substituteInsuranceVars(bornes)).toBe(bornes);
		// Le panneau d'audit ne doit rien annoncer : ces contenus sont corrects.
		expect(readUnresolvedInsuranceVars()).toEqual([]);
	});

	/*
	 * LA FORME OBSERVÉE EN RECETTE est en DOUBLES accolades, alors que le motif d'URL documenté
	 * de Jahia n'en porte qu'une. La garde porte sur le NOM du jeton, pas sur le nombre
	 * d'accolades : les deux formes doivent ressortir intactes, sinon le correctif ne couvre pas
	 * le cas qui l'a motivé.
	 */
	it("couvre les deux formes d'accolades d'un lien interne", () => {
		const doubles = 'Voir <a href="/cms/{{mode}}/{{workspace}}/{{lang}}/sites/x.html">la page</a>.';

		expect(substituteInsuranceVars(doubles)).toBe(doubles);
		expect(readUnresolvedInsuranceVars()).toEqual([]);
	});

	/*
	 * Une mention légale qui cite un lien interne ET une variable de simulation : les deux
	 * syntaxes cohabitent dans le MÊME champ. C'est le cas que le périmètre des champs audités
	 * ne pourrait pas trancher — la mention est justement un champ où les variables sont
	 * légitimes — et qui rend cette liste nécessaire en plus de lui.
	 */
	it("distingue les deux syntaxes à l'intérieur d'un même texte", () => {
		const mention =
			'TAEA {{taea}} — voir <a href="/cms/{mode}/{workspace}/{lang}/sites/x.html">conditions</a>.';

		expect(substituteInsuranceVars(mention)).toBe(
			'TAEA 1,20 % — voir <a href="/cms/{mode}/{workspace}/{lang}/sites/x.html">conditions</a>.',
		);
		expect(readUnresolvedInsuranceVars()).toEqual([]);
	});

	/*
	 * L'effet le plus important, et le seul qu'un test peut verrouiller durablement.
	 *
	 * `buildInsuranceVarMap` reprend TOUTES les clés du record renvoyé par le bridge — c'est ce
	 * qui permet d'ajouter une variable côté Java sans toucher au TypeScript. Sans la garde, une
	 * clé `lang` émise un jour par le mapper réécrirait l'URL Smart Tribune, silencieusement.
	 */
	it("ne substitue pas un jeton réservé, même si le bridge produit une valeur de ce nom", () => {
		getRequestAttribute.mockReturnValue({
			insurance: { lang: "fr-FR", workspace: "live", min: "150", taea: "1,20 %" },
		});
		startInsuranceVars();

		expect(substituteInsuranceVars("/{workspace}/{lang}/x")).toBe("/{workspace}/{lang}/x");
		expect(substituteInsuranceVars("min {min}")).toBe("min {min}");
		// La substitution ordinaire reste intacte.
		expect(substituteInsuranceVars("{{taea}}")).toBe("1,20 %");
	});

	/*
	 * MENTION D'ASSURANCE RÉELLE, telle que contribuée en production.
	 *
	 * Les tests ci-dessus vérifient des jetons isolés ; celui-ci vérifie la phrase que le
	 * contributeur écrit vraiment, avec ce qui l'entoure et qui doit rester intact :
	 *
	 *   - `((6))` — renvoi de note. `substituteInsuranceVars` ne doit PAS y toucher : c'est
	 *     `str()` qui le transforme en exposant, APRÈS la substitution (cf. jcr.ts). Une
	 *     expression trop gourmande ici le mangerait, et le renvoi disparaîtrait de la mention
	 *     légale sans rien casser de visible — le pire mode de panne.
	 *   - Les unités `€` et `%`, les décimales à la virgule et l'espace fine insécable des
	 *     montants : ils viennent du bridge, pas du gabarit, et doivent traverser tels quels.
	 *   - L'apostrophe typographique de « l'assurance », qui n'est pas celle de « l'assurance
	 *     emprunteur » dans la même phrase — le contenu réel mélange les deux.
	 */
	it("résout une mention d'assurance de production sans abîmer ce qui l'entoure", () => {
		getRequestAttribute.mockReturnValue({
			insurance: {
				monthlyAmount: "15,75 €",
				taea: "2,421 %",
				totalInsuranceCost: "756,00 €",
			},
		});
		startInsuranceVars();

		// Littéral gabarit : le saut de paragraphe est écrit tel quel, comme dans le richtext.
		const mention = `Nous vous proposons de souscrire l'assurance emprunteur facultative((6)) pour {{monthlyAmount}} supplémentaires par mois.

Le Taux Annuel Effectif de l'Assurance (TAEA) est de {{taea}}. Le montant total dû au titre de l'assurance est de {{totalInsuranceCost}}. Le coût de l’assurance peut varier en fonction de votre situation personnelle.`;

		expect(substituteInsuranceVars(mention)).toBe(
			`Nous vous proposons de souscrire l'assurance emprunteur facultative((6)) pour 15,75 € supplémentaires par mois.

Le Taux Annuel Effectif de l'Assurance (TAEA) est de 2,421 %. Le montant total dû au titre de l'assurance est de 756,00 €. Le coût de l’assurance peut varier en fonction de votre situation personnelle.`,
		);
	});

	/*
	 * Le pendant du test précédent : la même mention sur une page dont la simulation ne renvoie
	 * rien. Aucun trou dans la phrase — « pour  supplémentaires par mois » se lirait comme un
	 * défaut de rédaction et passerait la relecture. Le jeton visible, non.
	 */
	it("laisse la mention de production lisible quand aucune valeur n'est disponible", () => {
		getRequestAttribute.mockReturnValue({ insurance: {} });
		startInsuranceVars();

		const result = substituteInsuranceVars(
			"pour {{monthlyAmount}} supplémentaires par mois, TAEA {{taea}}.",
		);

		expect(result).toBe("pour {{monthlyAmount}} supplémentaires par mois, TAEA {{taea}}.");
		expect(readUnresolvedInsuranceVars()).toMatchObject([
			{ token: "monthlyAmount", reason: "no-data" },
			{ token: "taea", reason: "no-data" },
		]);
	});

	it("résout les alias legacy sans les exposer comme jetons canoniques", () => {
		expect(substituteInsuranceVars("{{insuranceRate}}")).toBe("1,20 %");
		expect(substituteInsuranceVars("{{totalInsuranceAmountT1}}")).toBe("162,00 €");
		expect(substituteInsuranceVars("{{monthlyAmountWitInsurance}}")).toBe("92,30 €");
		expect(INSURANCE_VAR_TOKENS).not.toContain("insuranceRate");
	});

	/*
	 * « La première prime est la plus élevée soit X » — l'alias porte « first » dans son nom et
	 * doit résoudre la PREMIÈRE prime, pas la courante. Le record de test les distingue
	 * volontairement (5,10 € contre 4,50 €) : avec des valeurs égales, ce test ne prouverait rien.
	 */
	it("l'alias de la première prime ne résout pas la prime courante", () => {
		expect(substituteInsuranceVars("{{firstMonthlyInsuranceAmountT1}}")).toBe("5,10 €");
		expect(substituteInsuranceVars("{{monthlyInsuranceAmountT1}}")).toBe("4,50 €");
	});

	/*
	 * La table de jetons est mémorisée sur l'IDENTITÉ du record, plus sur un drapeau de module —
	 * lequel survivait d'une requête à l'autre dans le pool de contextes GraalVM. Le nombre de
	 * lectures de l'attribut n'est donc plus le contrat : le « un seul calcul par requête » est
	 * garanti par le porteur paresseux côté Java.
	 */
	it("ne reconstruit pas la table tant que le record est le même objet", () => {
		const live = { insurance: { taea: "1,20 %" } };
		getRequestAttribute.mockReturnValue(live);
		startInsuranceVars();

		expect(substituteInsuranceVars("{{taea}}")).toBe("1,20 %");
		live.insurance.taea = "9,99 %"; // même objet : la table n'est pas rebâtie
		expect(substituteInsuranceVars("{{taea}}")).toBe("1,20 %");
	});

	it("un record d'identité différente reconstruit la table", () => {
		getRequestAttribute.mockReturnValue({ insurance: { taea: "1,20 %" } });
		startInsuranceVars();
		expect(substituteInsuranceVars("{{taea}}")).toBe("1,20 %");

		getRequestAttribute.mockReturnValue({ insurance: { taea: "9,99 %" } });
		expect(substituteInsuranceVars("{{taea}}")).toBe("9,99 %");
	});

	it("startInsuranceVars réarme : nouvelle page → nouvelle résolution", () => {
		substituteInsuranceVars("{{taea}}");
		const before = getRequestAttribute.mock.calls.length;
		startInsuranceVars();
		substituteInsuranceVars("{{taea}}");
		expect(getRequestAttribute.mock.calls.length).toBeGreaterThan(before);
	});
});

/* ──────────────────────────────────────────────────────────────────────────
   Repli sur le bridge OSGi (avant déploiement du filtre)
   ────────────────────────────────────────────────────────────────────────── */

describe("repli sur le bridge OSGi", () => {
	it("page avec mixin et produit → appelle le bridge avec le nœud PAGE", () => {
		const page = pageNode();
		mainResourceNode.current = page;
		const getExample = vi.fn(() => RECORD);
		getService.mockReturnValue({ getExample });
		startInsuranceVars();

		expect(substituteInsuranceVars("{{taea}}")).toBe("1,20 %");
		expect(getExample).toHaveBeenCalledWith(page);
	});

	it("remonte du contenu vers la page englobante", () => {
		const page = pageNode();
		const content = {
			isNodeType: () => false,
			hasProperty: () => false,
			getProperty: () => ({ getString: () => "" }),
			getParent: () => page,
		} as unknown as JCRNodeWrapper;
		mainResourceNode.current = content;
		const getExample = vi.fn(() => RECORD);
		getService.mockReturnValue({ getExample });
		startInsuranceVars();

		expect(substituteInsuranceVars("{{taea}}")).toBe("1,20 %");
		expect(getExample).toHaveBeenCalledWith(page);
	});
});

/* ──────────────────────────────────────────────────────────────────────────
   Cas non résolus — le jeton reste VISIBLE, jamais remplacé par du vide
   ────────────────────────────────────────────────────────────────────────── */

describe("jetons non résolus", () => {
	it("page sans le mixin → jeton laissé brut, diagnostic « no-params »", () => {
		mainResourceNode.current = pageNode({ mixin: false });
		startInsuranceVars();

		expect(substituteInsuranceVars("TAEA {{taea}}")).toBe("TAEA {{taea}}");
		expect(readUnresolvedInsuranceVars()).toMatchObject([{ token: "taea", reason: "no-params" }]);
		expect(getService).not.toHaveBeenCalled();
	});

	it("mixin activé mais simProduct vide → « no-product », bridge jamais appelé", () => {
		mainResourceNode.current = pageNode({ product: "" });
		startInsuranceVars();

		expect(substituteInsuranceVars("{{taea}}")).toBe("{{taea}}");
		expect(readUnresolvedInsuranceVars()).toMatchObject([{ token: "taea", reason: "no-product" }]);
		expect(getService).not.toHaveBeenCalled();
	});

	it("bridge absent → « no-data »", () => {
		mainResourceNode.current = pageNode();
		getService.mockReturnValue(null);
		startInsuranceVars();

		expect(substituteInsuranceVars("{{taea}}")).toBe("{{taea}}");
		expect(readUnresolvedInsuranceVars()).toMatchObject([{ token: "taea", reason: "no-data" }]);
	});

	it("bridge qui lève → « no-data », aucune exception propagée", () => {
		mainResourceNode.current = pageNode();
		getService.mockImplementation(() => {
			throw new Error("OSGi indisponible");
		});
		startInsuranceVars();

		expect(substituteInsuranceVars("{{taea}}")).toBe("{{taea}}");
		expect(readUnresolvedInsuranceVars()).toMatchObject([{ token: "taea", reason: "no-data" }]);
	});

	it("jeton inconnu → laissé brut et signalé « unknown-token »", () => {
		getRequestAttribute.mockReturnValue(RECORD);
		startInsuranceVars();

		expect(substituteInsuranceVars("{{tauxMagique}} et {{taea}}")).toBe(
			"{{tauxMagique}} et 1,20 %",
		);
		expect(readUnresolvedInsuranceVars()).toMatchObject([
			{ token: "tauxMagique", reason: "unknown-token" },
		]);
	});

	it("valeur absente du record → jeton visible plutôt qu'un trou silencieux", () => {
		getRequestAttribute.mockReturnValue({ exampleAmount: "3 000 €", insurance: {} });
		startInsuranceVars();

		// Le montant est là, la TAEA non : on ne doit surtout pas produire « TAEA de  . »
		expect(substituteInsuranceVars("{{exampleAmount}} — TAEA {{taea}}")).toBe(
			"3 000 € — TAEA {{taea}}",
		);

		/*
		 * Et le motif doit désigner la DONNÉE, pas le jeton. `taea` est un jeton documenté :
		 * l'annoncer « inexistant » enverrait le contributeur corriger une orthographe juste,
		 * pendant qu'une réponse APIM partielle passerait inaperçue.
		 */
		expect(readUnresolvedInsuranceVars()).toMatchObject([{ token: "taea", reason: "no-data" }]);
	});

	/*
	 * Cas de la panne APIM : le record existe mais ne porte aucune valeur exploitable. Sans
	 * distinction, la carte vaut `{}`, tous les jetons y sont absents, et le panneau d'audit
	 * accuse le contributeur d'une faute de frappe pendant un incident de production.
	 */
	it("record vide → « no-data » sur un jeton connu, « unknown-token » sur un inventé", () => {
		getRequestAttribute.mockReturnValue({ insurance: {} });
		startInsuranceVars();

		substituteInsuranceVars("{{taea}} et {{tauxMagique}}");

		expect(readUnresolvedInsuranceVars()).toMatchObject([
			{ token: "taea", reason: "no-data" },
			{ token: "tauxMagique", reason: "unknown-token" },
		]);
	});

	/*
	 * `insuranceTextOverride` porte un bloc HTML entier, rendu en aval par
	 * `dangerouslySetInnerHTML`. L'exposer comme jeton offrirait à tout contributeur un point
	 * d'injection de balisage arbitraire dans du texte éditorial.
	 */
	it("n'expose pas les champs de structure du record comme jetons", () => {
		getRequestAttribute.mockReturnValue({
			variant: "pretPerso",
			insuranceTextOverride: "<script>alert(1)</script>",
			insurance: { taea: "1,20 %" },
		});
		startInsuranceVars();

		expect(substituteInsuranceVars("{{insuranceTextOverride}}")).toBe("{{insuranceTextOverride}}");
		expect(substituteInsuranceVars("{{variant}}")).toBe("{{variant}}");
		// La substitution normale n'est pas affectée.
		expect(substituteInsuranceVars("{{taea}}")).toBe("1,20 %");
	});

	it("dédoublonne les diagnostics par jeton", () => {
		mainResourceNode.current = pageNode({ mixin: false });
		startInsuranceVars();

		substituteInsuranceVars("{{taea}}");
		substituteInsuranceVars("{{taea}} encore");
		expect(readUnresolvedInsuranceVars()).toHaveLength(1);
	});
});

/* ──────────────────────────────────────────────────────────────────────────
   Localisation — le panneau d'audit doit dire OÙ corriger
   ────────────────────────────────────────────────────────────────────────── */

describe("repère du champ fautif", () => {
	const at = (id: string, property: string) => ({
		id,
		path: `/sites/sofinco/home/${id}`,
		property,
		label: `Bloc ${id} — ${property}`,
	});

	beforeEach(() => {
		mainResourceNode.current = pageNode({ mixin: false });
		startFootnoteCollection(true); // le repère n'est posé qu'en mode édition
		startInsuranceVars();
	});

	afterEach(() => startFootnoteCollection(false));

	it("attache au diagnostic le composant et la propriété en cours de lecture", () => {
		setFootnoteLocation(at("hero", "subtitle"));
		substituteInsuranceVars("{{taea}}");

		expect(readUnresolvedInsuranceVars()[0].location).toMatchObject({
			id: "hero",
			property: "subtitle",
		});
	});

	/*
	 * L'unité de correction est le CHAMP : le même jeton fautif dans le titre et dans le
	 * sous-titre demande deux corrections, donc deux lignes. Deux occurrences dans le même
	 * champ se corrigent d'un seul geste et n'en font qu'une.
	 */
	it("une ligne par champ, pas par occurrence", () => {
		setFootnoteLocation(at("hero", "subtitle"));
		substituteInsuranceVars("{{taea}}");
		substituteInsuranceVars("{{taea}} à nouveau");

		setFootnoteLocation(at("hero", "mention"));
		substituteInsuranceVars("{{taea}}");

		expect(readUnresolvedInsuranceVars().map((v) => v.location?.property)).toEqual([
			"subtitle",
			"mention",
		]);
	});

	it("hors mode édition, aucun repère n'est capturé", () => {
		startFootnoteCollection(false);
		setFootnoteLocation(at("hero", "subtitle"));
		substituteInsuranceVars("{{taea}}");

		expect(readUnresolvedInsuranceVars()[0].location).toBeNull();
	});
});

/* ──────────────────────────────────────────────────────────────────────────
   buildInsuranceVarMap — table partagée
   ────────────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────────────
   MODE ÉDITION — jetons visibles, zéro appel APIM, contrôle statique
   ────────────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────────────
   Variables de campagne — l'enveloppe commerciale de la provenance
   ────────────────────────────────────────────────────────────────────────── */

describe("variables de campagne", () => {
	const armWithCampaign = (campaign: unknown = CAMPAIGN) => {
		getRequestAttribute.mockImplementation((name: string) =>
			name === CAMPAIGN_REQUEST_ATTRIBUTE ? campaign : null,
		);
		startInsuranceVars();
	};

	/*
	 * Les deux vocabulaires DOIVENT rester disjoints : la substitution les fusionne dans une seule
	 * table. Un nom commun ferait silencieusement gagner l'une des deux familles, et le contributeur
	 * n'aurait aucun moyen de savoir laquelle.
	 */
	it("aucun jeton de campagne ne collisionne avec un jeton de simulation", () => {
		for (const token of CAMPAIGN_VAR_TOKENS) {
			expect(INSURANCE_VAR_TOKENS).not.toContain(token);
		}
	});

	/* ── Mémoïsation ─────────────────────────────────────────────────────── */

	/**
	 * Porteur qui COMPTE ses accès de clé.
	 *
	 * C'est la bonne mesure : le porteur réel est paresseux, et c'est l'ÉNUMÉRATION de ses clés
	 * qui déclenche la résolution — donc l'appel APIM. Lire l'attribut de requête, lui, ne coûte
	 * rien : la garde d'identité le fait à chaque appel, par construction.
	 */
	const countingCampaign = (values: Record<string, string> = CAMPAIGN) => {
		const reads = { count: 0 };
		const holder = new Proxy(values, {
			get(target, key: string) {
				reads.count++;
				return target[key];
			},
		});
		return { holder, reads };
	};

	/*
	 * UNE SEULE ÉNUMÉRATION PAR RENDU, quel que soit le nombre de jetons.
	 *
	 * Une mention produit en compte huit. Réénumérer à chaque jeton multiplierait le coût de
	 * résolution par huit sur le chemin le plus chaud de la page.
	 */
	it("n'énumère le porteur qu'une fois, quel que soit le nombre de jetons", () => {
		const { holder, reads } = countingCampaign();
		armWithCampaign(holder);

		substituteInsuranceVars("{minAmount} {maxAmount} {minDuration} {maxDuration} {endDate}");
		const afterFirst = reads.count;

		substituteInsuranceVars("{minAnnualDebitRate} {maxAnnualDebitRate} {startDate}");

		expect(afterFirst).toBeGreaterThan(0);
		expect(reads.count).toBe(afterFirst);
	});

	/*
	 * GARDE D'IDENTITÉ, symétrique de celle de la famille SIMULATION.
	 *
	 * `ensureCurrentRender` s'indexe sur le chemin de la ressource principale. Deux rendus
	 * successifs de la MÊME page dans un contexte GraalVM du pool réutiliseraient donc la
	 * mémoïsation sans relire le porteur — et serviraient les chiffres du rendu précédent.
	 *
	 * Même chemin implique aujourd'hui même provenance, donc mêmes valeurs : le défaut est
	 * théorique. Mais c'est exactement la classe de réutilisation dont `ensureCurrentRender`
	 * explique qu'elle produit « des chiffres réglementés faux, durablement mémorisés ». On
	 * ferme la porte plutôt que de parier sur l'invariant.
	 */
	it("un porteur DIFFÉRENT est relu, même sans changement de rendu", () => {
		armWithCampaign();
		expect(substituteInsuranceVars("{minAmount}")).toBe("3 001 €");

		// Nouveau porteur, sans repasser par `startInsuranceVars` : le cas du contexte GraalVM
		// réutilisé pour un second rendu de la même page.
		getRequestAttribute.mockImplementation((name: string) =>
			name === CAMPAIGN_REQUEST_ATTRIBUTE ? { ...CAMPAIGN, minAmount: "1 500 €" } : null,
		);

		expect(substituteInsuranceVars("{minAmount}")).toBe("1 500 €");
	});

	/** La mention réelle de l'ancien site, telle que le contributeur la reprendra. */
	it("résout la mention produit de bout en bout", () => {
		armWithCampaign();

		const mention =
			"Le Prêt Perso est un prêt amortissable, au Taux Annuel Effectif Global (TAEG) fixe de " +
			"{minAnnualGlobalEffectiveRate} à {maxAnnualGlobalEffectiveRate} (taux débiteur fixe de " +
			"{minAnnualDebitRate} à {maxAnnualDebitRate}) pour un montant de {minAmount} à " +
			"{maxAmount}, sur une durée de remboursement de {minDuration} à {maxDuration} mois. " +
			"Offre valable jusqu'au {endDate}.";

		expect(substituteInsuranceVars(mention)).toBe(
			"Le Prêt Perso est un prêt amortissable, au Taux Annuel Effectif Global (TAEG) fixe de " +
				"4,400 % à 15,650 % (taux débiteur fixe de 4,314 % à 14,628 %) pour un montant de " +
				"3 001 € à 75 000 €, sur une durée de remboursement de 12 à 120 mois. " +
				"Offre valable jusqu'au 26/08/2026.",
		);
		expect(readUnresolvedInsuranceVars()).toEqual([]);
	});

	/*
	 * Le mot « mois » appartient à la PHRASE, pas au jeton. L'inclure dans la valeur produirait
	 * « de 12 mois à 120 mois mois », et l'en retirer interdirait au contributeur toute autre
	 * tournure.
	 */
	it("les durées sont des nombres nus, sans unité", () => {
		armWithCampaign();
		expect(substituteInsuranceVars("{minDuration}")).toBe("12");
		expect(substituteInsuranceVars("{maxDuration}")).toBe("120");
	});

	it("accepte aussi la forme à doubles accolades", () => {
		armWithCampaign();
		expect(substituteInsuranceVars("{{minAmount}}")).toBe("3 001 €");
	});

	/*
	 * Le motif doit désigner la PROVENANCE, pas le type de crédit : ce sont deux champs distincts
	 * des Options, et une campagne n'exige que le premier.
	 */
	it("sans campagne, le motif renvoie à la provenance et non au type de crédit", () => {
		mainResourceNode.current = pageNode({ mixin: false });
		startInsuranceVars();

		expect(substituteInsuranceVars("{minAmount}")).toBe("{minAmount}");
		expect(readUnresolvedInsuranceVars()).toMatchObject([
			{ token: "minAmount", reason: "no-source" },
		]);
	});

	/** Campagne présente mais amputée : c'est une donnée manquante, pas une provenance absente. */
	it("campagne partielle → « no-data » sur le jeton manquant", () => {
		armWithCampaign({ minAmount: "3 001 €" });

		expect(substituteInsuranceVars("{minAmount} / {maxAmount}")).toBe("3 001 € / {maxAmount}");
		expect(readUnresolvedInsuranceVars()).toMatchObject([
			{ token: "maxAmount", reason: "no-data" },
		]);
	});

	/*
	 * LE TEST QUI DONNE SON SENS AUX DEUX PORTEURS.
	 *
	 * Le porteur de simulation est une `Map` Java paresseuse : ÉNUMÉRER ses clés déclenche sa
	 * résolution, donc l'appel APIM `calculate`. Un texte ne contenant qu'un `{minAmount}` ne doit
	 * donc jamais l'énumérer — sinon la page paie un calcul d'exemple représentatif qu'elle
	 * n'affiche nulle part, et la séparation en deux porteurs ne sert plus à rien.
	 *
	 * Le `Proxy` observe exactement ce que fait GraalVM à `Object.keys()` sur la carte du porteur.
	 */
	it.each([...CAMPAIGN_VAR_TOKENS])("{{%s}} ne touche jamais le porteur de simulation", (token) => {
		let simulationEnumerated = 0;
		const simulationHolder = new Proxy(RECORD, {
			ownKeys(target) {
				simulationEnumerated++;
				return Reflect.ownKeys(target);
			},
		});

		getRequestAttribute.mockImplementation((name: string) => {
			if (name === SIMULATION_REQUEST_ATTRIBUTE) return simulationHolder;
			if (name === CAMPAIGN_REQUEST_ATTRIBUTE) return CAMPAIGN;
			return null;
		});
		startInsuranceVars();

		// Résolu depuis la campagne…
		expect(substituteInsuranceVars(`{${token}}`)).toBe(CAMPAIGN[token]);
		// …sans avoir jamais énuméré le porteur de simulation.
		expect(simulationEnumerated).toBe(0);
	});

	/** Et la réciproque : un jeton de simulation n'interroge pas la campagne. */
	it("un jeton de simulation ne touche jamais le porteur de campagne", () => {
		let campaignEnumerated = 0;
		const campaignHolder = new Proxy(CAMPAIGN, {
			ownKeys(target) {
				campaignEnumerated++;
				return Reflect.ownKeys(target);
			},
		});

		getRequestAttribute.mockImplementation((name: string) => {
			if (name === SIMULATION_REQUEST_ATTRIBUTE) return RECORD;
			if (name === CAMPAIGN_REQUEST_ATTRIBUTE) return campaignHolder;
			return null;
		});
		startInsuranceVars();

		expect(substituteInsuranceVars("TAEA {{taea}}")).toBe("TAEA 1,20 %");
		expect(campaignEnumerated).toBe(0);
	});

	/*
	 * LE test qui justifie deux porteurs séparés. Une page qui n'affiche que des bornes d'offre ne
	 * doit pas déclencher de simulation — et n'a donc aucune raison d'exiger un type de crédit,
	 * champ qui pilote des chiffres réglementés.
	 */
	it("une page sans simulation résout quand même ses variables de campagne", () => {
		const getExample = vi.fn();
		getService.mockReturnValue({ getExample });
		mainResourceNode.current = pageNode({ mixin: false });
		getRequestAttribute.mockImplementation((name: string) =>
			name === CAMPAIGN_REQUEST_ATTRIBUTE ? CAMPAIGN : null,
		);
		startInsuranceVars();

		expect(substituteInsuranceVars("{minAmount}")).toBe("3 001 €");
		expect(getExample).not.toHaveBeenCalled();
	});
});

describe("mode édition (startInsuranceVars(false))", () => {
	/** Page correctement configurée : seul le mode doit changer le comportement. */
	const armEditModeOn = (node = pageNode()) => {
		mainResourceNode.current = node;
		getRequestAttribute.mockReturnValue(RECORD);
		startInsuranceVars(false);
	};

	/*
	 * AUDIT PAR FAMILLE EN ÉDITION — les deux échecs que le panneau existe pour éviter.
	 *
	 * Le mode édition ne résout rien : c'est le SEUL endroit où le contributeur voit le
	 * diagnostic. Le juger sur les préconditions de la simulation seule produisait deux issues
	 * fausses, verrouillées ici.
	 */
	it("page avec provenance mais sans produit → un jeton campagne n'est PAS signalé", () => {
		armEditModeOn(pageNode({ product: "", sourceId: "NEOURL41" }));

		expect(substituteInsuranceVars("Dès {minAmount}")).toBe("Dès {minAmount}");
		// La campagne est complète : rien à corriger, malgré l'absence de type de crédit.
		expect(readUnresolvedInsuranceVars()).toEqual([]);
	});

	it("page avec provenance mais sans produit → un jeton simulation reste « no-product »", () => {
		armEditModeOn(pageNode({ product: "", sourceId: "NEOURL41" }));

		expect(substituteInsuranceVars("TAEA {{taea}}")).toBe("TAEA {{taea}}");
		expect(readUnresolvedInsuranceVars()).toMatchObject([{ token: "taea", reason: "no-product" }]);
	});

	/*
	 * LE CAS LE PLUS DANGEREUX : produit renseigné, provenance absente. L'audit répondait
	 * « ready » et ne signalait RIEN — un `{minAmount}` insoluble partait en production en
	 * silence, sur une mention réglementée.
	 */
	it("page avec produit mais sans provenance → le jeton campagne est signalé « no-source »", () => {
		armEditModeOn(pageNode({ product: "CR", sourceId: "" }));

		expect(substituteInsuranceVars("Dès {minAmount}")).toBe("Dès {minAmount}");
		expect(readUnresolvedInsuranceVars()).toMatchObject([
			{ token: "minAmount", reason: "no-source" },
		]);
	});

	it("page complète → aucune des deux familles n'est signalée", () => {
		armEditModeOn(pageNode({ product: "CR", sourceId: "NEOURL41" }));

		substituteInsuranceVars("TAEA {{taea}} dès {minAmount}");
		expect(readUnresolvedInsuranceVars()).toEqual([]);
	});

	it("sans le mixin, les deux familles répondent « no-params »", () => {
		armEditModeOn(pageNode({ mixin: false }));

		substituteInsuranceVars("TAEA {{taea}} dès {minAmount}");
		expect(readUnresolvedInsuranceVars()).toMatchObject([
			{ token: "taea", reason: "no-params" },
			{ token: "minAmount", reason: "no-params" },
		]);
	});

	it("laisse les jetons tels que le contributeur les a écrits", () => {
		armEditModeOn();
		expect(substituteInsuranceVars("TAEA {{taea}}, soit {{monthlyAmount}} par mois.")).toBe(
			"TAEA {{taea}}, soit {{monthlyAmount}} par mois.",
		);
	});

	/*
	 * LE point de ce mode. Une session d'édition recharge le Page Builder en continu ; solliciter
	 * un service bancaire externe à chaque rechargement n'aurait aucun sens.
	 */
	it("n'émet AUCUN appel — ni attribut de requête, ni service OSGi", () => {
		armEditModeOn();
		substituteInsuranceVars("{{taea}} {{monthlyAmount}} {{dueNumber}}");

		expect(getRequestAttribute).not.toHaveBeenCalled();
		expect(getService).not.toHaveBeenCalled();
	});

	/*
	 * La garde vit dans `readSimulationRecord` elle-même, pas chez ses appelants.
	 *
	 * Cette fonction est EXPORTÉE et a plus d'un consommateur. Ne la protéger qu'au point
	 * d'appel de la substitution reviendrait à parier sur la vigilance du prochain appelant —
	 * et une session d'édition recharge le Page Builder en continu : le jour où le pari est
	 * perdu, c'est un appel APIM à chaque sauvegarde, chaque glisser-déposer, chaque ouverture
	 * de panneau.
	 */
	it("readSimulationRecord() rend null et n'interroge jamais le bridge", () => {
		const getExample = vi.fn(() => RECORD);
		getService.mockReturnValue({ getExample });
		armEditModeOn();

		expect(readSimulationRecord()).toBeNull();
		expect(getExample).not.toHaveBeenCalled();
	});

	it("signale malgré tout les jetons inexistants", () => {
		armEditModeOn();
		substituteInsuranceVars("{{taea}} et {{tauxMagique}}");

		expect(readUnresolvedInsuranceVars()).toMatchObject([
			{ token: "tauxMagique", reason: "unknown-token" },
		]);
	});

	it("signale une page sans simulation, sans avoir besoin du service", () => {
		armEditModeOn(pageNode({ mixin: false }));
		substituteInsuranceVars("{{taea}}");

		expect(readUnresolvedInsuranceVars()).toMatchObject([{ token: "taea", reason: "no-params" }]);
		expect(getService).not.toHaveBeenCalled();
	});

	it("signale un type de crédit non renseigné", () => {
		armEditModeOn(pageNode({ product: "" }));
		substituteInsuranceVars("{{taea}}");

		expect(readUnresolvedInsuranceVars()).toMatchObject([{ token: "taea", reason: "no-product" }]);
	});

	it("page correctement configurée + jetons valides → rien à signaler", () => {
		armEditModeOn();
		substituteInsuranceVars("{{taea}} {{monthlyAmount}}");

		expect(readUnresolvedInsuranceVars()).toEqual([]);
	});

	it("ne relit le nœud page qu'une fois, quel que soit le nombre de textes", () => {
		const page = pageNode({ mixin: false });
		let mixinChecks = 0;
		const counting = {
			isNodeType: (type: string) => {
				if (type === SIMULATION_PARAMS_MIXIN) mixinChecks++;
				return type === "jnt:page";
			},
			hasProperty: () => false,
			getProperty: () => ({ getString: () => "" }),
			getParent: () => null,
		} as unknown as JCRNodeWrapper;
		void page;
		armEditModeOn(counting);

		substituteInsuranceVars("{{taea}}");
		substituteInsuranceVars("{{monthlyAmount}}");
		substituteInsuranceVars("{{dueNumber}}");

		expect(mixinChecks).toBe(1);
	});

	it("le mode par défaut reste résolvant", () => {
		mainResourceNode.current = pageNode();
		getRequestAttribute.mockReturnValue(RECORD);
		startInsuranceVars();

		expect(substituteInsuranceVars("{{taea}}")).toBe("1,20 %");
	});
});

/* ──────────────────────────────────────────────────────────────────────────
   collectUnknownInsuranceVars — contrôle statique, pendant du contrôle des renvois
   ────────────────────────────────────────────────────────────────────────── */

describe("collectUnknownInsuranceVars", () => {
	beforeEach(() => startInsuranceVars());

	it("signale un jeton absent des listes connues", () => {
		expect(collectUnknownInsuranceVars("TAEA {{tauxMagique}}")).toEqual(["tauxMagique"]);
	});

	it("ne signale aucun jeton documenté", () => {
		const text = INSURANCE_VAR_TOKENS.map((tok) => `{{${tok}}}`).join(" ");
		expect(collectUnknownInsuranceVars(text)).toEqual([]);
	});

	/* Des milliers de mentions publiées utilisent les alias : les accuser serait un faux positif. */
	it("ne signale pas les alias historiques", () => {
		expect(
			collectUnknownInsuranceVars("{{insuranceRate}} {{totalInsuranceAmountT1}} {{mois}}"),
		).toEqual([]);
	});

	it("reconnaît la forme à une seule accolade", () => {
		expect(collectUnknownInsuranceVars("{tauxMagique}")).toEqual(["tauxMagique"]);
	});

	it("dédoublonne à l'intérieur d'un même texte", () => {
		expect(collectUnknownInsuranceVars("{{x}} puis {{x}} encore")).toEqual(["x"]);
	});

	it("alimente le panneau d'audit avec le motif « unknown-token »", () => {
		collectUnknownInsuranceVars("{{tauxMagique}}");
		expect(readUnresolvedInsuranceVars()).toMatchObject([
			{ token: "tauxMagique", reason: "unknown-token" },
		]);
	});

	/* Le contrôle est STATIQUE : il ne doit jamais réintroduire l'appel APIM qu'on vient d'éviter. */
	it("ne déclenche aucune résolution", () => {
		collectUnknownInsuranceVars("{{tauxMagique}} {{taea}}");
		expect(getRequestAttribute).not.toHaveBeenCalled();
		expect(getService).not.toHaveBeenCalled();
	});

	it.each(["", "Un texte sans le moindre jeton."])("texte sans jeton (%j) → rien", (text) => {
		expect(collectUnknownInsuranceVars(text)).toEqual([]);
		expect(readUnresolvedInsuranceVars()).toEqual([]);
	});
});

/* ──────────────────────────────────────────────────────────────────────────
   readSimulationRecord — point de mutualisation de la page
   ────────────────────────────────────────────────────────────────────────── */

describe("readSimulationRecord", () => {
	it("non armé → null, sans rien résoudre", () => {
		expect(readSimulationRecord()).toBeNull();
		expect(getRequestAttribute).not.toHaveBeenCalled();
	});

	it("renvoie le record posé par le filtre Java", () => {
		getRequestAttribute.mockReturnValue(RECORD);
		startInsuranceVars();

		expect(readSimulationRecord()).toBe(RECORD);
	});

	/*
	 * LE test qui garantit qu'une page ne coûte qu'UN appel APIM : la substitution des jetons et
	 * le composant RepresentativeExample passent tous deux par ici, la résolution est mémorisée.
	 */
	it("ne résout qu'une fois, quel que soit le nombre de consommateurs", () => {
		const page = pageNode();
		mainResourceNode.current = page;
		const getExample = vi.fn(() => RECORD);
		getService.mockReturnValue({ getExample });
		startInsuranceVars();

		readSimulationRecord(); // le composant
		readSimulationRecord(); // un autre consommateur
		substituteInsuranceVars("{{taea}}"); // la substitution des mentions

		// Le contrat porte sur l'APPEL au service, pas sur le nombre de lectures d'attribut :
		// celles-ci sont gratuites, et les mémoriser rouvrirait la fuite entre requêtes.
		expect(getExample).toHaveBeenCalledTimes(1);
	});

	/*
	 * Le pendant du test précédent : la mémorisation ne doit PAS franchir la requête.
	 *
	 * L'empreinte de rendu est le chemin de la page, donc deux requêtes successives sur la même
	 * page la partagent. Mémoriser en portée module figerait les chiffres publiés de cette page
	 * jusqu'à ce qu'un autre rendu traverse le même contexte GraalVM — une mensualité périmée
	 * servie indéfiniment, sans erreur pour le signaler.
	 */
	it("ne réutilise pas le record d'une requête précédente sur la même page", () => {
		const page = pageNode();
		mainResourceNode.current = page;
		const getExample = vi
			.fn()
			.mockReturnValueOnce({ insurance: { taea: "1,20 %" } })
			.mockReturnValueOnce({ insurance: { taea: "9,99 %" } });
		getService.mockReturnValue({ getExample });

		startInsuranceVars();
		expect(substituteInsuranceVars("{{taea}}")).toBe("1,20 %");

		// Requête suivante : même page, donc même empreinte — mais magasin d'attributs neuf.
		requestAttributes.clear();
		startInsuranceVars();
		expect(substituteInsuranceVars("{{taea}}")).toBe("9,99 %");
		expect(getExample).toHaveBeenCalledTimes(2);
	});

	it("page sans simulation → null, pour laisser un appelant prendre le relais", () => {
		mainResourceNode.current = pageNode({ mixin: false });
		startInsuranceVars();

		expect(readSimulationRecord()).toBeNull();
	});

	it("startInsuranceVars réarme la mémorisation du record", () => {
		getRequestAttribute.mockReturnValue(RECORD);
		startInsuranceVars();
		readSimulationRecord();
		startInsuranceVars();
		readSimulationRecord();

		expect(getRequestAttribute).toHaveBeenCalledTimes(2);
	});
});

/* ──────────────────────────────────────────────────────────────────────────
   Extensibilité — une variable ajoutée côté Java doit marcher SANS toucher au TS
   ────────────────────────────────────────────────────────────────────────── */

describe("extensibilité depuis le bridge Java", () => {
	/*
	 * LE CONTRAT D'EXTENSION, DEPUIS QUE DEUX FAMILLES COEXISTENT.
	 *
	 * La TABLE reste ouverte : toute clé du record y entre, sans mise en correspondance à écrire
	 * ni type à étendre. C'est ce que vérifie ce test — `tauxUsure` se résout par la seule
	 * présence de la clé côté Java, dès lors qu'elle est déclarée.
	 *
	 * La RÉSOLUTION, elle, est fermée : voir les deux tests suivants. Ajouter une variable Java
	 * demande donc UNE ligne dans `INSURANCE_VAR_TOKENS`, et rien d'autre.
	 */
	it("une clé déclarée se résout sans mise en correspondance à écrire", () => {
		getRequestAttribute.mockReturnValue({
			exampleAmount: "3 000 €",
			insurance: { ...RECORD.insurance, taea: "21,15 %" },
		});
		startInsuranceVars();

		expect(substituteInsuranceVars("Taux : {{taea}}")).toBe("Taux : 21,15 %");
		expect(readUnresolvedInsuranceVars()).toEqual([]);
	});

	/*
	 * LA CONTREPARTIE, ASSUMÉE. Une clé produite par Java mais NON déclarée reste brute — c'est
	 * le prix de ne rien interroger pour un jeton inconnu. Le panneau d'audit la signale en
	 * édition, ce qui rend l'oubli visible avant publication plutôt qu'après.
	 */
	it("une clé NON déclarée reste brute, même si le bridge la produit", () => {
		getRequestAttribute.mockReturnValue({ ...RECORD, dureeMaximale: "84 mois" });
		startInsuranceVars();

		expect(substituteInsuranceVars("{{dureeMaximale}}")).toBe("{{dureeMaximale}}");
		expect(readUnresolvedInsuranceVars()).toMatchObject([
			{ token: "dureeMaximale", reason: "unknown-token" },
		]);
	});

	/*
	 * LE POINT DEMANDÉ : un jeton absent des DEUX listes n'interroge NI la simulation, NI la
	 * campagne. Une faute de frappe dans une mention ne doit pas coûter un appel APIM.
	 *
	 * Les `Proxy` observent exactement ce que fait GraalVM à `Object.keys()` sur les cartes des
	 * porteurs — et cette énumération EST la résolution, donc l'appel.
	 */
	it("un jeton inconnu n'interroge aucune des deux familles", () => {
		let simulationEnumerated = 0;
		let campaignEnumerated = 0;

		const simulationHolder = new Proxy(RECORD, {
			ownKeys(target) {
				simulationEnumerated++;
				return Reflect.ownKeys(target);
			},
		});
		const campaignHolder = new Proxy(CAMPAIGN, {
			ownKeys(target) {
				campaignEnumerated++;
				return Reflect.ownKeys(target);
			},
		});

		getRequestAttribute.mockImplementation((name: string) => {
			if (name === SIMULATION_REQUEST_ATTRIBUTE) return simulationHolder;
			if (name === CAMPAIGN_REQUEST_ATTRIBUTE) return campaignHolder;
			return null;
		});
		startInsuranceVars();

		expect(substituteInsuranceVars("Taux {tauxMagique}.")).toBe("Taux {tauxMagique}.");
		expect(simulationEnumerated).toBe(0);
		expect(campaignEnumerated).toBe(0);
		expect(readUnresolvedInsuranceVars()).toMatchObject([
			{ token: "tauxMagique", reason: "unknown-token" },
		]);
	});

	it("`rows` n'est pas exposé comme jeton (structure, pas valeur)", () => {
		getRequestAttribute.mockReturnValue({ ...RECORD, rows: [{ labelKey: "x", value: "y" }] });
		startInsuranceVars();

		expect(substituteInsuranceVars("{{rows}}")).toBe("{{rows}}");
	});

	it("les jetons documentés restent résolus même si l'introspection échoue", () => {
		// Record dont `Object.keys` lève — cas d'un proxy polyglotte récalcitrant.
		const hostile = {
			exampleAmount: "3 000 €",
			insurance: new Proxy(
				{ taea: "1,20 %" },
				{
					ownKeys() {
						throw new Error("polyglot proxy");
					},
				},
			),
		};
		getRequestAttribute.mockReturnValue(hostile);
		startInsuranceVars();

		expect(substituteInsuranceVars("{{taea}}")).toBe("1,20 %");
	});
});

describe("buildInsuranceVarMap", () => {
	it("passe-plat : toute clé fournie devient un jeton", () => {
		const map = buildInsuranceVarMap({ tauxInedit: "4,20 %" });
		expect(map.tauxInedit).toBe("4,20 %");
	});

	it("un alias legacy n'écrase jamais une clé native de même nom", () => {
		// `mois` est un alias de `dueNumber` ; s'il arrive du bridge, sa valeur prime.
		const map = buildInsuranceVarMap({ dueNumber: "36", mois: "douze" });
		expect(map.mois).toBe("douze");
	});

	it("écarte les valeurs vides et absentes", () => {
		const map = buildInsuranceVarMap({
			taea: "1,20 %",
			monthlyAmount: "",
			exampleAmount: undefined,
		});
		expect(map).toEqual({
			taea: "1,20 %",
			annualInsuranceEffectiveRate: "1,20 %",
			insuranceRate: "1,20 %",
		});
	});

	it("chaque jeton canonique est une clé produite par la table", () => {
		const source = Object.fromEntries(INSURANCE_VAR_TOKENS.map((tok) => [tok, `<${tok}>`]));
		const map = buildInsuranceVarMap(source);
		for (const token of INSURANCE_VAR_TOKENS) {
			expect(map[token]).toBe(`<${token}>`);
		}
	});
});

/* ──────────────────────────────────────────────────────────────────────────
   Réutilisation des contextes JS entre requêtes
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Le moteur de Jahia gère ses contextes GraalVM dans un pool : l'état de module survit d'une
 * requête à l'autre. Or `startInsuranceVars` n'est appelé que par `Layout`, qui NE tourne pas
 * quand le fragment de page vient du cache et que l'agrégation ne re-rend qu'un sous-fragment.
 *
 * Ces cas simulent cette situation en changeant la ressource principale SANS repasser par
 * `startInsuranceVars`.
 */
describe("rendu d'un sous-fragment isolé (Layout n'a pas tourné)", () => {
	/** Ressource principale mockée avec un chemin — c'est lui qui sert d'empreinte de rendu. */
	function mainResourceAt(path: string) {
		mainResourceNode.current = {
			getPath: () => path,
			isNodeType: (type: string) => type === "jnt:page",
			hasProperty: () => false,
			getProperty: () => ({ getString: () => "" }),
			getParent: () => null,
		} as unknown as JCRNodeWrapper;
	}

	it("ne réutilise PAS les chiffres de la page précédente", () => {
		mainResourceAt("/sites/sofinco/home/page-a");
		getRequestAttribute.mockReturnValue({ insurance: { taea: "1,20 %" } });
		startInsuranceVars();
		expect(substituteInsuranceVars("{{taea}}")).toBe("1,20 %");

		// Requête suivante, même contexte JS, autre page, et Layout ne tourne pas.
		mainResourceAt("/sites/sofinco/home/page-b");
		getRequestAttribute.mockReturnValue({ insurance: { taea: "9,99 %" } });

		expect(substituteInsuranceVars("{{taea}}")).toBe("9,99 %");
	});

	it("substitue même si seul le sous-fragment est rendu", () => {
		mainResourceAt("/sites/sofinco/home/page-a");
		startInsuranceVars();
		stopInsuranceVars(); // registre laissé désarmé par le rendu précédent

		mainResourceAt("/sites/sofinco/home/page-b");
		getRequestAttribute.mockReturnValue({ insurance: { taea: "3,40 %" } });

		// Sans le garde-fou, `armed` resterait faux et le jeton partirait BRUT vers le visiteur.
		expect(substituteInsuranceVars("{{taea}}")).toBe("3,40 %");
	});

	it("repart en mode résolvant après une session d'édition", () => {
		mainResourceAt("/sites/sofinco/home/page-a");
		startInsuranceVars(false); // édition : jetons laissés bruts
		expect(substituteInsuranceVars("{{taea}}")).toBe("{{taea}}");

		mainResourceAt("/sites/sofinco/home/page-b");
		getRequestAttribute.mockReturnValue({ insurance: { taea: "5,60 %" } });

		// Le cache de fragments est inactif en édition : un fragment isolé ne peut venir que du LIVE.
		expect(substituteInsuranceVars("{{taea}}")).toBe("5,60 %");
	});

	it("un même rendu conserve son état", () => {
		mainResourceAt("/sites/sofinco/home/page-a");
		getRequestAttribute.mockReturnValue({ insurance: { taea: "1,20 %" } });
		startInsuranceVars(false);

		expect(substituteInsuranceVars("{{taea}}")).toBe("{{taea}}");
		expect(substituteInsuranceVars("{{taea}}")).toBe("{{taea}}");
	});
});
