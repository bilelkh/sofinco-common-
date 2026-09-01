import type { Meta, StoryObj } from "@storybook/react-vite";

import { PartnerLogos } from "./PartnerLogos";
import type { PartnerLogoItem } from "./PartnerLogos.type";

/* Logos exportés depuis la maquette B2B. En production ils viennent des renditions
   Jahia : ces fichiers ne servent qu'à Storybook. */
const LOGOS: PartnerLogoItem[] = [
	{ id: "printemps", src: "/images/samples/PartnerLogos/printemps.svg", width: 216, height: 24 },
	{ id: "brico-depot", src: "/images/samples/PartnerLogos/brico-depot.svg", width: 40, height: 24 },
	{ id: "fnac", src: "/images/samples/PartnerLogos/fnac.svg", width: 71, height: 24 },
	{ id: "castorama", src: "/images/samples/PartnerLogos/castorama.svg", width: 190, height: 24 },
	{ id: "darty", src: "/images/samples/PartnerLogos/darty.svg", width: 24, height: 24 },
];

const meta = {
	title: "B2B/PartnerLogos",
	component: PartnerLogos,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		title:
			"Rejoignez les 15 000 entreprises partenaires qui nous font confiance pour booster leurs ventes.",
		logos: LOGOS,
		animated: true,
	},
} satisfies Meta<typeof PartnerLogos>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Bande figée : les logos passent à la ligne et se centrent au lieu de défiler. */
export const Static: Story = {
	args: {
		animated: false,
	},
};

/**
 * Deux enseignes seulement : la liste s'étale sur toute la largeur au lieu de se tasser
 * à gauche, et le ruban boucle sans laisser de trou.
 */
export const TwoLogos: Story = {
	args: {
		logos: LOGOS.slice(0, 2),
	},
};

/** Sans titre, la section est nommée par `ariaLabel`. */
export const WithoutTitle: Story = {
	args: {
		title: undefined,
		ariaLabel: "Nos partenaires",
	},
};

/**
 * `alt` renseigné : le logo bascule en image de contenu et l'enseigne est annoncée.
 * À réserver aux marques dont le nom porte l'argument.
 */
export const NamedLogos: Story = {
	args: {
		logos: LOGOS.map((logo) => ({
			...logo,
			alt: logo.id.replace(/-/g, " "),
		})),
	},
};
