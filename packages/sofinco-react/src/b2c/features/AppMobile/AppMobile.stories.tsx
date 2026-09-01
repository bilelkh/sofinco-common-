import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppMobile } from "./AppMobile";

const meta = {
	title: "B2C/AppMobile",
	component: AppMobile,
	args: {
		sectionHeadingProps: {
			title: "Je pilote mes projets du bout des doigts",
			subtitle:
				"Suivez vos remboursements, gestion centralisée de votre argent, paramètres ... retrouvez tout dans l'App Sofinco, c'est aussi simple que ça.",
			visualStyle: "h2",
		},
		picto: "/images/samples/HomePage/AppMobile/picto-section-app-mobile.svg",
		backgroundColor: "#03334D",
		img: "/images/samples/HomePage/AppMobile/application-mobile-sofinco-desktop.webp",
		imgQrCode: "/images/samples/QrCode/qr-code.svg",
		mobileCtaHrefIos: "https://apps.apple.com/fr/app/sofinco/id1496197496",
		mobileCtaHrefAndroid:
			"https://play.google.com/store/apps/details?id=com.ca.consumerfinance.sofinco",
		cards: [
			{
				id: 0,
				label: "Je suis tous mes prêts",
				labelComplement: "en temps réel",
				picto: "/images/samples/HomePage/AppMobile/Suivi-pret-app-mobile.svg",
			},
			{
				id: 1,
				label: "Je paye comptant ou en plusieurs fois",
				labelComplement: "je choisis ce qui me convient le mieux à chaque achat",
				picto: "/images/samples/HomePage/AppMobile/paiement-plusieurs-fois-app-mobile.svg",
			},
			{
				id: 2,
				label: "Je pilote mon crédit à ma guise",
				labelComplement: "et garde un oeil sur ma consommation",
				picto: "/images/samples/HomePage/AppMobile/pilotage-credit-app-mobile.svg",
			},
			{
				id: 3,
				label: "Je m'authentifie et sécurise",
				labelComplement: "chaque transaction",
				picto: "/images/samples/HomePage/AppMobile/securite-app-mobile.svg",
			},
		],
	},
} satisfies Meta<typeof AppMobile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SansQrCode: Story = {
	args: { imgQrCode: undefined },
};

export const CarteBancaire: Story = {
	name: "Carte bancaire (page produit)",
	args: {
		sectionHeadingProps: {
			title: "Tous mes paiements à portée de main",
			subtitle:
				"Suivi de vos remboursements, gestion centralisée de votre argent, paramètres ... Retrouvez tout dans l'App Sofinco, c'est aussi simple que ça.",
			visualStyle: "h2",
		},
		img: "/images/samples/ProductPages/ProductCardPage/AppMobile/app-mobile-carte-bancaire-desktop.webp",
		imgQrCode: undefined,
		cards: [
			{
				id: 0,
				label: "Je gère mes mensualités",
				labelComplement: "comme je l'entends",
			},
			{
				id: 1,
				label: "Toutes mes cartes réunies",
				labelComplement: "au même endroit",
			},
			{
				id: 2,
				label: "Je modifie, paramètre, ajuste",
				labelComplement: "quand bon me semble",
			},
			{
				id: 3,
				label: "Accessible depuis le métro, boulot, dodo",
				labelComplement: "grâce à la visualisation en temps réel",
			},
		],
	},
};

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
	args: {
		sectionHeadingProps: {
			title: "Je gère mon crédit renouvelable depuis mon app",
			subtitle:
				"Crédit, remboursement, paramètres... Tout est réuni en un seul endroit pour une gestion simple et rapide",
			visualStyle: "h2",
		},
		img: "/images/samples/ProductPages/ProductCreditPage/AppMobile/application-mobile-credit-renouvelable-desktop.webp",
		imgQrCode: "/images/samples/QrCode/qr-code.svg",
		mobileCtaHrefIos: undefined,
		mobileCtaHrefAndroid: undefined,
		cards: [
			{
				id: 0,
				label: "Je consulte le montant disponible de mon crédit",
				labelComplement: "en temps réel",
			},
			{
				id: 1,
				label: "En quelques étapes, c'est fait",
				labelComplement: "des virements de fonds sur mon compte en 48h(1)",
			},
			{
				id: 2,
				label: "Je fais une pause sur mes mensualités",
				labelComplement: "après 3 mois d'ancienneté(3)",
			},
			{
				id: 3,
				label: "Tout le temps, partout",
				labelComplement: "accessible 24h/24, 7j/7 sur iOs et Android",
			},
		],
	},
};

export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: {
		sectionHeadingProps: {
			title: "Toute la gestion de mon prêt dans l'app Sofinco",
			subtitle:
				"Montant restant dû, échéances, paramètres... Tout réuni en un seul endroit, c'est aussi simple que ça.",
			visualStyle: "h2",
		},
		img: "/images/samples/ProductPages/ProductLoanPage/AppMobile/application-mobile-pret-perso-desktop.webp",
		imgQrCode: "/images/samples/QrCode/qr-code.svg",
		mobileCtaHrefIos: undefined,
		mobileCtaHrefAndroid: undefined,
		cards: [
			{
				id: 0,
				label: "Je garde un œil sur mon crédit",
				labelComplement: "le capital restant dû, en temps réel, à tout moment.",
			},
			{
				id: 1,
				label: "J'ajuste en 3 clics",
				labelComplement: "le montant de mes mensualités, à la hausse ou à la baisse.",
			},
			{
				id: 2,
				label: "Je prends une pause",
				labelComplement: "sur mes mensualités 1 fois par semestre sans frais(3)",
			},
			{
				id: 3,
				label: "Je prends de l'avance",
				labelComplement: "avec le remboursement anticipé total ou partiel garanti sans frais",
			},
		],
	},
};
