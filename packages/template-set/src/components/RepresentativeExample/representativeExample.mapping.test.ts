import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";
import type { TFunction } from "#lib/i18n";
import type { RenderContext } from "org.jahia.services.render";
import frLocale from "../../../settings/locales/fr.json";

vi.mock("#lib/jcr", () => import("#test/jahia"));

vi.mock("#lib/simulatorCta", () => ({
	buildSimulatorCtaFromNode: vi.fn(() => ({
		label: "Je simule",
		href: "/parcours-simulateur?sourceId=NEOURL14#/auto",
		target: "_self",
		ctaSection: "representative-example",
		variant: "accent",
	})),
}));

vi.mock("./representativeExampleBridge", () => ({
	getRepresentativeExampleBridge: vi.fn(),
	toExampleData: vi.fn(),
}));

// `readSimulationRecord` est le point de mutualisation de la page ; on le pilote pour
// distinguer « page migrée » de « nœud non encore migré ». `buildInsuranceVarMap` reste réel :
// c'est la table d'alias partagée, la mocker masquerait une divergence.
const { mockReadSimulationRecord } = vi.hoisted(() => ({ mockReadSimulationRecord: vi.fn() }));
vi.mock("#lib/insuranceVars", async () => ({
	...(await vi.importActual<typeof import("#lib/insuranceVars")>("#lib/insuranceVars")),
	readSimulationRecord: mockReadSimulationRecord,
}));

import {
	mapRepresentativeExampleProps,
	mapRepresentativeExampleServerProps,
	mapEmptyRepresentativeExampleProps,
	LARGE_TEXT_ROW_KEYS,
} from "./representativeExample.mapping";
import { getRepresentativeExampleBridge, toExampleData } from "./representativeExampleBridge";

const t = vi.fn((key: string, params?: Record<string, unknown>) => {
	if (params?.mois) return `${key} (mois=${params.mois})`;
	return key;
}) as unknown as TFunction;

const rcFor = (node: ReturnType<typeof makeNode>): RenderContext =>
	({ getMainResource: () => ({ getNode: () => node }) }) as unknown as RenderContext;

const baseProps = {
	"jcr:title": "Pour ne rien vous cacher…",
	"subtitle": "Zéro frais dissimulés...",
	"mention": "",
	"scaleCode": "",
	// Champs natifs RepEx (utilisés par Java bridge + preview)
	"amount": 30000,
	"dueNumber": 36,
	// Champs mixin sofmix:simulatorCta (CTA URL + preview)
	"sourceId": "NEOURL14",
	"simProject": "AUTO",
	"product": "PB",
};

describe("mapRepresentativeExampleProps", () => {
	beforeEach(() => {
		vi.mocked(getRepresentativeExampleBridge).mockReset();
		vi.mocked(toExampleData).mockReset();
	});

	it("retourne null si le bridge OSGi n'est pas disponible (service Java absent)", () => {
		vi.mocked(getRepresentativeExampleBridge).mockReturnValue(null);
		const node = makeNode({ props: baseProps });
		expect(mapRepresentativeExampleProps(node, rcFor(node), t)).toBeNull();
	});

	it("retourne null si l'exemple ne peut pas être résolu par le bridge", () => {
		vi.mocked(getRepresentativeExampleBridge).mockReturnValue({
			getExample: vi.fn(() => null),
		});
		vi.mocked(toExampleData).mockReturnValue(null);
		const node = makeNode({ props: baseProps });
		expect(mapRepresentativeExampleProps(node, rcFor(node), t)).toBeNull();
	});

	it("produit RepresentativeExampleProps complet quand le bridge retourne des données", () => {
		vi.mocked(getRepresentativeExampleBridge).mockReturnValue({
			getExample: vi.fn(() => ({}) as never),
		});
		vi.mocked(toExampleData).mockReturnValue({
			variant: "pretPerso",
			exampleAmount: "30 000 €",
			// Clés au format ÉMIS PAR LE JAVA (`RepresentativeExampleMapper.LABEL_*`), préfixe
			// compris. La fixture portait auparavant un raccourci `row.*` que rien ne contredisait,
			// `toExampleData` étant mocké et `t` une identité : un mapping calé sur cette forme
			// aurait passé les tests et n'aurait jamais matché en production.
			rows: [
				{
					labelKey: "representativeExample.row.monthlyPayment",
					value: "429,07",
					highlighted: false,
				},
				{ labelKey: "representativeExample.row.duration", value: "496 mois", highlighted: false },
				{ labelKey: "representativeExample.row.totalDue", value: "8,187%", highlighted: true },
			],
			insurance: { monthlyAmount: "5", taea: "0,5%", totalInsuranceCost: "180" },
			insuranceTextOverride: undefined,
		});

		const node = makeNode({ props: baseProps });
		const result = mapRepresentativeExampleProps(node, rcFor(node), t);

		expect(result).not.toBeNull();
		expect(result!.variant).toBe("pretPerso");
		expect(result!.title).toBe("Pour ne rien vous cacher…");
		expect(result!.subtitle).toBe("Zéro frais dissimulés...");
		expect(result!.exampleAmount).toBe("30 000 €");
		expect(result!.rows).toHaveLength(3);
		expect(result!.rows[2].highlighted).toBe(true);
		// `largeText` se déduit du labelKey, il n'est pas contribué : mensualité et total dû sont
		// agrandis, la durée non. C'est la règle de maquette, verrouillée ici.
		expect(result!.rows.map((r) => r.largeText)).toEqual([true, false, true]);
		expect(result!.cta).toMatchObject({
			href: "/parcours-simulateur?sourceId=NEOURL14#/auto",
			ctaSection: "representative-example",
		});
	});

	it("substitue les placeholders {{amount}} dans subtitle et mention", () => {
		vi.mocked(getRepresentativeExampleBridge).mockReturnValue({
			getExample: vi.fn(() => ({}) as never),
		});
		vi.mocked(toExampleData).mockReturnValue({
			variant: "pretPerso",
			exampleAmount: "30 000 €",
			rows: [],
			insurance: undefined,
			insuranceTextOverride: undefined,
		});

		const node = makeNode({
			props: {
				...baseProps,
				subtitle: "Pour un emprunt de {{amount}}",
				mention: "Assurance pour {amount}",
			},
		});
		const result = mapRepresentativeExampleProps(node, rcFor(node), t);
		expect(result!.subtitle).toBe("Pour un emprunt de 30 000 €");
		expect(result!.insuranceLegalText).toBe("Assurance pour 30 000 €");
	});

	it("priorise mention éditoriale > insuranceTextOverride config > fr.json fallback", () => {
		vi.mocked(getRepresentativeExampleBridge).mockReturnValue({
			getExample: vi.fn(() => ({}) as never),
		});
		vi.mocked(toExampleData).mockReturnValue({
			variant: "pretPerso",
			exampleAmount: "30 000 €",
			rows: [],
			insurance: undefined,
			insuranceTextOverride: "Override config (ignoré car mention présente)",
		});

		const node = makeNode({
			props: { ...baseProps, mention: "Mention éditoriale prioritaire" },
		});
		expect(mapRepresentativeExampleProps(node, rcFor(node), t)!.insuranceLegalText).toBe(
			"Mention éditoriale prioritaire",
		);
	});
});

/*
 * Le composant doit CONSOMMER l'exemple de la page, pas le recalculer : c'est ce qui garantit
 * un seul appel APIM par page, partagé avec la substitution des jetons des mentions.
 */
describe("origine des données — consommateur d'abord", () => {
	beforeEach(() => {
		mockReadSimulationRecord.mockReset().mockReturnValue(null);
		vi.mocked(getRepresentativeExampleBridge).mockReset();
		vi.mocked(toExampleData).mockReset();
	});

	const example = {
		variant: "creditRenouvelable" as const,
		exampleAmount: "3 000 €",
		rows: [],
		insurance: undefined,
		insuranceTextOverride: undefined,
	};

	it("page migrée → consomme le record partagé, sans appeler le bridge", () => {
		const pageRecord = { exampleAmount: "3 000 €" };
		mockReadSimulationRecord.mockReturnValue(pageRecord);
		vi.mocked(toExampleData).mockReturnValue(example);

		const node = makeNode({ props: baseProps });
		mapRepresentativeExampleProps(node, rcFor(node), t);

		expect(toExampleData).toHaveBeenCalledWith(pageRecord);
		// Le point capital : aucun appel APIM propre au composant.
		expect(getRepresentativeExampleBridge).not.toHaveBeenCalled();
	});

	it("nœud non migré → repli sur son propre appel au bridge", () => {
		const ownRecord = { exampleAmount: "30 000 €" };
		const getExample = vi.fn(() => ownRecord as never);
		vi.mocked(getRepresentativeExampleBridge).mockReturnValue({ getExample });
		vi.mocked(toExampleData).mockReturnValue(example);

		const node = makeNode({ props: baseProps });
		mapRepresentativeExampleProps(node, rcFor(node), t);

		expect(getExample).toHaveBeenCalledWith(node);
		expect(toExampleData).toHaveBeenCalledWith(ownRecord);
	});

	it("ni page ni bridge → mode dégradé, sans exception", () => {
		vi.mocked(getRepresentativeExampleBridge).mockReturnValue(null);
		vi.mocked(toExampleData).mockReturnValue(null);

		const node = makeNode({ props: baseProps });
		expect(mapRepresentativeExampleProps(node, rcFor(node), t)).toBeNull();
	});
});

describe("mapRepresentativeExampleServerProps", () => {
	it("expose title + subtitle + cta sans toucher au bridge", () => {
		const node = makeNode({ props: baseProps });
		const result = mapRepresentativeExampleServerProps(node, rcFor(node), t);
		expect(result.title).toBe("Pour ne rien vous cacher…");
		expect(result.subtitle).toBe("Zéro frais dissimulés...");
		expect(result.cta).toMatchObject({ ctaSection: "representative-example" });
	});

	/*
	 * En édition, le contributeur doit RELIRE ses jetons : en live ils auront disparu, remplacés
	 * par des valeurs. C'est le seul endroit où il peut vérifier qu'il n'a pas fait de faute de
	 * frappe avant publication.
	 */
	it("expose la mention contribuée, jetons NON résolus", () => {
		const node = makeNode({
			props: { ...baseProps, mention: "TAEA {{taea}}, soit {{monthlyAmount}} par mois." },
		});
		const result = mapRepresentativeExampleServerProps(node, rcFor(node), t);

		expect(result.mention).toBe("TAEA {{taea}}, soit {{monthlyAmount}} par mois.");
	});

	it("pas de mention contribuée → rien à afficher", () => {
		const node = makeNode({ props: { ...baseProps, mention: "" } });
		expect(mapRepresentativeExampleServerProps(node, rcFor(node), t).mention).toBeUndefined();
	});

	/*
	 * La substitution et son contrôle statique vivent dans `str()` (cf. `jcr.test.ts`), qui est
	 * mocké ici : rien à en vérifier à ce niveau. Ce mapping ne fait que transmettre la valeur.
	 */
});

/*
 * Preview d'édition — les paramètres sont désormais portés par la PAGE
 * (sofmix:simulationParams). Cette vue est un miroir en lecture seule : elle doit
 * distinguer les trois états, sinon le contributeur qui ne trouve plus les champs
 * dans le formulaire du bloc conclut à une régression.
 */
describe("preview des paramètres simulateur — origine page", () => {
	const pageWith = (props: Record<string, string | number>, withMixin = true) =>
		makeNode({
			nodeTypes: withMixin ? ["jnt:page", "sofmix:simulationParams"] : ["jnt:page"],
			props,
		});

	const previewFor = (page: ReturnType<typeof pageWith>) => {
		const node = makeNode({ props: baseProps, parent: page });
		return mapRepresentativeExampleServerProps(node, rcFor(node), t).simulator;
	};

	it("option non activée → état absent, message explicatif, aucun champ", () => {
		const preview = previewFor(pageWith({}, false));
		expect(preview?.state).toBe("absent");
		expect(preview?.notice).toBe("representativeExample.simulatorPreview.noParams");
		expect(preview?.items).toEqual([]);
	});

	it("option activée sans type de crédit → état incomplete", () => {
		const preview = previewFor(pageWith({ simProduct: "" }));
		expect(preview?.state).toBe("incomplete");
		expect(preview?.notice).toBe("representativeExample.simulatorPreview.noProduct");
		expect(preview?.items).toEqual([]);
	});

	// Intl.NumberFormat("fr-FR") sépare les milliers par une espace fine insécable
	// (U+202F) — cf. le test de `mapEmptyRepresentativeExampleProps` plus bas.
	const euros = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n)} €`;

	it("paramètres complets → valeurs de la page, marquées comme héritées", () => {
		const preview = previewFor(
			pageWith({
				simProduct: "CR",
				simAmount: 4500,
				simDuration: 48,
				simScaleCode: "BAREME7",
				simSourceId: "NEOURL02",
			}),
		);
		expect(preview?.state).toBe("ready");
		expect(preview?.origin).toBe("representativeExample.simulatorPreview.inherited");
		expect(preview?.notice).toBeUndefined();
		// Le `t` de test renvoie la clé telle quelle : le libellé produit n'étant pas
		// traduit, le mapping retombe volontairement sur le code brut plutôt que
		// d'afficher une clé i18n au contributeur.
		expect(preview?.items.map((i) => i.value)).toEqual([
			"CR",
			"NEOURL02",
			euros(4500),
			"48 mois",
			"BAREME7",
		]);
	});

	/*
	 * Page muette sur le montant et la durée : l'aperçu montre les défauts de SITE, ceux que le
	 * rendu utilisera réellement via la cascade page → `sofnt:representativeExampleConfig`.
	 *
	 * Le mixin n'a plus de valeur `autocreated` : aucune n'était valide pour les trois produits
	 * à la fois — 3 000 € passe sous le plancher du PB et du RAC, 15 000 € au-dessus du plafond
	 * du CR. Le couple 5 000 / 48 est le seul rond qui tienne partout, et il est verrouillé côté
	 * Java par `CampaignConsistencyTest#siteDefaultsStayValidForEveryProduct`.
	 */
	it("aperçu sur les défauts de site quand montant et durée sont absents", () => {
		const preview = previewFor(pageWith({ simProduct: "PB" }));
		expect(preview?.items.map((i) => i.value)).toEqual(["PB", "-", euros(5000), "48 mois", "-"]);
	});
});

describe("mapEmptyRepresentativeExampleProps (mode dégradé)", () => {
	it("formate `amount` natif", () => {
		const node = makeNode({ props: { ...baseProps, amount: 5000 } });
		const result = mapEmptyRepresentativeExampleProps(node, rcFor(node), t);
		// Intl.NumberFormat("fr-FR") sépare les milliers avec une espace fine
		// insécable (U+202F), pas une espace standard.
		expect(result.amount).toBe("5 000 €");
		expect(result.title).toBe("Pour ne rien vous cacher…");
	});

	it("amount vide si `amount` = 0 ou absent", () => {
		const node = makeNode({ props: { ...baseProps, amount: 0 } });
		expect(mapEmptyRepresentativeExampleProps(node, rcFor(node), t).amount).toBe("");
	});

	/*
	 * LA PAGE D'ABORD — le cas que la migration rend nominal.
	 *
	 * `migrate-simulation-params-to-page.groovy` efface `amount` du composant après l'avoir
	 * recopié sur la page. Ne lire que le composant ferait donc disparaître le montant de toute
	 * page migrée, silencieusement : la vue dégradée est justement celle qui existe pour que la
	 * page garde un montant lisible quand le reste a échoué.
	 */
	it("lit le montant de la PAGE quand le mixin y est présent", () => {
		const page = makeNode({
			nodeTypes: ["jnt:page", "sofmix:simulationParams"],
			props: { simProduct: "CR", simAmount: 4500, simDuration: 48 },
		});
		// Composant migré : son `amount` a été effacé par le script.
		const node = makeNode({ props: { ...baseProps, amount: 0 }, parent: page });

		// Espace fine insécable (U+202F) : on la dérive d'Intl plutôt que de l'écrire.
		expect(mapEmptyRepresentativeExampleProps(node, rcFor(node), t).amount).toBe(
			`${new Intl.NumberFormat("fr-FR").format(4500)} €`,
		);
	});

	/** Nœud non migré : la page ne porte rien, le composant reste la source. */
	it("retombe sur le montant du nœud quand la page n'a pas le mixin", () => {
		const page = makeNode({ nodeTypes: ["jnt:page"], props: {} });
		const node = makeNode({ props: { ...baseProps, amount: 5000 }, parent: page });

		expect(mapEmptyRepresentativeExampleProps(node, rcFor(node), t).amount).toBe(
			`${new Intl.NumberFormat("fr-FR").format(5000)} €`,
		);
	});
});

describe("LARGE_TEXT_ROW_KEYS", () => {
	/*
	 * Garde anti-dérive avec le Java. Les libellés de lignes sont produits par
	 * `RepresentativeExampleMapper` (bundle `sofinco-core`) : rien, à la compilation, ne relie
	 * ses constantes `LABEL_*` au Set déclaré côté TypeScript. Un renommage là-bas ne casserait
	 * donc rien ici — les lignes retomberaient simplement à 16 px, sans erreur, et la régression
	 * ne se verrait qu'à l'œil sur la page.
	 *
	 * `fr.json` est le point de contact vérifiable : le Java émet la clé, l'i18n doit la traduire.
	 * Une clé du Set absente du bundle est donc soit un préfixe erroné, soit une ligne renommée
	 * côté Java — les deux cas se règlent avant la livraison plutôt qu'en recette.
	 */
	it("ne référence que des clés de ligne existantes dans fr.json", () => {
		const known = new Set(
			Object.keys(frLocale.representativeExample.row).map((k) => `representativeExample.row.${k}`),
		);
		expect([...LARGE_TEXT_ROW_KEYS].filter((key) => !known.has(key))).toEqual([]);
	});
});
