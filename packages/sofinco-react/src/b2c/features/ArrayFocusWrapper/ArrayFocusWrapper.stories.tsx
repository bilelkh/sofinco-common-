import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ArrayFocusWrapper } from "./ArrayFocusWrapper";
import type { ArrayFocusWrapperProps } from "./arrayFocusWrapper.types";

const meta: Meta<typeof ArrayFocusWrapper> = {
	title: "B2C/ArrayFocusWrapper",
	component: ArrayFocusWrapper,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof ArrayFocusWrapper>;

const defaultArgs = {
	backgroundColor: "#DFF1FC",
	sectionHeading: {
		title: "Notre crédit renouvelable dans le détail",
		subtitle: "Tous les avantages du Crédit Renouvelable Sofinco en un clin d'œil",
	},
	productFocus: {
		imageSrc:
			"/images/samples/ProductPages/ProductCreditPage/ProductFocus/credit-renouvelable-app-desktop.webp",
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
	},
	seoBlock: {
		title: {
			children: "Le crédit renouvelable, disponible et utilisable à tout moment",
		},
		sections: [
			{
				id: "1",
				content:
					"<p>Solution de financement souple par excellence, le crédit renouvelable accompagne les dépenses du quotidien et les imprévus de la vie. Il se distingue du prêt personnel par sa disponibilité permanente : le montant utilisé se reconstitue au fil des remboursements et reste accessible à tout moment, sans nouvelle souscription. Vous ne payez des intérêts que sur ce que vous utilisez réellement, rien de plus. Pour faire face à une dépense imprévue, financer un achat ponctuel ou gérer ses dépenses courantes, le Crédit Renouvelable Sofinco s'adapte à vos besoins, à votre rythme et à vos projets.</p>",
				color: "primary" as const,
			},
		],
		isCentered: true,
	},
	insuranceFocus: {
		title: {
			children: "Je protège mes projets en toutes circonstances",
			as: "h3" as const,
			visualStyle: "h2" as const,
		},
		description:
			"En cas d'accident de la vie, soyez rassuré : votre assurance Sofinco⁽⁸⁾ prend le relais sur vos mensualités. Votre projet reste protégé pour vous laisser le temps de souffler.",
		imageSrc:
			"/images/samples/ProductPages/ProductCreditPage/InsuranceFocus/assurance-credit-renouvelable-desktop.webp",
		imageAlt: "",
		cta: {
			label: "Je découvre l'assurance",
			href: "/assurance",
			target: "_self" as const,
		},
	},
} satisfies ArrayFocusWrapperProps;

export const Default: Story = {
	args: defaultArgs,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(
			canvas.getByRole("region", { name: "Notre crédit renouvelable dans le détail" }),
		).toBeInTheDocument();
		expect(
			canvas.getByRole("heading", { name: "Notre crédit renouvelable dans le détail" }),
		).toBeInTheDocument();
		expect(canvas.getAllByRole("list")).toHaveLength(2);
		expect(
			canvas.getByRole("heading", {
				name: "Le crédit renouvelable, disponible et utilisable à tout moment",
			}),
		).toBeInTheDocument();
		expect(canvas.getByRole("link", { name: "Je découvre l'assurance" })).toHaveAttribute(
			"href",
			"/assurance",
		);
	},
};

export const DefaultBackground: Story = {
	name: "Fond par défaut",
	args: {
		...defaultArgs,
		backgroundColor: undefined,
	},
};

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
	args: defaultArgs,
};

const pretPersoArgs = {
	backgroundColor: "#DFF1FC",
	sectionHeading: {
		title: "Le Prêt Personnel Sofinco dans le détail :",
		subtitle: "Tous les avantages en un clin d'œil",
	},
	productFocus: {
		imageSrc:
			"/images/samples/ProductPages/ProductLoanPage/ProductFocus/pret-perso-mariage-desktop.webp",
		leftFeatures: [
			{ id: "1", label: "Montant", description: "De 3 001 € à 75 000 €" },
			{
				id: "2",
				label: "Taux",
				description: "TAEG fixe, défini à la souscription, garanti jusqu'au terme",
			},
			{
				id: "3",
				label: "Mensualités",
				description: "Fixes et constantes pendant toute la durée du prêt",
			},
			{
				id: "4",
				label: "Déblocage des fonds(5)",
				description: "Unique, en totalité, sur le compte bancaire du client",
			},
			{ id: "5", label: "Frais de dossier", description: "Aucun" },
			{
				id: "6",
				label: "Assurance emprunteur(7)",
				description: "Facultative, disponible à la souscription",
			},
		],
		rightFeatures: [
			{ id: "7", label: "Durée", description: "De 12 à 120 mois" },
			{
				id: "8",
				label: "Remboursement anticipé",
				description: "Total ou partiel, sans pénalité (dans les limites légales)",
			},
			{
				id: "9",
				label: "Pause mensualité(3)",
				description: "1 fois par semestre (modification ou suspension)",
			},
			{ id: "10", label: "Justificatif d'achat", description: "Non requis (prêt non affecté)" },
			{
				id: "11",
				label: "Souscription",
				description: "100 % en ligne — réponse de principe immédiate(3), signature électronique(2)",
			},
			{
				id: "12",
				label: "Projets éligibles",
				description:
					"Sans restriction : travaux, auto, moto, voyage, équipement, événement familial…",
			},
		],
	},
	seoBlock: {
		title: {
			children: "Les prêts personnels, quelles différences avec les autres solutions de crédit ?",
		},
		sections: [
			{
				id: "1",
				content:
					"<p>Le prêt personnel fait partie des crédits à la consommation et vous permet de financer librement vos projets, sans avoir à justifier vos dépenses. Contrairement à certains crédits liés à un achat précis (comme un véhicule ou un équipement spécifique), il s'adapte à des besoins plus variés et souvent combinés. Par exemple, un voyage peut regrouper plusieurs types de dépenses : transport, hébergement, activités ou dépenses sur place. Avec un prêt personnel, vous pouvez les financer dans leur ensemble avec une seule solution.</p>",
				color: "primary" as const,
			},
		],
		isCentered: true,
	},
	insuranceFocus: {
		title: {
			children: "J'assure mon prêt pour plus de sérénité",
			as: "h3" as const,
			visualStyle: "h2" as const,
		},
		description:
			"En cas d'accident de la vie, soyez rassuré : votre assurance Sofinco⁽⁷⁾ prend le relais sur vos mensualités. Votre projet reste protégé pour vous laisser le temps de souffler.",
		imageSrc:
			"/images/samples/ProductPages/ProductLoanPage/InsuranceFocus/assurance-pret-perso-desktop.webp",
		imageAlt: "",
		cta: {
			label: "Je découvre l'assurance",
			href: "/assurance",
			target: "_self" as const,
		},
	},
} satisfies ArrayFocusWrapperProps;

export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: pretPersoArgs,
};
