import type { Meta, StoryObj } from "@storybook/react-vite";

import SeoBlock from "./SeoBlock";

const defaultTitle = {
	children: "Sofinco, partenaire de confiance pour votre crédit renouvelable",
	color: "primary" as const,
	as: "h2" as const,
	visualStyle: "h2" as const,
};

const defaultSections = [
	{
		id: "1",
		content:
			"<p>Vous avez des projets en tête, mais vous hésitez encore à sauter le pas ? Avec Sofinco, vous avez enfin le pouvoir de les concrétiser. <strong>Un achat comptant ou en plusieurs fois, maintenant ou plus tard ? C'est vous qui décidez.</strong></p>",
	},
	{
		id: "2",
		content:
			"<p>Depuis plus de 75 ans, nous pensons nos solutions de financement pour qu'elles s'adaptent à votre vie. Qu'il s'agisse d'un prêt personnel pour un projet spécifique (auto, travaux, moto, caravane ou bateau), d'un crédit renouvelable pour gérer l'imprévu ou d'un rachat de crédits pour simplifier vos mensualités : nous sommes là pour vous.</p>",
	},
	{
		id: "3",
		content:
			"<p>Tout est conçu pour être clair et sans jargon : de notre simulateur gratuit à la signature électronique, en passant par la souscription en ligne. Et pour ceux qui aiment dormir tranquille, sachez que Sofinco porte en lui toute l'expertise du <strong>Crédit Agricole</strong>. Un gage de sérieux et de confiance pour vous accompagner dans tous vos moments de vie.</p>",
	},
];

const meta = {
	title: "B2C/SeoBlock",
	component: SeoBlock,
	parameters: { layout: "centered" },
	args: {
		title: defaultTitle,
		sections: defaultSections,
	},
	argTypes: {
		title: { control: "object" },
		sections: { control: "object" },
		isCentered: { control: "boolean" },
	},
} satisfies Meta<typeof SeoBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MultipleSections: Story = {
	name: "Plusieurs sections",
	args: {
		sections: [
			{
				id: "1",
				content:
					"<p>Le <strong>crédit à la consommation</strong> est un prêt accordé par un organisme financier pour financer des achats ou projets personnels, sans affectation obligatoire des fonds.</p>",
				color: "accent" as const,
			},
			{
				id: "2",
				content:
					"<p>Le <strong>crédit renouvelable</strong> est une réserve d'argent disponible à tout moment, remboursable progressivement au fur et à mesure de son utilisation.</p>",
				color: "red" as const,
			},
			{
				id: "3",
				content:
					"<p>Le <strong>rachat de crédit</strong> regroupe plusieurs prêts en un seul afin de réduire vos mensualités et de simplifier votre gestion budgétaire au quotidien.</p>",
				color: "green" as const,
			},
		],

		isCentered: true,
	},
};

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
	args: {
		title: {
			children: "Les prêts personnels, quelles différences avec les autres solutions de crédit ?",
			as: "h2" as const,
			visualStyle: "h2" as const,
		},
		sections: [
			{
				id: "1",
				content:
					"<p>Depuis ses débuts, les emprunts à la consommation, incluant le prêt personnel, permettent de financer et d'accompagner vos moments de vie. Cela implique une solution financière adaptée à tous les besoins. Le prêt personnel se distingue des autres prêts (camping-car, bateau...) par son caractère polyvalent. Pour un voyage, par exemple, les frais auront diverses origines : réservations, transport, argent de poche, etc. Seul ce type de prêt pourra couvrir l'ensemble de ces dépenses.</p>",
			},
		],
	},
};

export const PretPersoFinancement: Story = {
	name: "Prêt personnel — financement à votre mesure (page produit)",
	args: {
		title: {
			children: "Prêt personnel : un financement à votre mesure",
			as: "h2" as const,
			visualStyle: "h2" as const,
		},
		sections: [
			{
				id: "1",
				content:
					"<p>Un Prêt Perso est une solution d'emprunt qui permet de l'utiliser en toute liberté. Les prêts personnels se démarquent des formules de crédits à la consommation classiques qui nécessitent de justifier de leurs utilisations. Ce type de prêt est polyvalent et adapté à un grand nombre de projets individuels, comme un voyage, un événement familial, l'achat de matériel de loisirs, etc.</p>",
			},
		],
		isCentered: true,
	},
};

// Un 2e bloc SeoBlock (contenu différent) vit dans `ArrayFocusWrapper.PretPerso`.
export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: {
		title: {
			children: "Les prêts personnels, quelles différences avec les autres solutions de crédit ?",
			as: "h2" as const,
			visualStyle: "h2" as const,
		},
		sections: [
			{
				id: "1",
				content:
					"<p>Depuis ses débuts, les emprunts à la consommation, incluant le prêt personnel, permettent de financer et d'accompagner vos moments de vie. Cela implique une solution financière adaptée à tous les besoins. Le prêt personnel se distingue des autres prêts (camping-car, bateau...) par son caractère polyvalent. Pour un voyage, par exemple, les frais auront diverses origines : réservations, transport, argent de poche, etc. Seul ce type de prêt pourra couvrir l'ensemble de ces dépenses.</p>",
			},
		],
	},
};

// Le texte est facultatif dans la contribution (CND `sofnt:seoBlock`) : un
// bloc titre seul est une contribution valide.
export const TitleOnly: Story = {
	name: "Titre seul (sans texte)",
	args: {
		title: {
			children: "Sofinco, partenaire de confiance pour votre crédit conso",
			as: "h2" as const,
			visualStyle: "h2" as const,
		},
		sections: [],
	},
};

export const SingleSection: Story = {
	name: "Section unique",
	args: {
		sections: [
			{
				id: "1",
				content:
					"<p>Le <strong>crédit personnel</strong> est un prêt non affecté : vous n'avez pas à justifier l'utilisation des fonds auprès de l'organisme prêteur, ce qui vous laisse une totale liberté dans vos dépenses.</p>",
				color: "primary" as const,
			},
		],
	},
};
