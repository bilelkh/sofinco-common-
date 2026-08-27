import type { Meta, StoryObj } from "@storybook/react-vite";
import Search from "./Search";

const meta = {
	title: "Common/Menu/Search",
	component: Search,
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<div
				style={{
					background: "var(--color-primary-base)",
					padding: "24px 24px 240px",
				}}
			>
				<div style={{ maxWidth: 456, marginLeft: "auto" }}>
					<Story />
				</div>
			</div>
		),
	],
	args: {
		action: "/recherche",
		placeholder: "Rechercher",
		allResultsLabel: "Voir tous les résultats",
		allResultsHref: "/recherche",
	},
} satisfies Meta<typeof Search>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Empty field — no dropdown until the input is focused and there is content to show. */
export const Default: Story = {};

const suggestions = [
	{
		label: "Prêt personnel",
		termDisplayTitle: "/recherche?query=pret-personnel",
	},
	{
		label: "Rachat de crédit",
		termDisplayTitle: "/recherche?query=rachat-credit",
	},
	{ label: "Crédit auto", termDisplayTitle: "/recherche?query=credit-auto" },
];

const results = [
	{
		title: "Le prêt personnel Sofinco",
		description: "Financez tous vos projets avec un prêt personnel adapté à votre budget.",
		href: "/pret-personnel",
	},
	{
		title: "Rachat de crédits",
		description: "Regroupez vos crédits en une seule mensualité pour alléger votre budget.",
		href: "/rachat-credit",
	},
];

/** Focus the field to reveal the panel with both quick suggestions and rich results. */
export const WithSuggestionsAndResults: Story = {
	args: {
		suggestions,
		results,
	},
};

/** Only quick search-term suggestions. */
export const SuggestionsOnly: Story = {
	args: {
		suggestions,
	},
};

/** Only rich result entries. */
export const ResultsOnly: Story = {
	args: {
		results,
	},
};

export const MobileOnly: Story = {
	args: {
		results,
		suggestions,
		width: 375,
	},
};
