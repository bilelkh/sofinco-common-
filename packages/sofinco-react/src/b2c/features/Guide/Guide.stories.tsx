import type { Meta, StoryObj } from "@storybook/react-vite";
import { Guide } from "./Guide";

const meta: Meta<typeof Guide> = {
	title: "B2C/Guide",
	component: Guide,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof Guide>;

/** Le dossier contient une espace : elle doit rester encodee (%20), sinon le
 *  parser de `srcSet` la lit comme un separateur de descripteur. */
const SAMPLES = "/images/samples/HomePage/Guide";

const defaultArgs = {
	title: "Suivez le guide !",
	titleSize: "h2" as const,
	ctaLabel: "Guides prêts perso",
	ctaUrl: "#",
	categories: [
		{
			id: "1",
			title: "Prêt personnel",
			imageUrl: `${SAMPLES}/guides-pret-personnel-desktop.webp`,
			imageUrlMobile: `${SAMPLES}/guides-pret-personnel-mobile.webp`,
			imageAlt: "Personne en voyage avec une valise",
			links: [
				{
					id: "1-1",
					label: "Crédit renouvelable ou prêt personnel : comment choisir ?",
					url: "#",
				},
				{ id: "1-2", label: "Guide #2", url: "#" },
				{ id: "1-3", label: "Guide #3", url: "#" },
			],
		},
		{
			id: "2",
			title: "Crédit renouvelable",
			imageUrl: `${SAMPLES}/guide-credit-renouvelable-desktop.webp`,
			imageUrlMobile: `${SAMPLES}/guide-credit-renouvelable-mobile.webp`,
			imageAlt: "Mains tenant un smartphone",
			links: [
				{
					id: "2-1",
					label: "Crédit renouvelable ou prêt personnel : comment choisir ?",
					url: "#",
				},
				{ id: "2-2", label: "Guide #2", url: "#" },
				{ id: "2-3", label: "Guide #3", url: "#" },
			],
		},
		{
			id: "3",
			title: "Rachat de crédit",
			imageUrl: `${SAMPLES}/guides-rachat-credit-desktop.webp`,
			imageUrlMobile: `${SAMPLES}/guides-rachat-credit-mobile.webp`,
			imageAlt: "Femme souriante tenant une carte",
			links: [
				{
					id: "3-1",
					label: "Crédit renouvelable ou prêt personnel : comment choisir ?",
					url: "#",
				},
				{ id: "3-2", label: "Guide #2", url: "#" },
				{ id: "3-3", label: "Guide #3", url: "#" },
			],
		},
	],
};

export const Default: Story = {
	args: defaultArgs,
};

export const TitleH2: Story = {
	name: "Titre H2",
	args: { ...defaultArgs, titleSize: "h2" },
};

export const TitleH3: Story = {
	name: "Titre H3",
	args: { ...defaultArgs, titleSize: "h3" },
};

export const SansCta: Story = {
	name: "Sans CTA",
	args: { ...defaultArgs, ctaLabel: undefined, ctaUrl: undefined },
};

export const UneCategorie: Story = {
	name: "Une seule catégorie",
	args: { ...defaultArgs, categories: defaultArgs.categories.slice(0, 1) },
};

export const Mobile: Story = {
	args: defaultArgs,
	parameters: {
		viewport: { defaultViewport: "mobile1" },
	},
};

export const MobileSansVisuelDedie: Story = {
	name: "Mobile — sans visuel dédié (fallback)",
	args: {
		...defaultArgs,
		categories: defaultArgs.categories.map((category) => ({
			...category,
			imageUrlMobile: undefined,
		})),
	},
	parameters: {
		viewport: { defaultViewport: "mobile1" },
	},
};
