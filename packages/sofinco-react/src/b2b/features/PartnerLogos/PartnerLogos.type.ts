/**
 * Un logo partenaire de la bande.
 *
 * Le visuel est une image de contenu (rendition Jahia) : le composant ne fournit
 * aucune illustration par défaut. Il est affiché sur une hauteur fixe de 24 px,
 * largeur libre — c'est la règle de la maquette, qui aligne des logos de rapports
 * très différents (24 px de large pour Darty, 216 px pour Printemps).
 */
export interface PartnerLogoItem {
	/** Identifiant stable — sert de clé React. */
	id: string;
	/** URL du visuel (SVG de préférence, sinon WebP). */
	src: string;
	/**
	 * Nom de l'enseigne.
	 *
	 * Omis ou vide, le logo est rendu décoratif (`alt=""` + `aria-hidden`). C'est le
	 * défaut assumé : une bande de marques est une illustration de réassurance, et
	 * une énumération de « logo Machin » n'apporte rien à un lecteur d'écran. Le
	 * renseigner bascule le logo en image de contenu, à réserver aux enseignes dont
	 * le nom porte l'argument.
	 */
	alt?: string;
	/**
	 * Dimensions intrinsèques du fichier, transmises à `<Image>` pour réserver la
	 * place avant décodage (CLS). La hauteur rendue reste imposée par le CSS.
	 */
	width?: number;
	height?: number;
}

export interface PartnerLogosProps {
	/**
	 * Titre du bloc, rendu en H2. Contribué dans Jahia ; ni la taille ni la couleur
	 * ne sont paramétrables.
	 */
	title?: string;
	/** Logos de la bande, dans l'ordre de contribution. */
	logos: PartnerLogoItem[];
	/**
	 * Défilement continu de la bande (défaut `true`).
	 *
	 * `false` fige les logos sur une rangée centrée qui passe à la ligne. Prévu pour
	 * les contextes où une bande en mouvement gêne — un outil de contribution, où les
	 * vignettes doivent rester sélectionnables, ou une capture de page.
	 */
	animated?: boolean;
	/**
	 * Nom accessible de la section, quand le bloc est contribué sans titre. Ignoré
	 * dès qu'un `title` est présent : la section est alors nommée par son titre.
	 */
	ariaLabel?: string;
	/** Classe additionnelle appliquée à la `<section>`. */
	className?: string;
}
