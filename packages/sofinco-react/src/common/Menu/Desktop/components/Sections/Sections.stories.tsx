import type { Meta, StoryObj } from "@storybook/react-vite";
import Sections from "./Sections";
import type { MenuSection } from "@common/Menu/Menu.type";

const defaultSections: MenuSection[] = [
	{
		id: "1",
		title: "Nos Solutions",
		card: {
			title: "Financez vos projets avec le crédit conso Sofinco",
			image: "/images/samples/Menu/nos-solutions-navigation-menu.webp",
			cta: {
				label: "Decouvrir",
				type: "button",
				variant: "primary",
			},
		},
		subsections: [
			{
				id: "1",
				title: "Prêt personnel",
				links: [
					{
						label: "Le pret personnel",
						href: "/epargne/livret-a",
						tracking: {
							event: "click_menu",
							menu_level_1: "Nos Solutions",
							menu_level_2: "Prêt personnel",
							menu_level_3: "Le pret personnel",
						},
					},
					{ label: "Prêt transition énergétique", href: "/epargne/pel" },
					{ label: "Simuler mon prêt personnel", href: "/epargne/pel" },
					{ label: "Taux du prêt personnel ", href: "/epargne/pel" },
				],
			},
			{
				id: "2",
				title: "Crédit renouvelable",
				links: [
					{ label: "Crédit renouvelable", href: "/epargne/livret-a" },
					{ label: "Simuler mon crédit renouvelable", href: "/epargne/pel" },
					{ label: "Taux du crédit renouvelable", href: "/epargne/pel" },
					{ label: "Taux du prêt personnel ", href: "/epargne/pel" },
				],
			},
			{
				id: "3",
				title: "Carte Sofinco",
				links: [{ label: "La carte Sofinco", href: "/assurance/auto" }],
			},

			{
				id: "4",
				title: "Rachat de crédit",
				links: [
					{ label: "Rachat de crédit", href: "/epargne/livret-a" },
					{ label: "Simuler mon rachat de crédit", href: "/epargne/pel" },
					{ label: "Taux du rachat de crédit", href: "/epargne/pel" },
				],
			},
			{
				id: "5",
				title: "Nos guides",
				links: [
					{ label: "Guide prêt personnel", href: "/epargne/livret-a" },
					{ label: "Guide crédit renouvelable", href: "/epargne/pel" },
					{ label: "Guide rachat de crédit", href: "/epargne/pel" },
					{ label: "Guide transition énergétique", href: "/epargne/pel" },
				],
			},
		],
	},
	{
		id: "2",
		title: "Payer au quotidien",
		card: {
			variant: "fullbg",
			title: "Payez au quotidien avec le crédit renouvelable Sofinco",
			image: "/images/samples/Menu/payer-au-quotidien-navigation-menu.webp",
			cta: {
				label: "Decouvrir",
				type: "button",
				variant: "primary",
			},
		},
		subsections: [
			{
				id: "1",
				title: "Services",
				links: [
					{ label: "Compte pro", href: "/pro/compte" },
					{ label: "Crédit", href: "/pro/credit" },
				],
			},
		],
	},
	{
		id: "3",
		title: "Financer un projet",
		subsections: [
			{
				id: "1",
				title: "Financer un projet",
				links: [
					{ label: "Prêt travaux", href: "/pro/compte" },
					{ label: "Crédit auto", href: "/pro/credit" },
					{ label: "Crédit retraite", href: "/pro/credit" },
					{ label: "Prêt rénovation énergétique", href: "/pro/credit" },
					{ label: "Crédit rénovation", href: "/pro/credit" },
					{ label: "Crédit mariage", href: "/pro/credit" },
					{ label: "Crédit piscine", href: "/pro/credit" },
					{ label: "Crédit voyage", href: "/pro/credit" },
					{ label: "Tous nos prêts projets", href: "/pro/credit" },
				],
			},
			{
				id: "2",
				title: "Crédit consommation",
				links: [
					{ label: "Prêt travaux", href: "/pro/compte" },
					{ label: "Crédit auto", href: "/pro/credit" },
					{ label: "Crédit retraite", href: "/pro/credit" },
				],
			},
			{
				id: "3",
				title: "Nos guides",
				links: [
					{ label: "Prêt travaux", href: "/pro/compte" },
					{ label: "Crédit auto", href: "/pro/credit" },
					{ label: "Crédit retraite", href: "/pro/credit" },
				],
			},
		],
	},
	{
		id: "4",
		title: "Sofinco",
		subsections: [
			{
				id: "1",
				title: "Services",
				links: [
					{ label: "Compte pro", href: "/pro/compte" },
					{ label: "Crédit", href: "/pro/credit" },
				],
			},
		],
	},
];

const meta = {
	title: "Common/Menu/Desktop/Sections",
	component: Sections,
	decorators: [
		(Story) => (
			<div>
				{/* 👇 Decorators in Storybook also accept a function. Replace <Story/> with Story() to enable it  */}
				<img
					src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=100"
					alt=""
					style={{
						height: "100dvh",
						position: "absolute",
						top: 0,
						left: 0,
						width: "100dvw",
						zIndex: 0,
					}}
				/>
				<Story />
			</div>
		),
	],
	args: {
		sections: defaultSections,
	},
} satisfies Meta<typeof Sections>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A section with few subsections keeps its promo card visible across desktop
 * widths (the responsive-hide modifier only kicks in at 4+ subsections).
 */
export const WithPromoCard: Story = {
	args: {
		sections: [defaultSections[1]],
	},
};

/** A section with no `card` renders link columns only. */
export const WithoutCard: Story = {
	args: {
		sections: [defaultSections[2]],
	},
};

/** A single simple section — useful for inspecting the trigger/panel in isolation. */
export const SingleSection: Story = {
	args: {
		sections: [defaultSections[3]],
	},
};
