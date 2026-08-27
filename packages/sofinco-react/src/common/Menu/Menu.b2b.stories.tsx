import type { Meta, StoryObj } from "@storybook/react-vite";
import type { MenuSection } from "@common/Menu/Menu.type";
import Menu from "./Menu";

/*
 * Site vitrine B2B (« Professionnels ») — maquettes Figma `03. Site Vitrine B2B` :
 * barre 4008:4027, panneaux 4462:3444 / 4265:5964 / 4265:5965 / 4265:5966,
 * barre mobile 4306:4634.
 *
 * Même composant, mêmes mécaniques (Radix, ponts de survol, bascule mobile) que le
 * B2C : seul `variant="b2b"` change, et il ne fait que poser un `data-brand` sur le
 * header. Voir `Menu.b2c.stories.tsx` pour le pendant Particuliers.
 *
 * Libellés et visuels sont repris tels quels des maquettes (ponctuation comprise :
 * l'intitulé « Secteurs d’activité » du panneau porte une apostrophe typographique là où
 * la rubrique de la barre en a une droite). Seuls les `href` sont des espaces réservés —
 * ils ne figurent pas dans Figma, la contribution Jahia les fournit.
 */

/*
 * Visuels des cartes promo, exportés depuis les maquettes. Deux panneaux (« Produits et
 * services » et « Ressources ») portent la même carte « Documentation technique » et donc
 * le même fichier — c'est le cas dans Figma aussi.
 *
 * À récupérer par le nœud `image` de la carte, jamais par la carte elle-même : au niveau
 * de l'instance, le codegen rend le visuel PAR DÉFAUT du composant et non la surcharge
 * (même piège que les libellés de bouton, qui y ressortent en « Label »).
 */
const IMAGE_CANAUX = "/images/samples/Menu/pro-canaux-distribution-navigation-menu.jpg";
const IMAGE_SECTEURS = "/images/samples/Menu/pro-secteurs-activite-navigation-menu.jpg";
const IMAGE_DOCUMENTATION = "/images/samples/Menu/pro-documentation-technique-navigation-menu.jpg";

const sections: MenuSection[] = [
	{
		id: "accueil",
		title: "Accueil",
		href: "/professionnels",
		isActive: true,
		subsections: [],
	},
	{
		id: "produits-et-services",
		title: "Produits et services",
		card: {
			title: "Documentation technique",
			image: IMAGE_DOCUMENTATION,
			cta: { label: "Découvrir", variant: "primary", href: "/professionnels/documentation" },
		},
		subsections: [
			{
				id: "solutions-de-paiement",
				title: "Solutions de paiement",
				links: [
					{ label: "Paiement en 2,3,4 fois CB", href: "/professionnels/paiement-2-3-4-fois" },
					{ label: "Paiement en 10x et plus", href: "/professionnels/paiement-10x-et-plus" },
					{ label: "Paiement différé", href: "/professionnels/paiement-differe" },
				],
			},
			{
				id: "types-de-produit",
				title: "Types de produit",
				links: [
					{ label: "Crédit renouvelable", href: "/professionnels/credit-renouvelable" },
					{ label: "Crédit affecté amortissable", href: "/professionnels/credit-affecte" },
					{ label: "Assurance", href: "/professionnels/assurance" },
				],
			},
			{
				id: "services",
				title: "Services",
				links: [
					{ label: "Accompagnement humain", href: "/professionnels/accompagnement" },
					{ label: "Intégrateurs technique (PSP, CMS)", href: "/professionnels/integrateurs" },
					{ label: "Reporting", href: "/professionnels/reporting" },
				],
			},
		],
	},
	{
		id: "canaux-de-distribution",
		title: "Canaux de distribution",
		card: {
			title: "Comment booster les ventes dans votre magasin",
			image: IMAGE_CANAUX,
			cta: { label: "Lire l'arcticle", variant: "primary", href: "/professionnels/actualites" },
		},
		subsections: [
			{
				id: "canaux",
				title: "Canaux de distribution",
				links: [
					{ label: "Magasins - points de vente", href: "/professionnels/magasins" },
					{ label: "E-commerçants", href: "/professionnels/e-commercants" },
					{ label: "Vente à domicile", href: "/professionnels/vente-a-domicile" },
					{ label: "Vente par téléfone", href: "/professionnels/vente-par-telephone" },
				],
			},
		],
	},
	{
		id: "secteurs-d-activite",
		title: "Secteurs d'activité",
		card: {
			title: "Transition énérgetique",
			image: IMAGE_SECTEURS,
			cta: { label: "Découvrir", variant: "primary", href: "/professionnels/transition-energetique" },
		},
		subsections: [
			{
				id: "secteurs",
				// Apostrophe TYPOGRAPHIQUE (U+2019) : c'est celle de la maquette pour cet
				// intitulé (node 40000025:522). La rubrique de la barre, elle, porte une
				// apostrophe droite (node 40000025:231) — l'écart vient du fichier Figma,
				// il est reproduit tel quel.
				title: "Secteurs d’activité",
				/* La liste bascule en deux colonnes passé cinq entrées (cf. `Sections.module.css`) :
				   l'ordre ci-dessous reproduit les colonnes de la maquette. */
				links: [
					{ label: "Ecotransition", href: "/professionnels/secteurs/ecotransition" },
					{ label: "Mode", href: "/professionnels/secteurs/mode" },
					{ label: "Tourisme & Loisirs", href: "/professionnels/secteurs/tourisme-loisirs" },
					{ label: "Maison & Jardin", href: "/professionnels/secteurs/maison-jardin" },
					{ label: "Rénovation", href: "/professionnels/secteurs/renovation" },
					{ label: "Cuisine", href: "/professionnels/secteurs/cuisine" },
					{ label: "Santé", href: "/professionnels/secteurs/sante" },
					{ label: "Technologie", href: "/professionnels/secteurs/technologie" },
					{ label: "Energie", href: "/professionnels/secteurs/energie" },
				],
			},
		],
	},
	{
		id: "ressources",
		title: "Ressources",
		card: {
			title: "Documentation technique",
			image: IMAGE_DOCUMENTATION,
			cta: { label: "Découvrir", variant: "primary", href: "/professionnels/documentation" },
		},
		subsections: [
			{
				id: "ressources-liens",
				title: "Ressources",
				links: [
					{ label: "Actualités", href: "/professionnels/actualites" },
					{ label: "Témoignages", href: "/professionnels/temoignages" },
					{ label: "Widget de simulation", href: "/professionnels/widget-de-simulation" },
					{ label: "E-books", href: "/professionnels/e-books" },
					{ label: "FAQs", href: "/professionnels/faq" },
				],
			},
		],
	},
	{
		id: "tarifs",
		title: "Tarifs",
		href: "/professionnels/tarifs",
		subsections: [],
	},
];

const meta = {
	title: "Common/Menu/Menu/B2B",
	component: Menu,
	args: {
		variant: "b2b",
		sections,
		logo: {
			// Déclinaison turquoise du logo, lisible sur la barre navy.
			src: "/images/logo/logo_accent.svg",
			alt: "Sofinco",
			label: "Accueil Sofinco Professionnels",
			href: "/professionnels",
		},
		ctaPrimary: {
			label: "Devenir partenaire",
			href: "/professionnels/devenir-partenaire",
		},
		topBarProps: {
			tabs: [
				{ href: "/", label: "Particuliers" },
				{ href: "/professionnels", label: "Professionnels", isActive: true },
			],
		},
	},
} satisfies Meta<typeof Menu>;

export default meta;

type Story = StoryObj<typeof meta>;

/** La barre Pro telle quelle : onglet « Professionnels » actif, rubrique « Accueil » allumée. */
export const Apercu: Story = { name: "Aperçu" };

/**
 * Sans rubrique courante : aucune pastille blanche dans la barre tant que la page
 * visitée ne correspond à aucune entrée de premier niveau.
 */
export const SansRubriqueCourante: Story = {
	name: "Sans rubrique courante",
	args: {
		sections: sections.map((section) => ({ ...section, isActive: false })),
	},
};
