import type { Meta, StoryObj } from "@storybook/react-vite";

import SimulatorBlock from "./SimulatorBlock";

const meta = {
	title: "B2C/SimulatorBlock",
	component: SimulatorBlock,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		// Pas de `visualStyle` : le type l'interdit (`Omit<TitleProps, "visualStyle">`)
		// et le composant le force à `"none"` — la typo vient de `.simulator-block__title`.
		title: {
			children: "Financez vos projets avec le crédit conso Sofinco",
			as: "h1",
		},
		amountPlaceholder: "J'ai besoin de",
		amountMin: 100,
		amountMax: 999999,
		cta: {
			label: "Je simule mon crédit",
			href: "/parcours-simulateur?idcatorigin=home_page&project=AUTO#/auto-recherche",
			target: "_self",
			ctaSection: "simulator-block-cta",
			variant: "accent",
		},
	},
	argTypes: {
		title: { control: "object" },
		amountPlaceholder: { control: "text" },
		amountMin: { control: "number" },
		amountMax: { control: "number" },
		cta: { control: "object" },
		errorMessage: { control: "text" },
	},
} satisfies Meta<typeof SimulatorBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Error: Story = {
	args: {
		errorMessage: "Le montant ne doit pas dépasser 10 000€",
	},
};

export const NewTab: Story = {
	args: {
		cta: {
			label: "Simuler dans un nouvel onglet",
			href: "/parcours-simulateur?project=WORKS#/montant-financement",
			target: "_blank",
			ctaSection: "simulator-block-cta",
			variant: "accent",
		},
	},
};

export const NoTarget: Story = {
	args: {
		cta: {
			label: "Sans cible (fallback)",
			href: "",
			target: "_self",
			ctaSection: "simulator-block-cta",
			variant: "accent",
		},
	},
};
