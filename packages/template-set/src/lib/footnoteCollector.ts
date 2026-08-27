/*
 * CONTRÔLE DES MENTIONS LÉGALES — REGISTRE, côté serveur.
 *
 * CE FICHIER N'ENREGISTRE, IL N'INTERPRÈTE PAS. L'analyse et l'affichage vivent dans
 * `src/audit/`, qui importe ce registre — jamais l'inverse.
 *
 * Cette frontière n'est pas cosmétique : `footnotes.ts` et `jcr.ts` appellent les fonctions
 * ci-dessous, donc `lib` ne peut pas dépendre du dossier d'audit sans créer une dépendance
 * montante. Le registre est le point d'instrumentation de `str()` ; il a sa place ici.
 *
 * POURQUOI PAS CÔTÉ NAVIGATEUR
 * ----------------------------
 * Une première version inspectait le DOM et affichait un panneau injecté par JavaScript.
 * En mode édition, elle a cassé le Page Builder quatre fois, pour quatre raisons sans
 * rapport entre elles : panneau ajouté sous `<body>` (arbre React de jContent corrompu),
 * puis sous `<html>` (toujours perturbé), réécriture de nœuds de texte par le script des
 * renvois (références de Jahia caduques), et enfin `scrollIntoView` au clic (surcouche
 * décalée). La page du Page Builder n'est pas une page : c'est l'espace de travail de
 * jContent, qui y monte ses zones, y observe les mutations et en mesure la géométrie en
 * continu. Rien d'interactif ne peut y cohabiter.
 *
 * D'où ce renversement : on ne regarde plus le résultat, on écoute la PRODUCTION. Tout
 * texte contributeur traverse déjà `footnotes.ts` — `superscriptFootnoteTokens` voit chaque
 * jeton `((n))`, `addFooterNote` chaque marqueur richtext, `addIdToParagraph` chaque
 * mention. Il suffit de noter au passage. Le contrôle devient alors du HTML statique rendu
 * par le serveur : zéro JavaScript, zéro mutation, zéro défilement — donc rien qui puisse
 * gêner le Page Builder, par construction et non par précaution.
 *
 * PORTÉE : un rendu de page. `Layout` réarme la collecte en tête de son propre rendu, donc
 * avant tout descendant ; le composant de contrôle, placé APRÈS `{children}`, lit le
 * résultat. Le rendu serveur est synchrone et en profondeur d'abord, ce qui garantit cet
 * ordre — c'est la même hypothèse que celle déjà utilisée pour le libellé a11y.
 *
 * COÛT EN PRODUCTION : nul. `active` reste faux hors mode édition, et chaque point de
 * collecte se réduit alors à un test de booléen.
 */

/**
 * Où un renvoi a été rencontré. Sans cette information, le contributeur sait qu'une mention
 * manque mais pas OÙ la corriger — et en mode édition, la plupart des composants rendent une
 * variante serveur sans marqueur cliquable : viser le composant est le seul repère fiable,
 * et de toute façon le plus utile puisque c'est lui qu'il faut ouvrir.
 */
export interface FootnoteLocation {
	/** Identifiant JCR du nœud — le Page Builder en fait l'`id` du module qu'il enveloppe. */
	id: string;
	/** Chemin du nœud, sélecteur de repli selon la version de Jahia. */
	path: string;
	/**
	 * Nom de la propriété lue, ex. `subtitle`. C'est elle, et non le seul nœud, qui définit
	 * l'unité de correction : un même composant peut porter la même erreur dans son titre,
	 * son sous-titre, sa description et son richtext — quatre champs à corriger séparément.
	 */
	property: string;
	/** Libellé lisible, ex. « Section Hero — subtitle ». */
	label: string;
}

/** Un renvoi rencontré pendant le rendu. */
export interface FootnoteReference {
	/** Clé telle qu'écrite par le contributeur : `"1"`, `"55"`, ou `"abc"` si invalide. */
	key: string;
	/** Composant et propriété d'origine, quand ils sont connus. */
	location: FootnoteLocation | null;
}

/** Une mention légale rendue pendant le rendu. */
export interface FootnoteNote {
	key: string;
	/**
	 * Type de nœud d'où elle provient, ex. `"sofnt:footer"`. Sert à ne pas signaler comme
	 * « jamais citée » une mention du pied de page : celui-ci est identique sur tout le site,
	 * son texte légal appartient au site et non à la page en cours.
	 */
	source: string;
}

export interface FootnoteCollection {
	references: FootnoteReference[];
	notes: FootnoteNote[];
}

let active = false;
let references = new Map<string, FootnoteReference>();
let notes = new Map<string, FootnoteNote>();
let location: FootnoteLocation | null = null;

/**
 * (Ré)arme la collecte pour un rendu de page. Appelé par `Layout`, avant les descendants.
 *
 * @param enabled Faux hors mode édition : la collecte est alors entièrement inerte.
 */
export const startFootnoteCollection = (enabled: boolean): void => {
	active = enabled;
	references = new Map();
	notes = new Map();
	location = null;
};

/**
 * Déclare le composant et la propriété en cours de lecture. Posé par `str()` (lib/jcr.ts),
 * qui est le passage obligé de tout texte contributeur — les points de collecte, eux, sont
 * de simples fonctions de chaîne et n'ont aucun accès au JCR.
 */
export const setFootnoteLocation = (next: FootnoteLocation | null): void => {
	if (active) location = next;
};

/** Vrai quand la collecte est armée — permet aux points d'appel de sortir immédiatement. */
export const isCollectingFootnotes = (): boolean => active;

/**
 * Composant et propriété en cours de lecture, tels que posés par `str()`.
 *
 * Exposé pour que d'AUTRES contrôles éditoriaux situent leurs anomalies sans réimplémenter la
 * capture — c'est le cas des variables de simulation non résolues (`insuranceVars.ts`), qui
 * sont détectées au même endroit, dans le même passage de `str()`. Renvoie `null` hors mode
 * édition : la collecte y est inerte, et le repère n'a alors aucun usage.
 */
export const readFootnoteLocation = (): FootnoteLocation | null => (active ? location : null);

/**
 * Note un renvoi — UNE ENTRÉE PAR CHAMP, pas une par mention ni une par composant.
 *
 * Un même `((50))` erroné peut être écrit dans cinq composants, ou dans quatre champs d'un
 * SEUL composant — titre, sous-titre, description, richtext. N'en montrer qu'un obligerait
 * le contributeur à chercher les autres à l'aveugle et à corriger en plusieurs passes.
 *
 * La déduplication porte donc sur (clé, composant, PROPRIÉTÉ) : l'unité de correction est le
 * champ. Deux occurrences dans le même champ ne font qu'une ligne — elles se corrigent d'un
 * seul geste.
 */
export const collectFootnoteReference = (key: string): void => {
	if (!active || !key) return;
	const slot = location ? `${key}@${location.id}@${location.property}` : key;
	if (references.has(slot)) return;
	references.set(slot, { key, location });
};

/** Note une mention légale rendue. */
export const collectFootnoteNote = (key: string, source: string): void => {
	if (!active || !key || notes.has(key)) return;
	notes.set(key, { key, source });
};

/** Ce qui a été rencontré pendant le rendu de la page. */
export const readFootnoteCollection = (): FootnoteCollection => ({
	references: [...references.values()],
	notes: [...notes.values()],
});
