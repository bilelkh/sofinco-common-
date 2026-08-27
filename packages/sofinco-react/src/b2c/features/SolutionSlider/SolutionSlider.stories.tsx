import type { Meta, StoryObj } from "@storybook/react-vite";
import SolutionSlider from "@b2c/features/SolutionSlider/SolutionSlider";

const meta: Meta<typeof SolutionSlider> = {
	title: "B2C/Solution/SolutionSlider",
	component: SolutionSlider,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof SolutionSlider>;

export const Default: Story = {
	args: {
		title: "Une solution pour chacun de mes besoins",
		subtitle:
			"Nous sommes là pour vous donner les meilleurs outils, les offres les plus utiles et les solutions qui font vraiment avancer. Quel que soit votre projet, nous vous proposons un financement adapté à votre situation.",
		items: [
			{
				id: "pret-personnel",
				image: "/images/samples/HomePage/SolutionSlider/solutions-pret-personnel.webp",
				title: "Prêt personnel",
				description:
					"Un nouveau logement ? Une voiture ? J'emprunte avec le prêt personnel pour concrétiser tous mes projets. Un taux fixe, zéro mauvaise surprise.",
				features: [
					"Des prêts jusqu'à 75 000€",
					"Des taux compétitifs",
					"Des mensualités prévisibles",
				],
				ctaLabel: "Je découvre le prêt personnel",
				href: "#",
			},
			{
				id: "credit-renouvelable",
				image: "/images/samples/HomePage/SolutionSlider/solutions-credit-renouvelable.webp",
				title: "Crédit renouvelable",
				description:
					"Avec le crédit renouvelable, j'utilise mon crédit comme bon me semble. Je l'active immédiatement si besoin, et il est sans frais tant que je ne l'utilise pas.",
				features: [
					"Associé à une carte de crédit",
					"Un montant disponible jusqu'à 10 000€",
					"Des remboursements flexibles",
				],
				ctaLabel: "Je découvre le crédit renouvelable",
				href: "#",
			},
			{
				id: "carte-bancaire",
				image: "/images/samples/HomePage/SolutionSlider/solutions-carte-bancaire.webp",
				title: "Carte de crédit",
				description:
					"Comptant ou fractionné... Avec la carte Sofinco associée à un crédit renouvelable, je choisis le mode de paiement qui me convient pour chaque achat, en magasin comme en ligne.",
				features: [
					"Associée à un crédit renouvelable",
					"Acceptée partout sur le réseau Mastercard",
					"Pilotez vos dépenses depuis l'app Sofinco",
				],
				ctaLabel: "Je découvre la carte Sofinco",
				href: "#",
			},
			{
				id: "rachat-credit",
				image: "/images/samples/HomePage/SolutionSlider/solutions-rachat-credit.webp",
				title: "Rachat de crédit",
				description:
					"En regroupant tous vos crédits en un seul, vous n'avez plus qu'un seul interlocuteur et une seule mensualité à rembourser.",
				features: [
					"Regroupement de tous vos crédits",
					"Mensualités allégées",
					"Un conseiller Sofinco dédié",
				],
				ctaLabel: "Je découvre le rachat de crédit",
				href: "#",
			},
			{
				id: "assurance",
				image: "/images/samples/HomePage/SolutionSlider/solutions-assurances.webp",
				title: "Assurance",
				description:
					"Empruntez avec Sofinco et concrétisez vos projets avec un prêt personnel qui s'adapte à vos besoins !",
				features: [
					"Des prêts jusqu'à 80K€",
					"Des taux compétitifs",
					"Des remboursements flexibles",
				],
				ctaLabel: "Découvrir l'assurance",
				href: "#",
			},
			{
				id: "pret-auto",
				image: "/images/samples/HomePage/SolutionSlider/solutions-pret-personnel.webp",
				title: "Prêt auto",
				description:
					"Financez votre véhicule neuf ou d'occasion avec une solution claire et adaptée à votre projet.",
				features: [
					"Financement voiture neuve ou occasion",
					"Réponse de principe rapide",
					"Durées de remboursement modulables",
				],
				ctaLabel: "Découvrir le prêt auto",
				href: "#",
			},
			{
				id: "pret-travaux",
				image: "/images/samples/HomePage/SolutionSlider/solutions-pret-personnel.webp",
				title: "Prêt travaux",
				description:
					"Rénovez, aménagez ou améliorez votre logement avec un financement pensé pour vos travaux.",
				features: [
					"Montant adapté à vos chantiers",
					"Conditions transparentes",
					"Mise en place simple",
				],
				ctaLabel: "Découvrir le prêt travaux",
				href: "#",
			},
			{
				id: "pret-moto",
				image: "/images/samples/HomePage/SolutionSlider/solutions-pret-personnel.webp",
				title: "Prêt moto",
				description:
					"Concrétisez votre projet deux-roues avec une offre de financement souple et compétitive.",
				features: ["Financement 2 roues", "Taux attractifs", "Accompagnement à chaque étape"],
				ctaLabel: "Découvrir le prêt moto",
				href: "#",
			},
		],
	},
};
