import type { Meta, StoryObj } from "@storybook/react-vite";
import { Reassurance } from "./Reassurance";

const meta = {
	title: "B2C/Reassurance",
	component: Reassurance,
	args: {
		sectionHeadingProps: {
			title: "Sofinco accompagne vos projets",
			subtitle:
				"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc pellentesque magna ut erat vehicula, nec euismod nisl lacinia.",
			titleAs: "h2",
			align: "center",
			visualStyle: "h2",
		},
		items: [
			{
				id: 1,
				icon: "/images/samples/HomePage/Reassurance/icone-5-min.svg",
				title: "Une réponse de principe immédiate(2)",
				link: { href: "#", label: "immédiate(2)" },
			},
			{
				id: 2,
				icon: "/images/samples/HomePage/Reassurance/icone-seul-accompagne.svg",
				title: "Souscrivez seul(e) ou à deux",
			},
			{
				id: 3,
				icon: "/images/samples/HomePage/Reassurance/icone-gestion-simplifiee.svg",
				title: "Gratuit tant que vous ne l'utilisez pas",
			},
			{
				id: 4,
				icon: "/images/samples/HomePage/Reassurance/icone-100%25-flexible.svg",
				title: "Adapté à vos besoins",
			},
		],
	},
} satisfies Meta<typeof Reassurance>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDescriptions: Story = {
	args: {
		sectionHeadingProps: {
			title: "Sofinco vous accompagne dans tous vos projets de financement",
			subtitle:
				"Les petits comme les grands, ceux qu'on n'a pas prévus comme ceux dont on rêve depuis toujours.",
			titleAs: "h2",
			align: "center",
			visualStyle: "h2",
		},
		items: [
			{
				id: 1,
				icon: "/images/samples/HomePage/Reassurance/icone-simulation-gratuite.svg",
				title: "Simulation gratuite et sans engagement",
				text: "Un parcours 100 % en ligne pour estimer votre capacité d'emprunt en quelques clics.",
				link: { href: "#", label: "En savoir plus" },
			},
			{
				id: 2,
				icon: "/images/samples/HomePage/Reassurance/icone-5-min.svg",
				title: "Réponse définitive en moins de 5 minutes",
				text: "Via un parcours 100 % digital avec signature électronique sécurisée.",
				link: { href: "#", label: "En savoir plus" },
			},
			{
				id: 3,
				icon: "/images/samples/HomePage/Reassurance/icone-gestion-simplifiee.svg",
				title: "Pilotage en toute autonomie",
				text: "Gérez votre prêt et vos remboursements depuis votre app.",
				link: { href: "#", label: "En savoir plus" },
			},
			{
				id: 4,
				icon: "/images/samples/HomePage/Reassurance/icone-100%25-flexible.svg",
				title: "Flexibilité de vos remboursements",
				text: "Mettez en pause vos mensualités ou adaptez leurs montants pour faire face aux imprévus.",
				link: { href: "#", label: "En savoir plus" },
			},
		],
	},
};

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
	args: {
		sectionHeadingProps: {
			title: "Sofinco vous accompagne dans tous vos projets",
			subtitle:
				"Les petits comme les grands, ceux qu'on n'a pas prévus comme ceux dont on rêve depuis toujours.",
			titleAs: "h2",
			align: "center",
			visualStyle: "h2",
		},
		items: [
			{
				id: 1,
				icon: "/images/samples/HomePage/Reassurance/icone-5-min.svg",
				title: "Une réponse de principe en 5 minutes",
				text: "N'attendez plus pour concrétiser vos projets, obtenez une réponse de principe(4) rapidement.",
				link: { href: "#", label: "En savoir plus" },
			},
			{
				id: 2,
				icon: "/images/samples/HomePage/Reassurance/icone-seul-accompagne.svg",
				title: "Souscrivez seul(e) ou bien accompagné(e)",
				text: "Bénéficiez d'un accompagnement personnalisé, souscrivez votre crédit en ligne(5) ou avec l'aide de nos conseillers.",
				link: { href: "#", label: "En savoir plus" },
			},
			{
				id: 3,
				icon: "/images/samples/HomePage/Reassurance/icone-gestion-simplifiee.svg",
				title: "Gratuit tant que vous ne l'utilisez pas",
				text: "Gérez votre crédit et vos remboursements facilement depuis votre espace client.",
				link: { href: "#", label: "En savoir plus" },
			},
			{
				id: 4,
				icon: "/images/samples/HomePage/Reassurance/icone-100%25-flexible.svg",
				title: "100% flexible pour s'adapter à vos besoins",
				text: "Mettez en pause vos mensualités(3) ou adaptez leurs montants(2) pour faire face aux imprévus.",
				link: { href: "#", label: "En savoir plus" },
			},
		],
	},
};

export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: {
		sectionHeadingProps: {
			title: "Sofinco vous accompagne dans tous vos projets",
			subtitle:
				"Les petits comme les grands, ceux qu'on n'a pas prévus comme ceux dont on rêve depuis toujours.",
			titleAs: "h2",
			align: "center",
			visualStyle: "h2",
		},
		items: [
			{
				id: 1,
				icon: "/images/samples/ProductPages/ProductLoanPage/Reassurance/icone-5-min.svg",
				title: "Une réponse définitive en quelques minutes(1)",
				text: "N'attendez plus pour concrétiser vos projets, obtenez une réponse définitive en 5 minutes.",
				link: { href: "#", label: "En savoir plus" },
			},
			{
				id: 2,
				icon: "/images/samples/ProductPages/ProductLoanPage/Reassurance/icone-seul-accompagne.svg",
				title: "Souscrivez seul(e) ou bien accompagné(e)",
				text: "Bénéficiez d'un accompagnement personnalisé, souscrivez votre crédit en ligne(5)(2) ou avec l'aide de nos conseillers.",
				link: { href: "#", label: "En savoir plus" },
			},
			{
				id: 3,
				icon: "/images/samples/ProductPages/ProductLoanPage/Reassurance/icone-gestion-simplifiee.svg",
				title: "Des mensualités constantes sans mauvaise surprise",
				text: "Gérez votre prêt et vos remboursements facilement depuis votre app.",
				link: { href: "#", label: "En savoir plus" },
			},
			{
				id: 4,
				icon: "/images/samples/ProductPages/ProductLoanPage/Reassurance/icone-100%25-flexible.svg",
				title: "Personnalisable pour s'adapter à vos besoins",
				text: "Mettez en pause vos mensualités ou adaptez leurs montants pour faire face aux imprévus.",
				link: { href: "#", label: "En savoir plus" },
			},
		],
	},
};
