import type { Meta, StoryObj } from "@storybook/react-vite";

import { ImageHero } from "./ImageHero";
import type { ImageHeroProps } from "./ImageHero.type";

/* Visuel exporté depuis la maquette B2B (« Hero - CR »). En production il vient d'une
   rendition Jahia : ce fichier ne sert qu'à Storybook. */
const IMAGE: ImageHeroProps["image"] = {
	src: "/images/samples/ImageHero/hero-renovation.jpg",
	width: 1628,
	height: 812,
};

const BREADCRUMB: ImageHeroProps["breadcrumb"] = {
	items: [
		{
			id: "home",
			label: "Accueil Solution Pro",
			url: "/pro",
			isCurrent: false,
			isClickable: true,
		},
		{
			id: "sectors",
			label: "Secteur d'activité",
			url: "",
			isCurrent: false,
			isClickable: false,
		},
		{
			id: "renovation",
			label: "Rénovation",
			url: "/pro/secteurs/renovation",
			isCurrent: true,
			isClickable: false,
		},
	],
};

const meta = {
	title: "B2B/ImageHero",
	component: ImageHero,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		title: "Professionnels de la rénovation",
		subtitle: "Des solutions de paiement adaptées à votre métier",
		image: IMAGE,
		cta: { label: "Nous contacter", href: "#contact" },
		breadcrumb: BREADCRUMB,
		overlay: true,
	},
	argTypes: {
		title: { control: "text" },
		subtitle: { control: "text" },
		titleAs: { control: "inline-radio", options: ["h1", "h2"] },
		overlay: { control: "boolean" },
		className: { control: "text" },
		image: { control: false },
		cta: { control: false },
		breadcrumb: { control: false },
	},
} satisfies Meta<typeof ImageHero>;

export default meta;
type Story = StoryObj<typeof meta>;

/** L'assemblage complet de la maquette : fil d'Ariane, titre, accroche et bouton. */
export const Default: Story = {};

/** Sans fil d'Ariane : le contenu reste centré dans le même cadre. */
export const WithoutBreadcrumb: Story = {
	args: {
		breadcrumb: undefined,
	},
};

/** Sans bouton : le bandeau se referme sur le titre et l'accroche. */
export const WithoutCta: Story = {
	args: {
		cta: undefined,
	},
};

/** Titre seul, sans accroche ni bouton. */
export const TitleOnly: Story = {
	args: {
		subtitle: undefined,
		cta: undefined,
	},
};

/**
 * Voile coupé : à réserver aux photos déjà sombres. Sur celle de la maquette, le
 * contraste du texte blanc n'est plus garanti sur le ciel.
 */
export const WithoutOverlay: Story = {
	args: {
		overlay: false,
	},
};

/**
 * Titre long sur deux lignes : le bandeau s'agrandit au lieu de laisser le texte
 * déborder du cadre.
 */
export const LongTitle: Story = {
	args: {
		title: "Professionnels de la rénovation énergétique et de l'amélioration de l'habitat",
	},
};
