import type { Meta, StoryObj } from "@storybook/react-vite";
import { RepresentativeExample } from "./index.js";

const meta = {
	title: "B2C/RepresentativeExample",
	component: RepresentativeExample,
	parameters: {
		layout: "fullscreen",
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["pretPerso", "creditRenouvelable", "rachatCredit"],
		},
	},
	args: {
		variant: "creditRenouvelable",

		// Exemple illustratif cohérent (valeurs recalculées, non issues d'une offre réelle).
		title: "On vous dit tout !",
		subtitle:
			"<p>Zéro frais dissimulés, totale transparence sur les conditions de votre crédit renouvelable, elle est pas belle la vie ? La simulation en un coup d'œil c'est par ici :</p>",
		amountLabel: "Montant emprunté",
		exampleAmount: "3 000 €",
		rows: [
			{ label: "Mensualités", value: "35 x 94,26 €" },
			{ label: "36e mensualité ajustée*", value: "94,19 €" },
			{ label: "TAEG Fixe", value: "8,650%" },
			{ label: "Taux débiteur fixe", value: "8,187%" },
			{ label: "Frais de dossier", value: "150€" },
			{ label: "Montant total dû", value: "3 543,29 €", highlighted: true },
		],
		insuranceLegalText:
			"<p>Nous vous proposons de souscrire <a href=\"/assurance-emprunteur\">l'assurance emprunteur facultative(4)</a> pour 3,75 € supplémentaires par mois. Le Taux Annuel Effectif de l'Assurance (TAEA) est de 2,550 %. Le montant total dû au titre de l'assurance est de 135,00 €.</p>",
		cta: {
			label: "Simuler mon crédit renouvelable",
			href: "#",
			target: "_self",
			ctaSection: "representative-example-cta",
		},
	},
} satisfies Meta<typeof RepresentativeExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CarteBancaire: Story = {
	name: "Carte bancaire (page produit)",
};

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
	args: {
		variant: "creditRenouvelable",
		title: "Pour ne rien vous cacher...",
		subtitle:
			"<p>Zéro frais dissimulés, totale transparence sur les conditions de votre crédit renouvelable ? La simulation en un coup d'œil c'est par ici :</p>",
		amountLabel: "Montant emprunté",
		exampleAmount: "30 000 €",
		rows: [
			{ label: "Mensualité", value: "429,07 €" },
			{ label: "Durée", value: "96 mois" },
			{ label: "TAEG Fixe", value: "8,650%" },
			{ label: "Taux débiteur fixe", value: "8,187%" },
			{ label: "Frais de dossier", value: "150€" },
			{ label: "Montant total dû", value: "41 340,72 €", highlighted: true },
		],
		insuranceLegalText:
			"<p>Assurance emprunteur facultative (Assur Agil)(8) : TAEA 2,550 %. Montant total dû avec assurance : 44 940,72 €. La première prime est la plus élevée (38,25 €). Le coût de l'assurance peut varier selon votre situation personnelle.</p>",
		cta: {
			label: "Je simule mon crédit renouvelable",
			href: "#",
			target: "_self",
			ctaSection: "representative-example-cta",
		},
	},
};

export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: {
		variant: "pretPerso",
		title: "On vous dit tout...",
		subtitle:
			"<p>Avec Sofinco, vous connaissez à l'avance les conditions de votre prêt personnel, sans frais dissimulés. Découvrez un exemple de prêt personnel, et faites votre simulation en ligne en quelques clics :</p>",
		amountLabel: "Montant emprunté",
		exampleAmount: "30 000€",
		rows: [
			{ label: "Mensualité", value: "429,07 €" },
			{ label: "Durée", value: "96 mois" },
			{ label: "TAEG Fixe", value: "8,650%" },
			{ label: "Taux débiteur fixe", value: "8,187%" },
			{ label: "Frais de dossier", value: "150€" },
			{ label: "Montant total dû", value: "41 340,72 €", highlighted: true },
		],
		insuranceLegalText:
			"<p>Assurance emprunteur facultative (Assur Agil) (5) : TAEA 2,550 %. Montant total dû avec assurance : 44 940,72 €. La première prime est la plus élevée (38,25 €). Le coût de l'assurance peut varier selon votre situation personnelle.</p>",
		cta: {
			label: "Je simule mon prêt personnel",
			href: "#",
			target: "_self",
			ctaSection: "representative-example-cta",
		},
	},
};
