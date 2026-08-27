import type { Meta, StoryObj } from "@storybook/react-vite";
import { MentionLegal } from "./MentionLegal";

const meta: Meta<typeof MentionLegal> = {
	title: "B2C/MentionLegal",
	component: MentionLegal,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof MentionLegal>;

const defaultArgs = {
	title: "Voir les conditions de l'offre",
	initiallyOpen: true,
	items: [
		{
			anchorId: "mention-1",
			content:
				"(1) Vous pouvez utiliser votre Crédit Renouvelable en effectuant des virements de fonds en 48h (hors week-end et jours fériés) sur votre compte bancaire dès la fin de l'interdiction légale de mise à disposition des fonds.",
		},
		{
			anchorId: "mention-2",
			content:
				"(2) La diminution du montant des mensualités entraîne l'allongement de la durée de remboursement et majore le coût total du crédit. La pause mensualité est possible 2 fois par an sur 12 mois, dès lors que votre dossier a plus de 3 mois, sous réserve du bon fonctionnement de votre crédit.",
		},
		{
			anchorId: "mention-3",
			content:
				"(3) Offre de Crédit Renouvelable sous réserve d'acceptation définitive après étude des pièces justificatives demandées par CA Consumer Finance prêteur dont Sofinco est une marque, SA au capital de 629 480 046 €. 1 rue Victor Basch – CS 70001 – 91068 MASSY Cedex, 542 097 522 RCS Evry.",
		},
	],
};

export const Default: Story = {
	args: defaultArgs,
};

export const Replie: Story = {
	name: "Replié au chargement",
	args: {
		...defaultArgs,
		initiallyOpen: false,
	},
};

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
	args: {
		...defaultArgs,
		initiallyOpen: false,
	},
};


export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: {
		...defaultArgs,
		initiallyOpen: false,
	},
};
