import { Fragment, type ReactNode } from "react";
import { splitFootnoteText, hasFootnoteReference } from "./footnoteSegments";
import { footnoteLabel } from "./footnoteLabel";

/**
 * Rend un texte pouvant porter des renvois de note (`⁽³⁾`) en vrais nœuds React.
 *
 * PAS de `dangerouslySetInnerHTML`, PAS de hook, PAS de contexte : émettre des éléments
 * plutôt qu'une chaîne HTML supprime toute question d'échappement et de sanitisation, et
 * surtout garantit un arbre identique côté serveur et côté client. C'est ce qui rend le
 * rendu compatible avec l'hydratation d'un `Island`, là où une passe DOM échouait sur
 * l'erreur React #418.
 *
 * Le balisage produit est celui que `manageFooterNote` construit côté serveur, donc le
 * gestionnaire de clic délégué (`footnote-bootstrap.ts`) le reconnaît sans changement :
 * défilement doux, pas de `#footerN` dans l'URL, et la flèche ↩ de la note revient dessus.
 *
 * Un enfant non-string est retourné tel quel : envelopper un composant existant est donc
 * toujours sans effet de bord.
 *
 * A11Y — le lien porte le même `<span class="sr-only">` que le marqueur construit par
 * `manageFooterNote` côté serveur. Sans lui, un lecteur d'écran annonce « lien ⁽¹⁾ » sans
 * dire de quoi il s'agit : les deux chemins de rendu doivent produire le même balisage,
 * sinon la même note est annoncée différemment selon le composant qui la porte. Le libellé
 * est traduit et résolu au rendu (cf. `footnoteLabel`).
 *
 * @param inert Rendu sans lien, pour un texte déjà situé dans un `<a>` ou un `<button>` —
 *   imbriquer des éléments interactifs est invalide et les navigateurs les désimbriquent
 *   de façon imprévisible. Le renvoi est alors `aria-hidden` : laissé visible, il
 *   rejoindrait le nom accessible du conteneur (« Je profite de l'offre 2 »). L'appelant
 *   rétablit l'information via `footnoteDescribedBy` sur l'élément interactif — c'est ce
 *   que font `Cta` et `Link`.
 */
export function FootnoteText({
	children,
	inert = false,
}: {
	children: ReactNode;
	inert?: boolean;
}): ReactNode {
	if (typeof children !== "string" || !hasFootnoteReference(children)) return children;

	// Nommé `srLabel` — et non `label` — pour dire ce que c'est : le libellé lecteur
	// d'écran de la note, pas un texte contributeur.
	const srLabel = footnoteLabel();

	// Clé = décalage du segment dans la chaîne source : une identité réelle et stable d'un
	// rendu à l'autre, contrairement à l'index de tableau.
	let offset = 0;

	return splitFootnoteText(children).map((segment) => {
		const key = `s${offset}`;
		offset += segment.kind === "text" ? segment.value.length : segment.visible.length;

		if (segment.kind === "text") return <Fragment key={key}>{segment.value}</Fragment>;

		/*
		 * UN VRAI `<sup>`, avec des chiffres ASCII — et non les caractères exposant Unicode
		 * du flux texte.
		 *
		 * Ceux-ci sont répartis sur DEUX blocs Unicode : `¹²³` viennent de Latin-1 Supplement
		 * (couverture quasi universelle), mais `⁰⁴⁵⁶⁷⁸⁹` et les parenthèses `⁽⁾` viennent de
		 * Superscripts and Subscripts, que les polices sur mesure n'embarquent presque jamais.
		 * Mesuré sur ce projet : Figtree n'a ni `⁽` ni `⁾`, Cutta n'a que 3 des 12 caractères.
		 * Résultat à l'écran : les parenthèses de CHAQUE renvoi tombent en police de repli, et
		 * en contexte Cutta la note 3 et la note 4 ne se ressemblent pas — le décrochage se
		 * produit pile après 3, ce que rien ne laisse deviner.
		 *
		 * `<sup>` est aussi l'élément prévu pour ça : le navigateur gère l'élévation (75 % et
		 * `line-height: 0` via modern-normalize, donc sans perturber l'interligne), Ctrl+F
		 * retrouve le chiffre, le copier-coller reste propre, et les synthèses vocales
		 * annoncent le numéro — là où U+2074–U+2079 sont diversement ignorés.
		 *
		 * C'est enfin la MÊME forme que celle produite côté serveur par `manageFooterNote`
		 * (`<sup>(1)</sup>`) : un seul rendu pour les trois chemins.
		 *
		 * Le flux texte, lui, garde la forme Unicode — c'est le seul recours dans `<title>`,
		 * les meta, un `alt` ou un libellé jContent, où aucun balisage n'est possible.
		 *
		 * `footer-ref` signale aussi au script client que ce renvoi est déjà traité.
		 */
		/*
		 * UNE SEULE expression, pas `({segment.number})` en JSX : ce dernier produirait trois
		 * enfants texte adjacents, que `renderToString` sépare par des commentaires
		 * `<!-- -->` pour pouvoir les redécouper à l'hydratation. Le balisage servi serait
		 * `(<!-- -->3<!-- -->)`. Une chaîne unique donne un seul nœud texte, donc `(3)`.
		 */
		const mark = `(${segment.number})`;

		if (inert) {
			return (
				<Fragment key={key}>
					<sup className="footer-ref" aria-hidden="true">
						{mark}
					</sup>
				</Fragment>
			);
		}

		/*
		 * AUCUN `id` : une même note est appelée plusieurs fois dans une page — jusqu'à dix
		 * renvois vers la note 2 sur une page réelle du site. Poser `id="footer2-ref"` sur
		 * chacun produisait dix éléments homonymes, ce que la norme HTML interdit.
		 *
		 * Et cette fonction ne PEUT pas dédupliquer : elle est pure, appelée indépendamment
		 * par chaque composant, sans connaissance du reste de la page — c'est précisément ce
		 * qui garantit un rendu identique côté serveur et à l'hydratation d'un îlot. Toute
		 * tentative de compteur partagé divergerait entre les deux.
		 *
		 * Le retour se résout par `data-footer` : le script client mémorise le marqueur
		 * cliqué, et à défaut vise le premier en ordre document.
		 */
		const id = `footer${segment.number}`;
		return (
			<a key={key} href={`#${id}`} className="footer-link" data-footer={id}>
				<sup className="footer-ref">{mark}</sup>
				{/* Libellé a11y, pas du texte contributeur : il ne porte jamais de renvoi, et
				    l'envelopper ici serait circulaire. `srLabel` est à ce titre listé dans
				    `ignoreNames` (cf. `eslint.config.js`). */}
				<span className="sr-only">{srLabel}</span>
			</a>
		);
	});
}
