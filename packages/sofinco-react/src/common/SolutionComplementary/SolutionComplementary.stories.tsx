import type { Meta, StoryObj } from "@storybook/react-vite";
import SolutionSlider from "@b2c/features/SolutionSlider/SolutionSlider";
import SolutionComplementary from "./SolutionComplementary";

const meta: Meta<typeof SolutionComplementary> = {
	title: "Common/Solution/SolutionComplementary",
	component: SolutionComplementary,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SolutionComplementary>;

const defaultArgs = {
	logoUrl: "/images/icons/user-circle-single.svg",
	heading: "Dépenses du quotidien ?",
	heading2: "Financement d'un projet ?",
	subHeading: "Sofinco a une solution pour vous",
	cards: [
		{
			title: "Ma carte de crédit : je prends le pouvoir !",
			subtitle:
				"Un imprévu ? Un achat plaisir ? Payez au comptant ou en plusieurs fois vos dépenses du quotidien avec votre crédit renouvelable.",
			features: ["Réponse de principe immédiate", "Montant modulable", "Durée flexible"],
			ctaLabel: "Découvrir",
			ctaUrl: "#",
			imageUrl:
				"/images/samples/HomePage/SolutionComplementary/depense-quotidien-sofinco-desktop.webp",
			imageUrlMobile:
				"/images/samples/HomePage/SolutionComplementary/depense-quotidien-sofinco-mobile.webp",
		},
		{
			title: "Un crédit sur mesure pour mon projet",
			subtitle:
				"Votre vie change ? Vous avez besoin d'un financement auto, travaux ou autre ? Nos solutions de crédit s'adaptent à vos besoins.",
			features: ["Une mensualité unique", "Accompagnement personnalisé", "Suivi en ligne"],
			ctaLabel: "Simuler mon projet",
			ctaUrl: "#",
			imageUrl:
				"/images/samples/HomePage/SolutionComplementary/financement-projet-sofinco-desktop.webp",
			imageUrlMobile:
				"/images/samples/HomePage/SolutionComplementary/financement-projet-sofinco-mobile.webp",
		},
	],
};

const sliderArgs = {
	title: "Une solution pour chacun de vos besoins",
	subtitle:
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc pellentesque magna ut erat vehicula, nec euismod nisl lacinia.",
	items: [
		{
			id: "pret-personnel",
			image: "/images/samples/HomePage/SolutionSlider/solutions-pret-personnel.webp",
			title: "Prêt personnel",
			description:
				"Empruntez avec Sofinco et concrétisez vos projets avec un prêt personnel qui s'adapte à vos besoins !",
			features: ["Des prêts jusqu'à 80K€", "Des taux compétitifs", "Des remboursements flexibles"],
			ctaLabel: "Découvrir le prêt personnel",
			href: "#",
		},
		{
			id: "credit-renouvelable",
			image: "/images/samples/HomePage/SolutionSlider/solutions-credit-renouvelable.webp",
			title: "Crédit renouvelable",
			description: "Avec notre crédit renouvelable, financez vos projets au rythme de vos envies.",
			features: [
				"Associé à une carte bancaire",
				"Une réserve d'argent jusqu'à 15 000€",
				"Des remboursements flexibles",
			],
			ctaLabel: "Découvrir le crédit renouvelable",
			href: "#",
		},
		{
			id: "carte-bancaire",
			image: "/images/samples/HomePage/SolutionSlider/solutions-carte-bancaire.webp",
			title: "Carte bancaire",
			description:
				"Empruntez avec Sofinco et concrétisez vos projets avec un prêt personnel qui s'adapte à vos besoins !",
			features: ["Des prêts jusqu'à 80K€", "Des taux compétitifs", "Des remboursements flexibles"],
			ctaLabel: "Découvrir la carte Sofinco",
			href: "#",
		},
	],
};

export const Default: Story = {
	args: { ...defaultArgs },
};

export const WithSliderBelow: Story = {
	args: { ...defaultArgs },
	render: (args) => (
		<>
			<SolutionComplementary {...args} />
			<SolutionSlider {...sliderArgs} />
		</>
	),
};
