import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProductFocus } from "./ProductFocus";

const meta: Meta<typeof ProductFocus> = {
	title: "B2C/ProductFocus",
	component: ProductFocus,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof ProductFocus>;

const defaultArgs = {
	title: {
		children: "Notre crédit renouvelable dans le détail",
		as: "h2" as const,
	},
	subtitle: "Tous les avantages du Crédit Renouvelable Sofinco en un clin d'œil",
	imageSrc:
		"/images/samples/ProductPages/ProductCreditPage/ProductFocus/credit-renouvelable-app-desktop.webp",
	backgroundColor: "#D8ECF9",
	leftFeatures: [
		{ id: "1", label: "Montant", description: "De 1 501 € à 10 000 €" },
		{ id: "2", label: "Taux", description: "TAEG révisable — défini par tranches d'encours" },
		{
			id: "3",
			label: "Coût si non utilisé",
			description: "Aucun intérêt tant qu'il n'y a pas de mouvement",
		},
		{
			id: "4",
			label: "Augmentation de capital",
			description: "Possible dès 6 mois de vie du contrat",
		},
		{
			id: "5",
			label: "Assurance emprunteur",
			description: "Facultative, disponible à la souscription(8)",
		},
	],
	rightFeatures: [
		{
			id: "6",
			label: "Durée maximale",
			description: "36 mois (encours ≤ 3 000 €) / 60 mois (encours > 3 000 €)",
		},
		{
			id: "7",
			label: "Frais de dossier",
			description: "Aucun frais de dossier, de gestion, ni de remboursement anticipé",
		},
		{ id: "8", label: "Report d'échéance", description: "Après trois mois d'activation(3)" },
		{
			id: "9",
			label: "Souscription",
			description: "100 % en ligne — réponse de principe immédiate(4), signature électronique(5)",
		},
		{
			id: "10",
			label: "Projets éligibles",
			description:
				"Travaux, auto, moto, voyage, équipement, événement familial… et bien d'autres besoins du quotidien.",
		},
	],
};

export const Default: Story = {
	args: defaultArgs,
};

export const UnevenFeatures: Story = {
	name: "Nombre d'arguments inégal",
	args: {
		...defaultArgs,
		leftFeatures: defaultArgs.leftFeatures.slice(0, 3),
		rightFeatures: defaultArgs.rightFeatures.slice(0, 2),
	},
};

export const NoHeader: Story = {
	name: "Sans en-tête",
	args: {
		...defaultArgs,
		title: undefined,
		subtitle: undefined,
	},
};
