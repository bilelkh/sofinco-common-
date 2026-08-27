import type { Meta, StoryObj } from "@storybook/react-vite";
import ChatBot from "./ChatBot";
import type { ChatBotData } from "./ChatBot.type";

const sampleData: ChatBotData = {
	greeting: "Bonjour, je suis Sofi.",
	question: "Quel est votre projet ?",
	avatarUrl: "/images/logo/logos_sofinco_rounded.svg",
	categories: [
		{
			label: "Famille et loisirs",
			question: "Quel montant souhaitez-vous emprunter ?",
			children: [
				{
					label: "Moins de 3000 euros",
					conclusion:
						"C'est noté. La solution la plus adaptée à votre besoin est le prêt personnel.",
					features: [
						"Des prêts jusqu'à 80K€",
						"Des taux compétitifs",
						"Des remboursements flexibles",
					],
					ctaLabel: "Je découvre le prêt personnel",
					ctaUrl: "/cms/editframe/default/fr/sites/sofinco/home.html",
				},
				{
					label: "Plus de 3000 euros",
					conclusion: "C'est noté. La solution la plus adaptée à votre besoin est le prêt pro.",
					features: [
						"Des prêts jusqu'à 80K€",
						"Des taux compétitifs",
						"Des remboursements flexibles",
					],
					ctaLabel: "Je découvre le prêt personnel",
					ctaUrl: "/cms/editframe/default/fr/sites/sofinco/home.html",
				},
			],
		},
		{
			label: "Auto",
			question: "Quel montant souhaitez-vous emprunter ?",
			children: [
				{
					label: "Moins de 3000 euros",
					conclusion:
						"C'est noté. La solution la plus adaptée à votre besoin est le prêt personnel.",
					features: [
						"Des prêts jusqu'à 80K€",
						"Des taux compétitifs",
						"Des remboursements flexibles",
					],
					ctaLabel: "Je découvre le prêt personnel",
					ctaUrl: "/cms/editframe/default/fr/sites/sofinco/home.html",
				},
				{
					label: "Plus de 3000 euros",
					conclusion:
						"C'est noté. La solution la plus adaptée à votre besoin est le prêt personnel.",
					features: [
						"Des prêts jusqu'à 80K€",
						"Des taux compétitifs",
						"Des remboursements flexibles",
					],
					ctaLabel: "Je découvre le prêt personnel",
					ctaUrl: "/cms/editframe/default/fr/sites/sofinco/home.html",
				},
			],
		},
		{
			label: "Travaux",
			question: "Quel montant souhaitez-vous emprunter ?",
			children: [
				{
					label: "Moins de 3000 euros",
					conclusion:
						"C'est noté. La solution la plus adaptée à votre besoin est le prêt personnel.",
					features: [
						"Des prêts jusqu'à 80K€",
						"Des taux compétitifs",
						"Des remboursements flexibles",
					],
					ctaLabel: "Je découvre le prêt personnel",
					ctaUrl: "/cms/editframe/default/fr/sites/sofinco/home.html",
				},
				{
					label: "Plus de 3000 euros",
					conclusion:
						"C'est noté. La solution la plus adaptée à votre besoin est le prêt personnel.",
					features: [
						"Des prêts jusqu'à 80K€",
						"Des taux compétitifs",
						"Des remboursements flexibles",
					],
					ctaLabel: "Je découvre le prêt personnel",
					ctaUrl: "/cms/editframe/default/fr/sites/sofinco/home.html",
				},
			],
		},
		{
			label: "Autre",
			question: "Quel montant souhaitez-vous emprunter ?",
			children: [
				{
					label: "Moins de 3000 euros",
					conclusion:
						"C'est noté. La solution la plus adaptée à votre besoin est le prêt personnel.",
					features: [
						"Des prêts jusqu'à 80K€",
						"Des taux compétitifs",
						"Des remboursements flexibles",
					],
					ctaLabel: "Je découvre le prêt personnel",
					ctaUrl: "/cms/editframe/default/fr/sites/sofinco/home.html",
				},
				{
					label: "Plus de 3000 euros",
					conclusion:
						"C'est noté. La solution la plus adaptée à votre besoin est le prêt personnel.",
					features: [
						"Des prêts jusqu'à 80K€",
						"Des taux compétitifs",
						"Des remboursements flexibles",
					],
					ctaLabel: "Je découvre le prêt personnel",
					ctaUrl: "/cms/editframe/default/fr/sites/sofinco/home.html",
				},
			],
		},
		{
			label: "Regroupement de crédits",
			question: "Quel montant souhaitez-vous emprunter ?",
			children: [
				{
					label: "Moins de 3000 euros",
					conclusion:
						"C'est noté. La solution la plus adaptée à votre besoin est le prêt personnel.",
					features: [
						"Des prêts jusqu'à 80K€",
						"Des taux compétitifs",
						"Des remboursements flexibles",
					],
					ctaLabel: "Je découvre le prêt personnel",
					ctaUrl: "/cms/editframe/default/fr/sites/sofinco/home.html",
				},
				{
					label: "Plus de 3000 euros",
					conclusion:
						"C'est noté. La solution la plus adaptée à votre besoin est le prêt personnel.",
					features: [
						"Des prêts jusqu'à 80K€",
						"Des taux compétitifs",
						"Des remboursements flexibles",
					],
					ctaLabel: "Je découvre le prêt personnel",
					ctaUrl: "/cms/editframe/default/fr/sites/sofinco/home.html",
				},
			],
		},
	],
};

const meta = {
	title: "B2C/ChatBot",
	component: ChatBot,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	args: { data: sampleData },
} satisfies Meta<typeof ChatBot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SimulatorLeaf: Story = {
	args: {
		data: {
			greeting: "Bonjour, je suis Sofi.",
			question: "Quel est votre projet ?",
			avatarUrl: "/images/logo/logos_sofinco_rounded.svg",
			categories: [
				{
					label: "Prêt personnel",
					question:
						"C'est un très beau projet et nous serions ravis de vous accompagner. De combien avez-vous besoin ?",
					children: [
						{
							label: "",
							conclusion:
								"C'est noté. La solution la plus adaptée à votre besoin est le prêt personnel.",
							features: [
								"Des prêts jusqu'à 80K€",
								"Des taux compétitifs",
								"Des remboursements flexibles",
							],
							// CTA produit (navy)
							ctaLabel: "Je découvre le prêt personnel",
							ctaUrl: "/cms/editframe/default/fr/sites/sofinco/home.html",
							// CTA simulateur (turquoise) + champ montant
							simulator: {
								amountPlaceholder: "J'ai besoin de",
								amountCtaLabel: "Je valide",
								amountMin: 150,
								amountMax: 75000,
								simulatorCtaLabel: "Je simule mon prêt",
								simulatorCtaUrl: "/parcours-simulateur?project=AUTO#/montant-financement",
								project: "AUTO",
							},
						},
					],
				},
			],
		},
	},
};

export const SingleLevel: Story = {
	args: {
		data: {
			greeting: "Bonjour, je suis Sofi.",
			question: "Quel est votre besoin ?",
			avatarUrl: "/images/logo/logos_sofinco_rounded.svg",
			categories: [
				{
					label: "Prêt personnel",
					conclusion: "Le prêt personnel Sofinco, simple et rapide.",
					features: ["Sans justificatif", "Réponse immédiate", "Taux fixe"],
					ctaLabel: "Faire une simulation",
					ctaUrl: "#simulation",
				},
				{
					label: "Crédit auto",
					conclusion: "Le crédit auto Sofinco pour votre véhicule.",
					features: ["Taux attractif", "Sans frais", "100% en ligne"],
					ctaLabel: "Faire une simulation",
					ctaUrl: "#simulation-auto",
				},
			],
		},
	},
};
