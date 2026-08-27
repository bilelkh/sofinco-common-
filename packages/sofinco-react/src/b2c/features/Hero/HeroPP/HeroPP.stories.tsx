import type { Meta, StoryObj } from "@storybook/react-vite";
import HeroPP from "./HeroPP";

const meta: Meta<typeof HeroPP> = {
	title: "B2C/Hero/HeroPP",
	component: HeroPP,
	parameters: { layout: "fullscreen", backgrounds: { default: "dark" } },
};

export default meta;

type Story = StoryObj<typeof meta>;

const defaultArgs = {
	breadcrumb: [
		{ href: "/", label: "Accueil Sofinco" },
		{ href: "/pret-personnel", label: "Prêt personnel" },
	],
	eyebrow: "Prêt personnel",
	title: {
		children: "Grâce au prêt perso, je donne vie à mon projet maintenant !",
		as: "h1" as const,
	},
	// HTML contributeur (CKEditor, barre `Description`) : gras, exposant de
	// renvoi et taille `rt-text-*` — les trois leviers ouverts au wysiwyg.
	description: `<p>Avec le <strong>prêt personnel</strong>, empruntez jusqu'à <span class="rt-text-xl">75 000 €</span> à taux fixe<sup>(1)</sup>, avec des mensualités définies à l'avance et sans variation inattendue.</p>`,
	cta: {
		label: "Je simule mon prêt",
		href: "#",
		variant: "accent" as const,
	},
	avis: {
		avisLogoUrl: "/images/logo/avis-verifies-dark.svg",
		avisTitle: "Avis Vérifiés",
		ratingScore: 4.4,
		ratingReviewsCount: 5646,
		variant: "red" as const,
		theme: "light" as const,
	},
	offerCard: {
		infoBlock: {
			rate: "4,50%",
			rateLabel: "TAEG FIXE",
			details: `<b>pour 15 000 € à 20 000€ de 13 à 48 mois</b> jusqu’au 24 juin 2026 <a href="#">Mensualités flexibles<sup>1</sup></a>`,
		},
		imgSrc: "/images/samples/pret-perso-hero-desktop.webp",
		imgAlt: "Couple avec des valises",
	},
};

export const Default: Story = {
	args: defaultArgs,
};

export const WithoutAvis: Story = {
	args: { ...defaultArgs, avis: undefined },
};

export const WithoutInfoBlock: Story = {
	args: {
		...defaultArgs,
		offerCard: { ...defaultArgs.offerCard, infoBlock: undefined },
	},
};

/** `description` non contribuée : le bloc disparaît, sans laisser de vide. */
export const WithoutDescription: Story = {
	args: { ...defaultArgs, description: "" },
};

/** Texte brut : le champ accepte du HTML mais n'en exige pas. */
export const PlainTextDescription: Story = {
	args: {
		...defaultArgs,
		description:
			"Avec le prêt personnel, empruntez jusqu'à 75 000 € à taux fixe, avec des mensualités définies à l'avance.",
	},
};
export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: defaultArgs,
};

const carteBancaireArgs = {
	breadcrumb: [
		{ href: "/", label: "Accueil Sofinco" },
		{ href: "/cartes-sofinco", label: "Cartes Sofinco" },
	],
	eyebrow: "Cartes Sofinco",
	title: {
		children: "Je prends le pouvoir avec la carte Sofinco⁽¹⁾",
		as: "h1" as const,
	},
	description:
		"Vous êtes plutôt paiement comptant ou paiement en plusieurs fois ? Plus besoin de choisir ! Avec la carte Sofinco ⁽¹⁾, associée à votre crédit renouvelable, choisissez le rythme de paiement qui correspond le mieux à vos achats. Et grâce à l'app Sofinco, vous gérez tout en temps réel !",
	cta: {
		label: "Je commande ma carte",
		href: "#",
		variant: "accent" as const,
	},
	avis: defaultArgs.avis,
	offerCard: {
		imgSrc:
			"/images/samples/ProductPages/ProductCardPage/Hero/carte-bancaire-sofinco-hero-desktop.webp",
		imgAlt: "Un homme tenant fièrement sa carte de crédit Sofinco.",
	},
};

export const CarteBancaire: Story = {
	name: "Carte bancaire (page produit)",
	args: carteBancaireArgs,
};

// Le sous-titre en gras de la maquette ("Jusqu'à 10 000 € disponibles en 48
// h(2).") n'a pas de champ dédié dans HeroPPProps (un seul `description`,
// sans support HTML/gras via FootnoteText) — fusionné dans la description.
const creditRenouvelableArgs = {
	breadcrumb: [
		{ href: "/", label: "Accueil Sofinco" },
		{ href: "/credit-renouvelable", label: "Crédit renouvelable" },
	],
	eyebrow: "Crédit renouvelable",
	title: {
		children: "Un crédit disponible quand j'en ai besoin⁽¹⁾",
		as: "h1" as const,
	},
	description:
		"Jusqu'à 10 000 € disponibles en 48 h⁽²⁾. Le crédit renouvelable est directement associé à votre carte de crédit. Le petit plus ? Aucun intérêt tant que vous ne l'utilisez pas.",
	cta: {
		label: "Je simule mon crédit",
		href: "#",
		variant: "accent" as const,
	},
	avis: defaultArgs.avis,
	offerCard: {
		imgSrc:
			"/images/samples/ProductPages/ProductCreditPage/Hero/credit-renouvelable-hero-desktop.webp",
		imgAlt: "Un smartphone affichant le montant disponible du crédit renouvelable Sofinco.",
	},
};

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
	args: creditRenouvelableArgs,
};
