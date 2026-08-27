import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScrollSteps } from "./ScrollSteps";

const meta = {
	title: "Common/ScrollSteps",
	component: ScrollSteps,
	parameters: {
		layout: "fullscreen",
	},
	argTypes: {
		imagePosition: {
			control: { type: "inline-radio" },
			options: ["left", "right"],
			description:
				"Position de la colonne image en desktop. Sans effet en mobile (image toujours au-dessus).",
			table: { defaultValue: { summary: "left" } },
		},
	},
} satisfies Meta<typeof ScrollSteps>;

export default meta;
type Story = StoryObj<typeof meta>;

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&h=856&q=80`;

const items = [
	{
		id: "1",
		badge: 1,
		title: "Je simule et je soucris en ligne",
		description:
			"Choisissez votre montant et votre durée, obtenez une réponse de principe immédiate (3), et signez votre contrat en ligne (2) depuis chez vous..",
		imageUrl: img("photo-1589939705384-5185137a7f0f"),
	},
	{
		id: "2",
		badge: 2,
		title: "Je reçois les fonds sur mon compte",
		description:
			"Permettez à vos clients de régler leurs achats en 3 ou 4 fois par carte bancaire, avec une réponse immédiate et sans démarche complexe.",
		imageUrl: img("photo-1556742502-ec7c0e9f34b1"),
	},
	{
		id: "3",
		badge: 3,
		title: "Je rembourse à mensualités fixes",
		description:
			"Financez les projets de vos clients avec un crédit dédié, à mensualités fixes et à un taux clair, du premier au dernier remboursement.",
		imageUrl: img("photo-1554224155-6726b3ff858f"),
	},
	{
		id: "4",
		badge: "check" as const,
		title: "Crédit remboursé : c'est terminé.",
		description:
			"Offrez une réserve d'argent disponible et reconstituable, que vos clients utilisent à leur rythme selon leurs besoins.",
		imageUrl: img("photo-1521791136064-7986c2920216"),
	},
];

export const Default: Story = {
	args: {
		items,
	},
};

/** Sans badge sur aucun item. */
export const NoBadge: Story = {
	args: {
		items: items.map((item) => ({ ...item, badge: undefined })),
	},
};

/**
 * `imagePosition: "right"` — bascule la colonne image à droite en desktop via `order`.
 * L'ordre du DOM reste inchangé (image en premier, `aria-hidden`), donc l'ordre de
 * lecture et le parcours clavier sont identiques à la variante par défaut.
 * Sans effet en mobile : l'image reste au-dessus de l'étape active.
 */
export const ImageRight: Story = {
	args: {
		items,
		imagePosition: "right",
	},
};
