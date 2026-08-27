/**
 * Un item de fil d'Ariane (une page ou entrée menu de l'arborescence).
 *
 * Construit côté Jahia par `#lib/breadcrumb.buildBreadcrumb()` qui remonte
 * les ancêtres jnt:page + jnt:navMenuText depuis la page courante.
 */
export interface BreadcrumbItem {
	/**
	 * Libellé affiché. Vient de `breadcrumbCustomLabel` si défini sur la page
	 * (mixin `sofmix:breadcrumbOptions`), sinon de `jcr:title`.
	 */
	label: string;
	/**
	 * URL absolue/relative de la page (`buildNodeUrl()`).
	 * Vide pour `jnt:navMenuText` (pas de page navigable derrière).
	 */
	url: string;
	/**
	 * `true` pour la page courante uniquement (= dernier item).
	 * Affiché en `<span>` avec `aria-current="page"`.
	 */
	isCurrent: boolean;
	/**
	 * `true` si l'item est rendu en `<a href>` cliquable.
	 * `false` quand : `jnt:navMenuText`, URL vide, ou page courante.
	 */
	isClickable: boolean;
	id: string;
}

/**
 * Variante visuelle du breadcrumb.
 *  - `onLight` (défaut) — texte sombre sur fond clair, pour pages standard.
 *  - `onDark` — texte clair sur fond navy Sofinco, pour pages dont le 1er
 *    composant a un fond dark (ex: ProductHero, Hero V1-V4).
 *
 * Piloté manuellement par le contributeur Jahia via le mixin
 * `sofmix:breadcrumbOptions.breadcrumbStyle`.
 */
export type BreadcrumbTheme = "onLight" | "onDark";

/**
 * **Contrat "template ↔ DS"** — props minimales fournies par le CMS Jahia.
 *
 * Regroupe les 2 données que TOUT template calcule et passe au composant :
 * la structure `items` (issue de la remontée d'ancêtres) et le `theme`
 * (issu du mixin `sofmix:breadcrumbOptions`).
 *
 * Le helper `buildBreadcrumbLayoutProps(renderContext)` côté template-set
 * retourne directement ce type — 1 appel = 1 objet prêt à spread dans
 * `<Breadcrumb {...breadcrumbLayout} />`.
 */
export interface BreadcrumbLayoutProps {
	/** Liste ordonnée racine → page courante. */
	items: BreadcrumbItem[];
	/**
	 * Variante visuelle. Projeté en attribut `data-theme` sur la racine `<nav>`
	 * et consommé par le CSS Module. Default: `"onLight"`.
	 */
	theme?: BreadcrumbTheme;
}

/**
 * Contrat COMPLET du composant `<Breadcrumb>` — étend `BreadcrumbLayoutProps`
 * avec les props avancées optionnelles (a11y, CSS).
 *
 * Le composant ne produit aucun balisage structuré : le `BreadcrumbList` est
 * construit côté serveur à partir de ces mêmes `items` et publié dans le `@graph`
 * JSON-LD du `<head>`.
 *
 * Un consommateur "template Jahia" n'a besoin que de `BreadcrumbLayoutProps`.
 * Un consommateur "custom" (Storybook, app externe, page one-off) peut passer
 * les props additionnelles pour personnaliser le rendu.
 */
export interface BreadcrumbProps extends BreadcrumbLayoutProps {
	/** Classe CSS additionnelle sur la racine `<nav>`. */
	className?: string;
	/**
	 * Label a11y du landmark `<nav>`. Par défaut "Fil d'Ariane".
	 * À surcharger pour les langues autres que FR.
	 */
	ariaLabel?: string;
}
