import type { Meta, StoryObj } from "@storybook/react-vite";

import { Footer } from "./Footer";
import type { FooterProps } from "./footer.types";

const footerArgs: FooterProps = {
	mainLogoUrl: "/images/logo/logo_accent.svg",
	mainLogoAlt: "Sofinco",
	mainLogoLinkUrl: "#",
	socialTitle: "Suivez-nous",
	bottomSubtitle: "Légal & utilitaires",
	legalMention:
		"<p>SOFINCO est une marque de CA Consumer Finance, prêteur, SA au capital de 629 480 046 €, 1 rue Victor Basch – CS 70001 – 91068 MASSY Cedex, 542 097 522 RCS Evry. Intermédiaire d'assurances inscrit à l'ORIAS sous le n° 07 008 079 (www.orias.fr). Sofinco vous propose des offres de crédits, crédit consommation, rachat crédit et crédit renouvelable. Simulation de rachat crédit et crédit en ligne. © CA Consumer Finance 2026</p>",
	qrCode: {
		src: "/images/samples/QrCode/qr-code.svg",
		fallbackUrl: "#",
		iosUrl: "#",
		androidUrl: "#",
		text: "Télécharger l'app.",
		isActive: true,
	},
	avisClientData: {
		avisLogoUrl: "/images/logo/avis-verifies.svg",
		avisTitle: "Avis Vérifiés",
		ratingScore: 4.4,
		ratingReviewsCount: 5646,
	},
	partners: [
		{
			id: "1",
			title: "Groupe Crédit Agricole",
			imageUrl: "/images/logo/logo-casa.png",
			altText: "Groupe Crédit Agricole",
			linkUrl: "#",
			disclaimer: "Partenaire officiel",
		},
		{
			id: "2",
			title: "Lucie",
			imageUrl: "/images/logo/logo-lucie.png",
			altText: "Lucie — Labellisé en RSE",
			linkUrl: "#",
			disclaimer: "Partenaire historique",
		},
		{
			id: "3",
			title: "Best Workplaces",
			imageUrl: "/images/logo/logo-bestworkplace-2025.png",
			altText: "Best Workplaces France 2025",
			linkUrl: "#",
			disclaimer: "Partenaire historique",
		},
	],
	categories: [
		{
			id: "1",
			title: "Crédit à la consommation",
			links: [
				{ id: "1", label: "Prêt personnel en ligne", href: "#" },
				{ id: "2", label: "Crédit renouvelable", href: "#" },
				{ id: "3", label: "Regroupement de crédits", href: "#" },
				{ id: "4", label: "Rachat de crédits auto", href: "#" },
				{ id: "5", label: "Rachat de prêt personnel", href: "#" },
				{ id: "6", label: "Rachat de crédits travaux", href: "#" },
				{ id: "7", label: "Simulateur crédit conso", href: "#" },
			],
		},
		{
			id: "2",
			title: "Crédits projets",
			links: [
				{ id: "1", label: "Prêt vacances", href: "#" },
				{ id: "2", label: "Prêt camping-car", href: "#" },
				{ id: "3", label: "Prêt caravane", href: "#" },
				{ id: "4", label: "Prêt bateau", href: "#" },
				{ id: "5", label: "Crédit déménagement", href: "#" },
				{ id: "6", label: "Crédit cuisine", href: "#" },
			],
		},
		{
			id: "3",
			title: "Conseils et guides du crédit",
			links: [
				{ id: "1", label: "Guides du crédit conso", href: "#" },
				{ id: "2", label: "FAQ crédit consommation", href: "#" },
				{ id: "3", label: "Lexique du crédit", href: "#" },
				{ id: "4", label: "Calcul du TAEG", href: "#" },
				{ id: "5", label: "Faire une demande de rachat de crédits", href: "#" },
			],
		},
		{
			id: "4",
			title: "Cartes et paiements",
			links: [
				{ id: "1", label: "Carte de crédit Sofinco", href: "#" },
				{ id: "2", label: "Paiement en plusieurs fois", href: "#" },
				{ id: "3", label: "Paiement différé", href: "#" },
				{ id: "4", label: "Paiement en 3 fois", href: "#" },
				{ id: "5", label: "Paiement en 4 fois", href: "#" },
				{ id: "6", label: "Paiement en 10 fois", href: "#" },
			],
		},
		{
			id: "5",
			title: "Financement d’un véhicule",
			links: [
				{ id: "1", label: "Simulation prêt auto", href: "#" },
				{ id: "2", label: "Taux crédit auto", href: "#" },
				{ id: "3", label: "Crédit moto", href: "#" },
				{ id: "4", label: "Crédit scooter", href: "#" },
				{ id: "5", label: "Crédit voiture électrique", href: "#" },
				{ id: "6", label: "Crédit vélo électrique", href: "#" },
			],
		},
		{
			id: "6",
			title: "À propos de Sofinco",
			links: [
				{ id: "1", label: "Qui est Sofinco ?", href: "#" },
				{ id: "2", label: "Sofinco s’engage", href: "#" },
				{ id: "3", label: "Acteur responsable", href: "#" },
				{ id: "4", label: "Avis Sofinco", href: "#" },
				{ id: "5", label: "Agences Sofinco", href: "#" },
				{ id: "6", label: "Application Sofinco", href: "#" },
				{ id: "7", label: "Nos partenaires", href: "#" },
				{ id: "8", label: "Apple Pay", href: "#" },
			],
		},
		{
			id: "7",
			title: "Montants de prêt",
			links: [
				{ id: "1", label: "Prêt 1 000 €", href: "#" },
				{ id: "2", label: "Prêt 3 000 €", href: "#" },
				{ id: "3", label: "Prêt 5 000 €", href: "#" },
				{ id: "4", label: "Prêt 10 000 €", href: "#" },
				{ id: "5", label: "Prêt 20 000 €", href: "#" },
				{ id: "6", label: "Prêt 50 000 €", href: "#" },
			],
		},
		{
			id: "8",
			title: "Prêt travaux",
			links: [
				{ id: "1", label: "Simulation prêt travaux", href: "#" },
				{ id: "2", label: "Taux crédit travaux", href: "#" },
			],
		},
	],
	socialLinks: [
		{ id: "1", network: "facebook", url: "#" },
		{ id: "2", network: "linkedin", url: "#" },
		{ id: "3", network: "youtube", url: "#" },
	],
	legalLinks: [
		{ id: "1", label: "Plan du site Sofinco", href: "#" },
		{ id: "2", label: "Sécurité", href: "#" },
		{ id: "3", label: "Mentions légales", href: "#" },
		{ id: "4", label: "Charte des réclamations", href: "#" },
		{ id: "5", label: "Contact Sofinco", href: "#" },
		{ id: "6", label: "Accessibilité", href: "#" },
		{ id: "7", label: "Utiq", href: "#" },
		{ id: "8", label: "Politique des données personnelles", href: "#" },
		{ id: "9", label: "Tarifs", href: "#" },
		{ id: "10", label: "Découvrir notre groupe", href: "#" },
		{ id: "11", label: "Charte éthique groupe", href: "#" },
		{ id: "12", label: "Accessibilité : partiellement conforme", href: "#" },
		{ id: "13", label: "Mieux gérer son budget", href: "#" },
		{ id: "14", label: "Gérer mes cookies", href: "#", isConsent: true },
	],
};

const meta = {
	title: "Common/Footer",
	component: Footer,
	args: footerArgs,
	parameters: {
		layout: "fullscreen",
	},
} satisfies Meta<typeof Footer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
