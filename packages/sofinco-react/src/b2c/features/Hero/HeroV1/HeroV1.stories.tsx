import type { Meta, StoryObj } from "@storybook/react-vite";
import HeroV1 from "./HeroV1";

const meta: Meta<typeof HeroV1> = {
	title: "B2C/Hero/HeroV1",
	component: HeroV1,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof HeroV1>;

const defaultArgs = {
	variant: "v1" as const,
	title: "Gérez vos dépenses. Financez vos projets.",
	subtitle:
		"Avec Sofinco, vous pilotez votre argent à votre rythme. Des outils simples et clairs, pensés pour la vraie vie",
	img: {
		lowSrc:
			"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=20&q=1",
		desktopSrc:
			"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=100",
		tabletSrc:
			"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1024&q=90",
		mobileSrc:
			"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=640&h=1000&q=80",
	},
	args: [
		{ id: "1", label: "Suivi de mes prêts" },
		{ id: "2", label: "Paiement différé ou fractionné" },
		{ id: "3", label: "Pilotage de ma réserve" },
	],
};

export const Default: Story = {
	args: defaultArgs,
};

export const WithSimulator: Story = {
	args: {
		...defaultArgs,
		simulator: {
			simulatorTitle: "Financez vos projets avec le crédit conso Sofinco",
			amountPlaceholder: "Montant souhaité",
			amountMin: 500,
			amountMax: 75000,
			cta: {
				label: "Je découvre mes conditions",
				href: "#",
				target: "_self",
				variant: "accent",
			},
		},
	},
};

export const WithoutSimulator: Story = {
	name: "Sans simulateur",
	args: {
		...defaultArgs,
		simulator: undefined,
	},
};
