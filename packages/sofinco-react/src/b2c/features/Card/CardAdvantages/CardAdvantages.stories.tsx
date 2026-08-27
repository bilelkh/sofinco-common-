import type { Meta, StoryObj } from "@storybook/react-vite";
import { CardAdvantages } from "./index";

const meta = {
	title: "B2C/CardAdvantages",
	component: CardAdvantages,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		title: "Avec la carte de crédit Sofinco, je gère mes dépenses et finance mes projets...",
		subtitle:
			"Paiement comptant ? En plusieurs fois ? Avec la carte Sofinco, choisissez le rythme de paiement qui vous correspond le mieux pour chaque achat.",
		momentsTitle: "... dans tous mes moments de vie",
		momentsSubtitle:
			"Le pouvoir de payer quand vous le souhaitez et de piloter vos finances d'où vous voulez, quand vous le voulez.",
		cardImage: "/images/samples/HomePage/CardAdvantages/carte-bancaire-sofinco-desktop.webp",
		cta: {
			label: "Je découvre la carte",
			href: "#",
			ctaSection: "card-advantages-cta",
		},
		arguments: [
			{
				id: "arg-1",
				title: "Un crédit disponible au quotidien",
				description: "quand j'en ai besoin",
			},
			{
				id: "arg-2",
				title: "Des modalités de paiement qui s'adaptent",
				description: "à chaque envie en trois clics",
			},
			{
				id: "arg-3",
				title: "Une réserve d'argent toujours à portée",
				description: "depuis mon espace client",
			},
		],
		imageDesktop:
			"/images/samples/HomePage/CardAdvantages/carte-bancaire-achat-quotidien-desktop.webp",
	},
} satisfies Meta<typeof CardAdvantages>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
