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
		// `largeText` suit la regle de maquette appliquee en production par
		// `LARGE_TEXT_ROW_KEYS` (template-set) : on grossit ce que le client compare —
		// mensualite, mensualite ajustee, TAEG, montant total du. Sans ces drapeaux, la
		// colonne « Montant total du » rendait a 16 px, plus PETITE que les lignes
		// agrandies des stories produit : `--highlighted` ne porte plus de font-size.
		rows: [
			{ label: "Mensualités", value: "35 x 94,26 €", largeText: true },
			{ label: "36e mensualité ajustée*", value: "94,19 €", largeText: true },
			{ label: "TAEG Fixe", value: "8,650%", largeText: true },
			{ label: "Taux débiteur fixe", value: "8,187%" },
			{ label: "Frais de dossier", value: "150€" },
			{ label: "Montant total dû", value: "3 543,29 €", highlighted: true, largeText: true },
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
		/*
		 * TOUTES les valeurs ci-dessous viennent de `sofinco-core/src/main/resources/mocks/
		 * revolving_cr_response.json` — la reponse APIM que
		 * `RepresentativeExampleMapper.buildCreditRenouvelable` transforme en lignes. La story
		 * rend donc exactement ce que rend la production, et chaque chiffre est verifiable
		 * dans le mock plutot que recalcule de tete.
		 *
		 * Ce qu'elle affichait avant : « Montant emprunte 30 000 € » pour un total du de
		 * 4 079,64 € — on aurait rembourse SEPT FOIS MOINS que le capital. Les lignes avaient
		 * ete reprises du nouveau CR (3 000 €), mais `exampleAmount` et la mention d'assurance
		 * etaient restes sur l'ancien exemple RAC. Recopie a moitie faite.
		 *
		 * Pas de ligne « Frais de dossier » : `buildCreditRenouvelable` n'en emet pas, le CR
		 * etant structurellement a 0,00 € (cf. le commentaire du mapper Java).
		 */
		exampleAmount: "3 000 €",
		rows: [
			// 36 echeances, la derniere ajustee : le Java rend « (n-1) x montant » + une ligne
			// dediee. installmentWithoutInsurance = { amount: 114.0, lastAmount: 89.92 }.
			{ label: "Mensualités *", value: "35 x 114,00 €", largeText: true },
			{ label: "36e mensualité ajustée*", value: "89,92 €", largeText: true },
			{ label: "Durée", value: "36 mois" },
			{ label: "TAEG révisable **", value: "23,500 %", largeText: true },
			{ label: "Taux débiteur révisable", value: "21,294 %" },
			// totalDueAmountWithoutInsurance = 4079.92 = 35 x 114,00 + 89,92. Coherent.
			{ label: "Montant total dû", value: "4 079,92 €", highlighted: true, largeText: true },
		],
		// Rendu du gabarit `representativeExample.insurance.cr` de `fr.json`, jetons resolus
		// avec les valeurs du mock. Non enveloppe dans un <p> : c'est ce que produit
		// `buildInsuranceText`. Le <p> de `meta.args` illustre l'autre chemin, la mention
		// editoriale saisie en CKEditor.
		insuranceLegalText:
			"Pour un découvert utilisé de 3 000 €, remboursé en 36 mensualités. Avec l'assurance facultative, vos mensualités seront de 35 x 127,00 € et la 36e ajustée de 88,93 €. Le Taux Annuel Effectif de l'Assurance (TAEA) est de 10,123 %. Le coût mensuel additionnel est de 20,14 €, soit un coût total assurance de 420,60 €. Le coût de l'assurance peut varier en fonction de votre situation personnelle.",
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
		/*
		 * TOUTES les valeurs ci-dessous viennent de `sofinco-core/src/main/resources/mocks/
		 * loan_pb_response.json` — la reponse APIM que `RepresentativeExampleMapper.buildLoan`
		 * transforme en lignes (meme constructeur que le rachat de credits, cf. le commentaire
		 * de `LARGE_TEXT_ROW_KEYS`).
		 *
		 * Ce qu'elle affichait avant : « Montant emprunte 30 000 € » pour un total du de
		 * 22 018,08 € — on aurait rembourse MOINS que le capital emprunte. Le TAEG et le taux
		 * debiteur venaient deja de ce mock ; le capital, la mensualite et le total du non.
		 */
		exampleAmount: "15 000 €",
		rows: [
			// installmentWithoutInsurance.amount = 344.03, sur 48 echeances.
			{ label: "Mensualités *", value: "344,03 €", largeText: true },
			{ label: "Durée", value: "48 mois" },
			{ label: "TAEG fixe **", value: "4,900 %", largeText: true },
			{ label: "Taux débiteur fixe", value: "4,793 %" },
			{ label: "Frais de dossier", value: "0,00 €" },
			// totalAmountWithoutInsurance = 16513.44 = 344,03 x 48. Coherent.
			{ label: "Montant total dû", value: "16 513,44 €", highlighted: true, largeText: true },
		],
		// Rendu du gabarit `representativeExample.insurance.pb` de `fr.json`, jetons resolus
		// avec les valeurs du mock (prime 15,75 €/mois, TAEA 2,419 %, cout total 756,00 €).
		insuranceLegalText:
			"Nous vous proposons de souscrire <a href=\"#\">l'assurance emprunteur facultative</a><sup>(5)</sup> pour 15,75 € supplémentaires par mois. Le Taux Annuel Effectif de l'Assurance (TAEA) est de 2,419 %. Le montant total dû au titre de l'assurance est de 756,00 €. Le coût de l'assurance peut varier en fonction de votre situation personnelle.",
		cta: {
			label: "Je simule mon prêt personnel",
			href: "#",
			target: "_self",
			ctaSection: "representative-example-cta",
		},
	},
};
