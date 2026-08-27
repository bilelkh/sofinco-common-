import type { Meta, StoryObj } from "@storybook/react-vite";
import { Breadcrumb } from "./Breadcrumb";

const meta = {
	title: "Shared/UI/Breadcrumb",
	component: Breadcrumb,
	parameters: { layout: "padded" },
	decorators: [
		(Story) => (
			<div style={{ background: "var(--color-primary-base)", padding: "1.5rem" }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		items: [
			{ id: "1", label: "Accueil Sofinco", url: "/", isCurrent: false, isClickable: true },
			{
				id: "2",
				label: "Prêt personnel",
				url: "/pret-personnel",
				isCurrent: true,
				isClickable: false,
			},
		],
	},
};

export const ThreeLevels: Story = {
	name: "3 niveaux",
	args: {
		items: [
			{ id: "1", label: "Accueil Sofinco", url: "/", isCurrent: false, isClickable: true },
			{ id: "2", label: "Nos crédits", url: "/credits", isCurrent: false, isClickable: true },
			{
				id: "3",
				label: "Prêt personnel",
				url: "/credits/pret-personnel",
				isCurrent: true,
				isClickable: false,
			},
		],
	},
};

export const WithNavMenuText: Story = {
	name: "Avec jnt:navMenuText (entrée menu sans page)",
	args: {
		items: [
			{ id: "1", label: "Accueil Sofinco", url: "/", isCurrent: false, isClickable: true },
			// "Assurances" : jnt:navMenuText côté Jahia — pas de page, juste un
			// regroupement menu. URL vide → rendu non cliquable ici, et écarté du
			// `BreadcrumbList` que le serveur construit pour le `<head>` (un `ListItem`
			// sans `item` est ignoré par Google).
			{ id: "2", label: "Assurances", url: "", isCurrent: false, isClickable: false },
			{
				id: "3",
				label: "Assurance habitation",
				url: "/assurances/habitation",
				isCurrent: true,
				isClickable: false,
			},
		],
	},
};

export const WithCustomLabel: Story = {
	name: "Avec libellé personnalisé (breadcrumbCustomLabel)",
	args: {
		// jcr:title = "Le prêt personnel pour réaliser vos projets" (trop long).
		// Le toggle breadcrumbCustomLabel = "Prêt personnel" remplace le label
		// uniquement dans le fil d'Ariane (le titre H1 de la page reste long).
		items: [
			{ id: "1", label: "Accueil Sofinco", url: "/", isCurrent: false, isClickable: true },
			{
				id: "2",
				label: "Prêt personnel", // ← vient de breadcrumbCustomLabel
				url: "/le-pret-personnel-pour-realiser-vos-projets",
				isCurrent: true,
				isClickable: false,
			},
		],
	},
};

export const HiddenPageSkipped: Story = {
	name: "Page masquée (hideFromBreadcrumb) — sautée du parcours",
	args: {
		// La page "Catalogue" entre Accueil et "Prêt personnel" a hideFromBreadcrumb=true.
		// Le helper la skip côté serveur → elle n'apparaît pas dans la liste.
		items: [
			{ id: "1", label: "Accueil Sofinco", url: "/", isCurrent: false, isClickable: true },
			// "Catalogue" omis (hideFromBreadcrumb=true)
			{
				id: "2",
				label: "Prêt personnel",
				url: "/catalogue/pret-personnel",
				isCurrent: true,
				isClickable: false,
			},
		],
	},
};

export const SingleItem: Story = {
	name: "Seul (page racine)",
	args: {
		items: [{ id: "1", label: "Accueil Sofinco", url: "/", isCurrent: true, isClickable: false }],
	},
};

export const Empty: Story = {
	name: "Vide (ne rend rien)",
	args: { items: [] },
};
