// Central control point for footnote/legal-mention rewriting.
//
// `FOOTNOTE_FIELDS` maps a JCR node type to the rich-text property names whose value
// should be run through `manageFooterNote`. Add or remove an entry here to enable or
// disable processing for a given component — this is the single place to manage it.
//
// `str()` (src/lib/jcr.ts) consults `shouldProcessFootnotes` on every read, so any value
// read through `str` for a registered (nodeType, property) pair is rewritten automatically.
// Content that bypasses a named `str` read (e.g. assembled by hand) must call
// `manageFooterNote` explicitly.

import type { JCRNodeWrapper } from "org.jahia.services.content";

// RÈGLE DE COUVERTURE — un champ est enregistré ici DÈS LORS que sa définition CND lui
// donne une barre d'outils CKEditor qui expose le bouton « Ancres de la page »
// (`Simple`, `TextBlockContent`, `InsuranceMention`). Sinon le contributeur dispose d'un
// bouton qui insère un marqueur que le rendu ignore silencieusement — le pire des deux
// mondes, et exactement le symptôme remonté en recette (« ça marche en édition, pas en
// preview »). L'inverse est sans risque : la réécriture ne fait rien quand le motif
// <u>…<sup>(n)</sup></u> est absent, donc enregistrer un champ ne coûte rien.
//
// Contrôlé automatiquement par `footnoteFields.cnd.test.ts`, qui lit les CND et échoue si
// un champ richtext apparaît sans être couvert (ou explicitement exempté ci-dessous).
export const FOOTNOTE_FIELDS: Record<string, string[]> = {
	// Mentions légales du pied de page : LE champ de renvois du site.
	"sofnt:footer": ["legalMention"],
	// La retranscription vidéo peut citer des conditions tarifaires (TAEG, mensualités,
	// durées) qui pointent vers les mentions légales de la page. On active donc la
	// réécriture <u>texte<sup>(n)</sup></u> → <a href="#footerN"> pour ce champ.
	"sofnt:videoBlock": ["transcription"],
	// La carte offre du Hero Produit liste des conditions tarifaires (TAEG, durées,
	// mensualités) dont certaines renvoient aux mentions légales via le motif
	// <u>texte<sup>(n)</sup></u>. On active la réécriture en ancres accessibles
	// (#footerN) — le DS (HeroPPOfferCard) style déjà ces <a> dans `.card__details`.
	// `description` : même besoin, côté colonne de gauche. Le champ est passé en
	// richtext (barre `Description`, qui expose le bouton d'ancres) précisément
	// pour que le contributeur y saisisse ses exposants ⁽¹⁾ — sans cette entrée le
	// bouton poserait un marqueur que le rendu ignorerait en silence.
	"sofnt:productHero": ["characteristics", "description"],
	// Réponse de FAQ : porte régulièrement des conditions chiffrées renvoyant aux mentions.
	"sofnt:faqItem": ["answer"],
	// Bloc SEO : texte éditorial long, barre d'outils `TextBlockContent` (bouton d'ancres).
	"sofnt:seoBlock": ["content"],
	// Descriptif d'un avantage produit (barre `Simple`).
	"sofnt:productAdvantageCategory": ["text"],
	// Mentions d'assurance de l'exemple représentatif — barre `InsuranceMention`, dédiée à
	// ce cas : c'est le contenu réglementaire par excellence.
	"sofnt:representativeExampleConfig": ["insurancePB", "insuranceCR", "insuranceRAC"],
	"sofnt:representativeExample": ["mention"],
	// NOTE: sofnt:mentionLegalItem.content is intentionally NOT here — its note is built
	// explicitly in MentionLegal/default.server.tsx, where the (optional) `anchor` property
	// is rendered as the leading <sup> before `manageFooterNote` runs (so the read must stay
	// raw to avoid double-processing). Sans ancre, `buildNote` appelle quand même
	// `manageFooterNote` : le texte libre garde ses renvois SORTANTS.
};

/**
 * Champs richtext volontairement NON couverts, avec leur raison. Toute entrée ici est une
 * dérogation consciente à la règle ci-dessus ; le test de couverture s'appuie dessus.
 */
export const FOOTNOTE_FIELDS_EXEMPT: Record<string, string> = {
	"sofnt:mentionLegalItem.content":
		"La note elle-même : son <sup> d'en-tête est construit par MentionLegal/default.server.tsx, " +
		"qui appelle manageFooterNote explicitement. Un traitement dans str() la traiterait deux fois.",
};

// Pre-computed set of every property name in the registry, so `str` can cheaply skip the
// node-type check for the vast majority of reads (unregistered property names).
const REGISTERED_PROPS = new Set<string>(Object.values(FOOTNOTE_FIELDS).flat());

/**
 * True when the value of `propertyName` on `node` should be footnote-processed, i.e. the
 * pair is declared in `FOOTNOTE_FIELDS`. Cheap property-name pre-check first, node-type
 * check only when the name is a candidate.
 */
export const shouldProcessFootnotes = (node: JCRNodeWrapper, propertyName: string): boolean => {
	if (!REGISTERED_PROPS.has(propertyName)) return false;
	return Object.keys(FOOTNOTE_FIELDS).some(
		(nodeType) => FOOTNOTE_FIELDS[nodeType].includes(propertyName) && node.isNodeType(nodeType),
	);
};
