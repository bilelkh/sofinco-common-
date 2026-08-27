import type { Meta, StoryObj } from "@storybook/react-vite";

import HeroSimulator from "./HeroSimulator";

const meta = {
	title: "B2C/Hero/HeroSimulator",
	component: HeroSimulator,
	args: {
		simulatorTitle: "Financez vos projets avec le crédit conso Sofinco",
		amountPlaceholder: "J'ai besoin de",
		amountMin: 100,
		amountMax: 999999,
		cta: {
			label: "Je simule mon crédit",
			href: "#simulation",
		},
	},
	argTypes: {
		errorMessage: { control: "text" },
	},
} satisfies Meta<typeof HeroSimulator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Error: Story = {
	args: {
		errorMessage: "Le montant ne doit pas dépasser 10 000€",
	},
};
