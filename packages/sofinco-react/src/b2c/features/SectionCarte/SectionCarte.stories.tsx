import type { Meta, StoryObj } from "@storybook/react-vite";

import SectionCarte from "./SectionCarte";

const meta = {
	title: "B2C/SectionCarte",
	component: SectionCarte,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		title:
			"Avec la Carte Sofinco⁽⁶⁾ associée à mon crédit renouvelable, je gagne en liberté de paiement",
		subtitle:
			"Une carte de crédit associée à un crédit renouvelable pour gérer vos achats à votre rythme.",
		imageUrl:
			"/images/samples/ProductPages/ProductCreditPage/SectionCarte/carte-bancaire-credit-renouvelable-desktop.webp",
		imageAlt: "Une personne tenant la Carte Sofinco",
		contentTitle: "Avec votre Crédit Renouvelable, demandez gratuitement votre Carte Sofinco",
		contentText:
			"C’est simple, à chaque paiement par carte, vous choisissez comment rembourser votre achat.",
		items: [
			{ id: "1", label: "Je règle en magasin, en ligne sans faire de virement préalable" },
			{ id: "2", label: "Je choisis de payer au comptant différé ou en plusieurs fois" },
			{ id: "3", label: "Je retire mon argent au distributeur automatique" },
		],
		ctaLabel: "En savoir plus sur la carte Sofinco",
		ctaUrl: "#",
	},
} satisfies Meta<typeof SectionCarte>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutSubtitle: Story = {
	args: {
		subtitle: undefined,
	},
};
