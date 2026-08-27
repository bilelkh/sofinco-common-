import type { Meta, StoryObj } from "@storybook/react-vite";
import { OfferComparisonTable } from "./OfferComparisonTable";

const meta: Meta<typeof OfferComparisonTable> = {
	title: "B2C/OfferComparisonTable",
	component: OfferComparisonTable,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof OfferComparisonTable>;

const carteOrigin = {
	id: "origin",
	label: "La carte Origin",
	backgroundColor: "#9FF0EA",
	cta: {
		label: "Je commande ma carte Origin",
		href: "#",
		variant: "primary" as const,
		ctaSection: "offer-comparison-table",
	},
	image: {
		src: "/images/samples/ProductPages/ProductCardPage/OfferComparisonTable/carte-visa-sofinco.webp",
		alt: "Carte bancaire Sofinco Origin turquoise",
	},
	leftFeatures: [
		{
			id: "carte",
			label: "Carte",
			text: "Carte physique et dématérialisée, livrée sous 48h",
		},
		{
			id: "credit",
			label: "Crédit",
			text: "Réserve de crédit jusqu'à 6 000 € à 0 % d'intérêt",
		},
		{
			id: "controle",
			label: "Contrôle",
			text: "Report ou pause des paiements à tout moment",
		},
		{
			id: "assurance",
			label: "Assurance",
			text: "Garantie casse et assurance achat high tech inclus",
		},
	],
	rightFeatures: [
		{
			id: "paiement",
			label: "Paiement",
			text: "Débit différé inclus par défaut, sans frais ajout",
		},
		{
			id: "flexibilite",
			label: "Flexibilité",
			text: "Étalement à la carte de 3 à 60 mois, sans engagement",
		},
		{
			id: "voyage",
			label: "Voyage",
			text: "Paiements et retraits à l'étranger, sans aucun souci",
		},
		{
			id: "securite",
			label: "Sécurité",
			text: "ID protect anti usurpation d'identité bien inclus",
		},
	],
};

const cartePure = {
	id: "pure",
	label: "La carte Pure",
	backgroundColor: "#D8ECF9",
	cta: {
		label: "Je commande ma carte Pure",
		href: "#",
		variant: "primary" as const,
		ctaSection: "offer-comparison-table",
	},
	image: {
		src: "/images/samples/ProductPages/ProductCardPage/OfferComparisonTable/carte-visa-sofinco.webp",
		alt: "Carte bancaire Sofinco Pure noire",
	},
	leftFeatures: [
		{
			id: "carte",
			label: "Carte",
			text: "Carte 100 % digitale, activable en quelques minutes",
		},
		{
			id: "credit",
			label: "Crédit",
			text: "Réserve de crédit jusqu'à 6 000 € à 0 %, sans frais",
		},
		{
			id: "controle",
			label: "Contrôle",
			text: "Report ou pause des paiements depuis l'application",
		},
		{
			id: "assurance",
			label: "Assurance",
			text: "Garantie casse, vol et assurance high tech inclus",
		},
	],
	rightFeatures: [
		{
			id: "paiement",
			label: "Paiement",
			text: "Débit différé inclus par défaut, sans frais cachés",
		},
		{
			id: "flexibilite",
			label: "Flexibilité",
			text: "Étalement à la carte de 3 à 60 mois selon vos besoins",
		},
		{
			id: "voyage",
			label: "Voyage",
			text: "Paiements et retraits à l'étranger sans commission",
		},
		{
			id: "securite",
			label: "Sécurité",
			text: "ID protect anti usurpation d'identité inclus aussi",
		},
	],
};

const cartePremium = {
	id: "premium",
	label: "La carte Premium",
	backgroundColor: "#E7EAEC",
	cta: {
		label: "Je commande ma carte Premium",
		href: "#",
		variant: "primary" as const,
		ctaSection: "offer-comparison-table",
	},
	image: {
		src: "/images/samples/ProductPages/ProductCardPage/OfferComparisonTable/carte-visa-premier-sofinco.webp",
		alt: "Carte bancaire Sofinco Premium argentée",
	},
	leftFeatures: [
		{
			id: "carte",
			label: "Carte",
			text: "Carte premium en métal, physique et dématérialisée",
		},
		{
			id: "credit",
			label: "Crédit",
			text: "Réserve de crédit jusqu'à 10 000 € à 0 % d'intérêt",
		},
		{
			id: "controle",
			label: "Contrôle",
			text: "Report ou pause des paiements, priorité conseiller",
		},
		{
			id: "assurance",
			label: "Assurance",
			text: "Garantie premium casse, assurance high tech inclus",
		},
	],
	rightFeatures: [
		{
			id: "paiement",
			label: "Paiement",
			text: "Débit différé prioritaire inclus, zéro frais annexe",
		},
		{
			id: "flexibilite",
			label: "Flexibilité",
			text: "Étalement à la carte de 3 à 60 mois, conditions VIP et bien plus.",
		},
		{
			id: "voyage",
			label: "Voyage",
			text: "Paiements et retraits à l'étranger, plafonds élevés",
		},
		{
			id: "securite",
			label: "Sécurité",
			text: "ID protect anti usurpation d'identité renforcé plus",
		},
	],
};

const defaultArgs = {
	title: "La carte qui vous dit toujours tout",
	offers: [carteOrigin, cartePure],
};

export const Default: Story = { args: defaultArgs };

export const TwoOffers: Story = {
	name: "Deux offres",
	args: {
		...defaultArgs,
		offers: [carteOrigin, cartePremium],
	},
};

export const UnevenFeatures: Story = {
	name: "Nombre d'arguments inégal",
	args: {
		...defaultArgs,
		offers: [
			carteOrigin,
			{
				...cartePure,
				leftFeatures: cartePure.leftFeatures.slice(0, 2),
				rightFeatures: cartePure.rightFeatures.slice(0, 3),
			},
			cartePremium,
		],
	},
};
