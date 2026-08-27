import type { CtaProps } from "sofinco-react";

/** Une ligne du bloc preview simulateur en édition Jahia. */
export interface SimulatorPreviewItem {
	label: string;
	value: string;
}

/**
 * Bloc preview des paramètres simulateur — édition Jahia.
 *
 * Les paramètres sont portés par la PAGE (`sofmix:simulationParams`, onglet Options) et non
 * plus par le composant : cette vue est un miroir en lecture seule.
 */
export interface SimulatorPreview {
	heading: string;
	/**
	 * `absent` : option non activée sur la page. `incomplete` : activée mais type de crédit
	 * non renseigné — la simulation reste inactive. `ready` : paramètres exploitables.
	 */
	state: "absent" | "incomplete" | "ready";
	/** Message d'explication affiché quand `state` n'est pas `ready`. `items` est alors vide. */
	notice?: string;
	/** Mention d'origine des valeurs, ex. « hérité de la page ». Présent quand `ready`. */
	origin?: string;
	items: SimulatorPreviewItem[];
}

/**
 * Props de la vue serveur en mode édition Jahia.
 *
 * `simulator` affiche un aperçu lisible des paramètres `sim*` du mixin
 * (sourceId, montant, durée, produit, etc.) — équivalent au visuel V1
 * `<RenderChild name="simulator">` mais sans child node.
 */
export interface RepresentativeExampleServerProps {
	title: string;
	subtitle: string;
	/**
	 * Mention d'assurance contribuée, en HTML richtext, **jetons NON résolus**.
	 *
	 * Le contributeur doit relire ce qu'il a écrit — `{{taea}}`, `{{monthlyAmount}}`… — et non
	 * un texte déjà substitué : c'est la seule façon de vérifier ses jetons avant publication.
	 * Les jetons arrivent bruts sans traitement particulier : en édition, `Layout` arme le
	 * registre SANS résolution (`startInsuranceVars(false)`). Aucun appel APIM n'est donc
	 * déclenché pour afficher un formulaire d'édition.
	 *
	 * Vide quand le contributeur n'a rien saisi : le rendu retombe alors sur la mention de la
	 * config de site, puis sur le texte i18n — deux origines qui n'ont pas à être éditées ici.
	 */
	mention?: string;
	simulator?: SimulatorPreview;
	cta?: CtaProps;
}
