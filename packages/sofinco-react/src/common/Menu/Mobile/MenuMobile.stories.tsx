import type { Meta, StoryObj } from "@storybook/react-vite";
import MenuMobile from "./MenuMobile";
import Cta from "@shared/ui/Cta/Cta";
import type { LinkProps } from "@shared/ui/Link/Link.type";

const defaultSections = [
	{
		id: "1",
		title: "Nos Solutions",
		subsections: [
			{
				id: "1",
				title: "Carte Sofinco",
				links: [
					{ label: "Auto", href: "/assurance/auto" },
					{ label: "Habitation", href: "/assurance/habitation" },
					{ label: "Santé", href: "/assurance/sante" },
				],
			},
			{
				id: "2",
				title: "Crédit renouvelable",
				links: [
					{ label: "Livret A", href: "/epargne/livret-a" },
					{ label: "PEL", href: "/epargne/pel" },
				],
			},
			{
				id: "3",
				title: "Prêt personnel",
				links: [
					{ label: "Livret A", href: "/epargne/livret-a" },
					{ label: "PEL", href: "/epargne/pel" },
				],
			},
			{
				id: "4",
				title: "Rachat de crédit",
				links: [
					{ label: "Livret A", href: "/epargne/livret-a" },
					{ label: "PEL", href: "/epargne/pel" },
				],
			},
			{
				id: "5",
				title: "Assurances",
				links: [
					{ label: "Livret A", href: "/epargne/livret-a" },
					{ label: "PEL", href: "/epargne/pel" },
				],
			},
			{
				id: "6",
				title: "Nos guides",
				links: [
					{ label: "Livret A", href: "/epargne/livret-a" },
					{ label: "PEL", href: "/epargne/pel" },
				],
			},
			{
				id: "7",
				title: "Offres Partenaires",
				links: [
					{ label: "Livret A", href: "/epargne/livret-a" },
					{ label: "PEL", href: "/epargne/pel" },
				],
			},
		],
	},
	{
		id: "2",
		title: "Payer au quotidien",
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
				title: "Services",
				links: [
					{ label: "Compte pro", href: "/pro/compte" },
					{ label: "Crédit", href: "/pro/credit" },
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

const defaultLinks: LinkProps[] = [
	{
		href: "https://external.com",
		label: "Télécharger l'application",
		isExternal: true,
		iconLeft: "download",
		iconVariant: "accent",
	},
	{
		href: "/contact",
		label: "Mes demandes de crédit",
		iconLeft: "folder-check",
		iconVariant: "accent",
	},
	{
		href: "/aide",
		label: "Aide et contact",
		iconLeft: "message-circle-question-mark",
		iconVariant: "accent",
	},
	{
		href: "https://external.com",
		label: "Sofinco pro",
		isExternal: true,
		iconLeft: "refreshccw",
		iconVariant: "danger",
	},
];

const meta = {
	title: "Common/Menu/Mobile/MenuMobile",
	component: MenuMobile,
	decorators: [
		(Story) => (
			<div style={{ height: "100dvh", backgroundColor: "#fff", padding: "0" }}>
				{/* 👇 Decorators in Storybook also accept a function. Replace <Story/> with Story() to enable it  */}
				<Story />
			</div>
		),
	],
	args: {
		sections: defaultSections,
		links: defaultLinks,
	},
} satisfies Meta<typeof MenuMobile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCta: Story = {
	args: {
		ctaProps: {
			label: "Simuler mon crédit",
			variant: "accent",
			type: "button",
		},
	},
};

/**
 * Header chrome injected via `children`: search, download-app and login CTAs
 * render next to the close button — this is how the parent `Menu` composes the
 * mobile panel.
 */
export const WithHeaderCtas: Story = {
	args: {
		ctaProps: {
			label: "Simuler mon crédit",
			variant: "accent",
			type: "button",
		},
		children: (
			<>
				<Cta iconOnly iconLeft="search" variant="outlined" label="Rechercher" />
				<Cta iconLeft="download" variant="accent" type="button" label="App" href="#" />
				<Cta label="Se connecter" type="button" />
			</>
		),
	},
};

export const SingleSection: Story = {
	args: {
		sections: [defaultSections[0]],
		links: [defaultLinks[0]],
	},
};
