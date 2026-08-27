import type { Meta, StoryObj } from "@storybook/react-vite";

import NewsBlock from "./NewsBlock";

const meta = {
	title: "Common/NewsBlock/NewsBlock",
	component: NewsBlock,
	args: {
		header: "Actualités",
		title: "Les actualités du crédit conso",
		subtitle:
			"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc pellentesque magna ut erat vehicula, nec euismod nisl lacinia.",
		cards: [
			{
				img: {
					src: "https://picsum.photos/600/400?random=1",
					alt: "Éco-rénovation",
				},
				title: "Éco-rénovation : entre contrainte économique et calcul bugétaire",
				description:
					"Sofinscope est le baromètre de Sofinco, spécialiste du crédit à la consommation en France. Destiné à sonder les Français sur leurs habitudes de consommation et à mieux les comprendre, ce baromètre qui s'inscrit dans le quotidien des Français est réalisé par l'institut d'études de référence, OpinionWay, reconnu pour son expertise et sa rigueur méthodologique.",
				date: "12 mars 2026",
				tag: "Rénovation énergétique",
				ctaProps: {
					href: "/actualites/eco-renovation",
					label: "Découvrir l'article associé",
					type: "button",
					variant: "accent",
					size: "small",
				},
			},
			{
				img: {
					src: "https://picsum.photos/600/400?random=2",
					alt: "Éco-rénovation",
				},
				title: "Éco-rénovation : entre contrainte économique et calcul bugétaire",
				description:
					"Sofinscope est le baromètre de Sofinco, spécialiste du crédit à la consommation en France. Destiné à sonder les Français sur leurs habitudes de consommation et à mieux les comprendre, ce baromètre .",
				date: "12 mars 2026",
				tag: "Habitat",
				ctaProps: {
					href: "/actualites/eco-renovation",
					label: "Découvrir l'article associé",
					type: "button",
					variant: "accent",
					size: "small",
				},
			},
			{
				img: {
					src: "https://picsum.photos/600/400?random=3",
					alt: "Éco-rénovation",
				},
				title: "Éco-rénovation : entre contrainte économique et calcul bugétaire",
				description:
					"Sofinscope est le baromètre de Sofinco, spécialiste du crédit à la consommation en France. Destiné à sonder les Français sur leurs habitudes de consommation et à mieux les comprendre, ce baromètre qui s'inscrit dans le quotidien des Français est réalisé par l'institut d'études de référence, OpinionWay, reconnu pour son expertise et sa rigueur méthodologique.",
				date: "12 mars 2026",
				tag: "Consommation",
				ctaProps: {
					href: "/actualites/eco-renovation",
					label: "Découvrir l'article associé",
					type: "button",
					variant: "accent",
					size: "small",
				},
			},
		],
	},
	argTypes: {
		header: { control: "text" },
		title: { control: "text" },
		subtitle: { control: "text" },
		cards: { control: "object" },
		className: { control: "text" },
	},
} satisfies Meta<typeof NewsBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTwoCards: Story = {
	args: {
		cards: [
			{
				img: {
					src: "https://picsum.photos/600/400?random=4",
					alt: "Assurance",
				},
				title: "Bien choisir son assurance",
				description:
					"Comparer les offres d'assurance peut vous faire économiser plusieurs centaines d'euros par an.",
				date: "15 Avril 2026",
				tag: "Assurance",
				ctaProps: {
					href: "/actualites/choisir-assurance",
					label: "Découvrir l'article",
					type: "button",
					variant: "accent",
					size: "small",
				},
			},
			{
				img: {
					src: "https://picsum.photos/600/400?random=5",
					alt: "Investissement",
				},
				title: "Investir avec un petit budget",
				description:
					"Il n'est pas nécessaire de disposer d'un capital important pour commencer à investir.",
				date: "10 Avril 2026",
				tag: "Investissement",
				ctaProps: {
					href: "/actualites/investir-petit-budget",
					label: "Découvrir l'article",
					type: "button",
					variant: "accent",
					size: "small",
				},
			},
		],
	},
};
