import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";
import type { RenderContext } from "org.jahia.services.render";
import type { TFunction } from "#lib/i18n";

vi.mock("#lib/jcr", () => import("#test/jahia"));

// Mock du helper partagé sofmix:simulatorCta.
// Reproduit la sémantique RÉELLE de buildSimulatorCtaFromNode :
// TOUJOURS retourner un CtaProps (même en fallback), jamais null.
// La logique URL est couverte exhaustivement dans simulatorCta.test.ts.
vi.mock("#lib/simulatorCta", () => ({
	buildSimulatorCtaFromNode: vi.fn((node, _rc, _t, opts) => {
		const sourceId = node.getPropertyAsString ? node.getPropertyAsString("sourceId") : "";
		const href = sourceId
			? `/parcours-simulateur?sourceId=${sourceId}#/auto`
			: "/parcours-simulateur";
		return {
			label: "Je simule mon prêt",
			href,
			target: "_self",
			ctaSection: opts?.ctaSection ?? "simulator",
			variant: "accent",
		};
	}),
}));

vi.mock("#cms/AvisClientsSticker/avisClientsSticker.mapping", () => ({
	mapAvisClientsStickerPropsClient: vi.fn(() => ({
		avisLogoUrl: "/logo.svg",
		avisTitle: "Nos clients nous recommandent",
		ratingScore: 4.4,
		ratingReviewsCount: 5646,
	})),
}));

import { mapProductHeroProps } from "./productHero.mapping";
import { mapAvisClientsStickerPropsClient } from "#cms/AvisClientsSticker/avisClientsSticker.mapping";

const rcFor = (node: ReturnType<typeof makeNode>): RenderContext =>
	({ getMainResource: () => ({ getNode: () => node }) }) as unknown as RenderContext;

// `t` factice : renvoie la clé telle quelle (le CTA est entièrement mocké,
// aucune clé i18n réelle n'est résolue ici).
const t: TFunction = (key: string) => key;

const characteristicsHtml = `<ul>
  <li>pour <strong>15 000€ à 20 000€</strong></li>
  <li>de 13 à 48 mois</li>
  <li>jusqu'au 24 juin 2026</li>
  <li><u>Mensualités flexibles<sup>(1)</sup></u></li>
</ul>`;

// `description` est un champ RICHTEXT (barre CKEditor `Description`) : gras,
// exposants ⁽¹⁾ et tailles `rt-text-*` sont saisis au wysiwyg. Le mapping le
// transmet tel quel — c'est le DS qui assainit puis injecte.
const descriptionHtml =
	"<p>Avec le <strong>prêt personnel</strong>, empruntez jusqu'à " +
	'<span class="rt-text-l">75 000 €</span> à taux fixe<sup>(1)</sup>.</p>';

const baseProps = {
	"jcr:title": "Grâce au prêt perso, je donne vie à mon projet maintenant !",
	"productLabel": "PRÊT PERSONNEL",
	"description": descriptionHtml,
	"rateValue": "4,50%",
	"rateLabel": "TAEG FIXE",
	"characteristics": characteristicsHtml,
	"imageDesktop": "desktop.webp",
	"titleLevel": "h1",
	"titleStyle": "h1",
	"sourceId": "NEOURL41",
	"simProject": "AUTO",
};

const makeAvisChild = () =>
	makeNode({ nodeTypes: ["sofnt:avisClientsSticker"], props: { isActive: true } });

describe("mapProductHeroProps → HeroPPProps", () => {
	it("produit la forme complète HeroPPProps (eyebrow + title + description + cta + avis + offerCard)", () => {
		const node = makeNode({
			props: baseProps,
			nodeTypes: ["sofnt:productHero"],
			named: { avisClients: makeAvisChild() },
		});

		const result = mapProductHeroProps(node, rcFor(node), t);

		// Pas de breadcrumb dans la forme HeroPP (rendu par LegacyLayout)
		expect(result).not.toHaveProperty("breadcrumb");

		// Le sur-titre passe par <Title> : c'est `eyebrowProps` et non la chaîne nue `eyebrow`,
		// que le DS ne rend plus. `eyebrowLevel` absent du nœud → repli « p », conforme au CND.
		expect(result.eyebrowProps).toEqual({
			children: "PRÊT PERSONNEL",
			as: "p",
			visualStyle: "none",
			variant: "eyebrow",
		});
		// title = TitleProps construit depuis jcr:title + mixin sofmix:headingStyle
		expect(result.title).toEqual({
			children: "Grâce au prêt perso, je donne vie à mon projet maintenant !",
			as: "h1",
			visualStyle: "h1",
		});
		// description = HTML richtext transmis intact
		expect(result.description).toBe(descriptionHtml);
		expect(result.cta).toEqual({
			label: "Je simule mon prêt",
			href: "/parcours-simulateur?sourceId=NEOURL41#/auto",
			target: "_self",
			ctaSection: "product-hero-cta",
			variant: "accent",
		});
		expect(result.avis).toEqual({
			avisLogoUrl: "/logo.svg",
			avisTitle: "Nos clients nous recommandent",
			ratingScore: 4.4,
			ratingReviewsCount: 5646,
		});
		// offerCard = { infoBlock?, imgSrc } — le bloc taux/caractéristiques est
		// regroupé dans `infoBlock` (optionnel côté DS).
		expect(result.offerCard).toEqual({
			infoBlock: {
				rate: "4,50%",
				rateLabel: "TAEG FIXE",
				details: characteristicsHtml,
			},
			imgSrc: "desktop.webp",
		});
	});

	it("title=undefined quand jcr:title est vide (DS masque l'en-tête sur falsy)", () => {
		const node = makeNode({
			props: { ...baseProps, "jcr:title": "" },
			nodeTypes: ["sofnt:productHero"],
		});
		expect(mapProductHeroProps(node, rcFor(node), t).title).toBeUndefined();
	});

	it("description='' quand non contribuée", () => {
		const node = makeNode({
			props: { ...baseProps, description: "" },
			nodeTypes: ["sofnt:productHero"],
		});
		expect(mapProductHeroProps(node, rcFor(node), t).description).toBe("");
	});

	it("ne tronque PAS description, même longue (le champ est du HTML)", () => {
		// Contrat inversé depuis le passage en richtext : un slice à N caractères
		// couperait au milieu d'une balise — et donc au milieu d'un renvoi de
		// mention légale <a href="#footer1">…</a> —, produisant du HTML invalide
		// servi tel quel au SSR. La longueur est un sujet de relecture éditoriale.
		const long = `<p>${"A".repeat(600)}<sup>(1)</sup></p>`;
		const node = makeNode({
			props: { ...baseProps, description: long },
			nodeTypes: ["sofnt:productHero"],
		});
		expect(mapProductHeroProps(node, rcFor(node), t).description).toBe(long);
	});

	it("description : le HTML wysiwyg (gras, exposant, taille) arrive intact au DS", () => {
		// Miroir des 3 possibilités ouvertes au contributeur par la barre
		// `Description`. Le mapping n'assainit pas — `sanitizeHtml` a lieu côté
		// DS, juste avant le dangerouslySetInnerHTML (même contrat que
		// `characteristics`, cf. le test XSS plus bas).
		const html =
			'<p><strong>gras</strong> <span class="rt-text-xl">agrandi</span> ' +
			"<u>renvoi<sup>(2)</sup></u></p>";
		const node = makeNode({
			props: { ...baseProps, description: html },
			nodeTypes: ["sofnt:productHero"],
		});
		expect(mapProductHeroProps(node, rcFor(node), t).description).toBe(html);
	});

	it("avis = undefined quand pas de named child (branche défensive)", () => {
		const node = makeNode({
			props: baseProps,
			nodeTypes: ["sofnt:productHero"],
		});
		expect(mapProductHeroProps(node, rcFor(node), t).avis).toBeUndefined();
	});

	it("avis = undefined quand le sticker autocréé est désactivé (mapping renvoie {})", () => {
		// Cas réel : `avisClients` est `autocreated` → le child existe toujours,
		// mais `mapAvisClientsStickerPropsClient` renvoie `{}` quand le sticker est
		// désactivé. Le mapping doit ramener cet objet vide à `undefined` pour ne
		// pas rendre de wrapper vide côté <HeroPP>.
		vi.mocked(mapAvisClientsStickerPropsClient).mockReturnValueOnce({});
		const node = makeNode({
			props: baseProps,
			nodeTypes: ["sofnt:productHero"],
			named: { avisClients: makeAvisChild() },
		});
		expect(mapProductHeroProps(node, rcFor(node), t).avis).toBeUndefined();
	});

	// ── offerCard : crop mobile ───────────────────────────────────────────────

	it("offerCard.imgSrcMobile reprend imageMobile quand le champ optionnel est contribué", () => {
		const node = makeNode({
			props: { ...baseProps, imageMobile: "mobile.webp" },
			nodeTypes: ["sofnt:productHero"],
		});
		expect(mapProductHeroProps(node, rcFor(node), t).offerCard).toMatchObject({
			imgSrc: "desktop.webp",
			imgSrcMobile: "mobile.webp",
		});
	});

	it("offerCard.imgSrcMobile = undefined quand imageMobile est absent (pas de <source> vide)", () => {
		// `imgUrl` renvoie "" pour une référence absente : sans la coercition en
		// undefined le DS émettrait un <source srcSet=""> qui masquerait l'image.
		const node = makeNode({ props: baseProps, nodeTypes: ["sofnt:productHero"] });
		expect(mapProductHeroProps(node, rcFor(node), t).offerCard.imgSrcMobile).toBeUndefined();
	});

	// ── offerCard.infoBlock ───────────────────────────────────────────────────

	it("offerCard.infoBlock.details = '' quand characteristics non contribuées", () => {
		const node = makeNode({
			props: { ...baseProps, characteristics: "" },
			nodeTypes: ["sofnt:productHero"],
		});
		expect(mapProductHeroProps(node, rcFor(node), t).offerCard.infoBlock?.details).toBe("");
	});

	it("offerCard.infoBlock = undefined quand rateValue est vide (carte réduite au visuel)", () => {
		// Miroir du contrat DS : `getFormattedRateParts("")` renvoie null et
		// <HeroPPOfferCard> masque tout le bloc. Le mapping ne doit donc pas
		// produire un `infoBlock` orphelin (rateLabel/details sans taux).
		const node = makeNode({
			props: { ...baseProps, rateValue: "", rateLabel: "TAEG FIXE" },
			nodeTypes: ["sofnt:productHero"],
		});
		const { offerCard } = mapProductHeroProps(node, rcFor(node), t);
		expect(offerCard.infoBlock).toBeUndefined();
		// L'image reste rendue — elle porte la carte à elle seule.
		expect(offerCard.imgSrc).toBe("desktop.webp");
	});

	it("le trio taux / libellé / caractéristiques est FACULTATIF : aucune des 3 propriétés posée", () => {
		// Depuis la levée du `mandatory` sur `rateValue` (definition.cnd), un hero
		// peut être publié sans bloc offre du tout : les propriétés sont alors
		// ABSENTES du nœud, pas vides — cas que le test à chaîne vide ne couvre pas.
		const { rateValue, rateLabel, characteristics, ...withoutOffer } = baseProps;
		void rateValue;
		void rateLabel;
		void characteristics;

		const node = makeNode({ props: withoutOffer, nodeTypes: ["sofnt:productHero"] });
		const result = mapProductHeroProps(node, rcFor(node), t);

		expect(result.offerCard).toEqual({ infoBlock: undefined, imgSrc: "desktop.webp" });
		// Le reste du hero reste intégralement rendu.
		expect(result.eyebrowProps?.children).toBe("PRÊT PERSONNEL");
		expect(result.description).toBe(descriptionHtml);
	});

	it("offerCard.infoBlock.rateLabel = '' quand rateLabel non contribué mais rateValue présent", () => {
		const node = makeNode({
			props: { ...baseProps, rateLabel: "" },
			nodeTypes: ["sofnt:productHero"],
		});
		expect(mapProductHeroProps(node, rcFor(node), t).offerCard.infoBlock).toEqual({
			rate: "4,50%",
			rateLabel: "",
			details: characteristicsHtml,
		});
	});

	it("CTA fallback placeholder quand sourceId n'est pas configuré (mixin sofmix:simulatorCta vide)", () => {
		const node = makeNode({
			props: { ...baseProps, sourceId: "", simProject: "" },
			nodeTypes: ["sofnt:productHero"],
		});
		const result = mapProductHeroProps(node, rcFor(node), t);
		expect(result.cta).toEqual({
			label: "Je simule mon prêt",
			href: "/parcours-simulateur",
			target: "_self",
			ctaSection: "product-hero-cta",
			variant: "accent",
		});
	});

	// ── Tracking GTM view_promotion (sofmix:promotionTracking) ────────────────

	it("tracking = undefined quand promotionId absent (défaut)", () => {
		const node = makeNode({ props: baseProps, nodeTypes: ["sofnt:productHero"] });
		expect(mapProductHeroProps(node, rcFor(node), t).tracking).toBeUndefined();
	});

	it("tracking peuplé depuis sofmix:promotionTracking quand promotionId présent", () => {
		const node = makeNode({
			props: {
				...baseProps,
				promotionId: "PROMO_PP_2026",
				promotionName: "Prêt Perso été 2026",
				creativeName: "hero-pp-4.50",
				creativeSlot: "hero_top",
				locationId: "home",
			},
			nodeTypes: ["sofnt:productHero"],
		});
		expect(mapProductHeroProps(node, rcFor(node), t).tracking).toEqual({
			promotionId: "PROMO_PP_2026",
			promotionName: "Prêt Perso été 2026",
			creativeName: "hero-pp-4.50",
			creativeSlot: "hero_top",
			locationId: "home",
		});
	});

	// ── Sécurité XSS ──────────────────────────────────────────────────────────

	it("characteristics passe le HTML au DS sans mutation côté mapping (sanitize = responsabilité du DS)", () => {
		// Contrat : le mapping NE DOIT PAS assainir — la sanitize a lieu côté
		// DS (HeroPPOfferCard) via l'utilitaire `sanitizeHtml` avant le
		// `dangerouslySetInnerHTML`. Une double sanitize serait un anti-pattern
		// (perte de perf + risque de double-encoding).
		const dangerous = "<script>alert(1)</script><ul><li>ok</li></ul>";
		const node = makeNode({
			props: { ...baseProps, characteristics: dangerous },
			nodeTypes: ["sofnt:productHero"],
		});
		expect(mapProductHeroProps(node, rcFor(node), t).offerCard.infoBlock?.details).toBe(dangerous);
	});
});
