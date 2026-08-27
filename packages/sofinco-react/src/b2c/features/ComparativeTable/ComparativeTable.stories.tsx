import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComparativeTable } from "./ComparativeTable";

const meta = {
	title: "B2C/ComparativeTable",
	component: ComparativeTable,

	args: {
		title: "Crédit renouvelable ou prêt personnel(7) ?",

		subtitle:
			"Je compare et choisis ce qui me convient le mieux. Tout pour y voir plus clair et décider quelle solution s'adapte le mieux à vos besoins",

		rowHeaderLabel: "Critère",

		leftColumnLabel: "Crédit renouvelable",

		rightColumnLabel: "Prêt personnel",

		leftColumnButton: {
			label: "Demander un crédit renouvelable",
			href: "#",
			variant: "primary",
			ctaSection: "comparative-table-left-cta",
		},

		rightColumnButton: {
			label: "Découvrir le prêt personnel",
			href: "#",
			variant: "accent",
			ctaSection: "comparative-table-right-cta",
		},

		rows: [
			{
				id: "1",
				label: "Montant",
				leftValue: {
					label: "Jusqu'à 10 000 €",
				},
				rightValue: {
					label: "De 3 001 € à 75 000 €",
				},
			},
			{
				id: "2",
				label: "Taux",
				leftValue: {
					label: "TAEG révisable",
				},
				rightValue: {
					label: "TAEG fixe garanti",
				},
			},
			{
				id: "3",
				label: "Mensualités",
				leftValue: {
					label: "Flexible",
				},
				rightValue: {
					label: "Fixes et constantes",
				},
			},
			{
				id: "4",
				label: "Durée",
				leftValue: {
					label: "36 à 60 mois",
				},
				rightValue: {
					label: "12 à 120 mois",
				},
			},
			{
				id: "5",
				label: "Reconstitution auto",
				leftValue: {
					label: "Oui",
					icon: "check-valid",
				},
				rightValue: {
					label: "Non",
					icon: "x-invalid",
				},
			},
			{
				id: "6",
				label: "Carte de paiement",
				leftValue: {
					label: "Oui (dès 1 000 €)",
					icon: "check-valid",
				},
				rightValue: {
					label: "Non",
					icon: "x-invalid",
				},
			},
			{
				id: "7",
				label: "Justificatifs d'achat",
				leftValue: {
					label: "Non requis",
				},
				rightValue: {
					label: "Non requis",
				},
			},
			{
				id: "8",
				label: "Idéal pour",
				leftValue: {
					label: "Imprévus, dépenses courantes",
				},
				rightValue: {
					label: "Projet défini, montant précis",
				},
			},
		],
	},
} satisfies Meta<typeof ComparativeTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
};

export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: {
		title: "Prêt Personnel ou Crédit Renouvelable(6)",
		subtitle: "Je compare et choisis ce qui me convient le mieux",
		rowHeaderLabel: "Critère",
		leftColumnLabel: "Prêt perso",
		rightColumnLabel: "Crédit renouvelable",
		leftColumnButton: {
			label: "Demander un prêt personnel",
			href: "#",
			variant: "primary",
			ctaSection: "comparative-table-left-cta",
		},
		rightColumnButton: {
			label: "Découvrir le crédit renouvelable",
			href: "#",
			variant: "accent",
			ctaSection: "comparative-table-right-cta",
		},
		rows: [
			{
				id: "1",
				label: "Montant",
				leftValue: { label: "De 3 001 € à 75 000 €" },
				rightValue: { label: "De 150 € à 10 000 €" },
			},
			{
				id: "2",
				label: "Taux",
				leftValue: { label: "TAEG fixe garanti" },
				rightValue: { label: "TAEG révisable" },
			},
			{
				id: "3",
				label: "Mensualités",
				leftValue: { label: "Fixes et constantes" },
				rightValue: { label: "Flexibles" },
			},
			{
				id: "4",
				label: "Durée",
				leftValue: { label: "12 à 120 mois" },
				rightValue: { label: "36 à 60 mois" },
			},
			{
				id: "5",
				label: "Reconstitution auto",
				leftValue: { label: "Non", icon: "x-invalid" },
				rightValue: { label: "Oui", icon: "check-valid" },
			},
			{
				id: "6",
				label: "Déblocage fonds",
				leftValue: { label: "Unique, en totalité" },
				rightValue: { label: "Au fur et à mesure" },
			},
			{
				id: "7",
				label: "Justificatifs d'achat",
				leftValue: { label: "Non requis" },
				rightValue: { label: "Non requis" },
			},
			{
				id: "8",
				label: "Idéal pour",
				leftValue: { label: "Projet défini, montant précis" },
				rightValue: { label: "Imprévus, dépenses courantes" },
			},
		],
	},
};
