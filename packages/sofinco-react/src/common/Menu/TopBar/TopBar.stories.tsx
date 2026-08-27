import type { Meta, StoryObj } from "@storybook/react-vite";
import TopBar from "./TopBar";
import Search from "../Search/Search";

const meta = {
	title: "Common/Menu/TopBar",
	component: TopBar,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		tabs: [
			{ href: "/particuliers", label: "Particuliers" },
			{ href: "/professionnels", label: "Professionnels" },
		],
	},
} satisfies Meta<typeof TopBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSearch: Story = {
	args: {
		slotSearch: (
			<Search
				action="/recherche"
				placeholder="Rechercher"
				allResultsLabel="Voir tous les résultats"
				allResultsHref="/recherche"
				suggestions={[
					{ label: "Prêt personnel", termDisplayTitle: "/recherche?query=pret-personnel" },
					{ label: "Rachat de crédit", termDisplayTitle: "/recherche?query=rachat-credit" },
				]}
				results={[
					{
						title: "Le prêt personnel Sofinco",
						description: "Financez tous vos projets avec un prêt personnel adapté à votre budget.",
						href: "/pret-personnel",
					},
				]}
			/>
		),
	},
};

export const TabsOnly: Story = {
	args: {
		tabs: [{ href: "/particuliers", label: "Particuliers" }],
		slotSearch: undefined,
	},
};
