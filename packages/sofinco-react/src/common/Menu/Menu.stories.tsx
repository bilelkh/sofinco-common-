import type { Meta, StoryObj } from "@storybook/react-vite";
import type { MenuSection } from "@common/Menu/Menu.type";
import type { LinkProps } from "@shared/ui/Link/Link.type";
import Menu from "./Menu";
import Search from "@common/Menu/Search/Search";

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
				title: "Carte Sofinco",
				links: [{ label: "La carte Sofinco", href: "/assurance/auto" }],
			},
			{
				id: "2",
				title: "Prêt personnel",
				links: [
					{ label: "Le pret personnel", href: "/epargne/livret-a" },
					{ label: "Prêt transition énergétique", href: "/epargne/pel" },
					{ label: "Simuler mon prêt personnel", href: "/epargne/pel" },
				],
			},
			{
				id: "3",
				title: "Crédit renouvelable",
				links: [
					{ label: "Crédit renouvelable", href: "/epargne/livret-a" },
					{ label: "Simuler mon crédit renouvelable", href: "/epargne/pel" },
					{ label: "Taux du crédit renouvelable", href: "/epargne/pel" },
					{ label: "Taux du prêt personnel ", href: "/epargne/pel" },
				],
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
					{ label: "Guide transition énergétique", href: "/epargne/pel" },
					{ label: "Guide transition énergétique", href: "/epargne/pel" },
				],
			},
			{
				id: "6",
				title: "Assurances",
				links: [
					{ label: "Guide prêt personnel", href: "/epargne/livret-a" },
					{ label: "Guide crédit renouvelable", href: "/epargne/pel" },
					{ label: "Guide rachat de crédit", href: "/epargne/pel" },
					{ label: "Guide transition énergétique", href: "/epargne/pel" },
				],
			},
			{
				id: "7",
				title: "Offres partenaires",
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
				title: "Payer au quotidien",
				links: [
					{
						label: "Guides du paiement en plusieurs fois",
						href: "/pro/compte",
					},
					{ label: "Crédit", href: "/pro/credit" },
				],
			},
		],
	},
	{
		id: "3",
		title: "Financer un projet",
		card: {
			variant: "fullbg",
			title: "Payez au quotidien avec le crédit renouvelable Sofinco",
			image: "/images/samples/Menu/financer-un-projet-navigation-menu.webp",
			cta: {
				label: "Decouvrir",
				type: "button",
				variant: "primary",
			},
		},
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

const linksMobile: LinkProps[] = [
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

const linksDesktop: LinkProps[] = [
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
];

const defaultLogo = {
	src: "/images/samples/Menu/logo-sofinco.svg",
	alt: "Sofinco",
	label: "Accueil Sofinco",
	href: "/",
};

const meta = {
	title: "Common/Menu/Menu",
	component: Menu,
	args: {
		sections: defaultSections,
		linksPropsDesktop: linksDesktop,
		linksPropsMobile: linksMobile,
		logo: defaultLogo,
		slotSearch: (
			<Search
				action="/recherche"
				placeholder="Rechercher"
				allResultsLabel="Voir tous les résultats"
				allResultsHref="/recherche"
				suggestions={[
					{
						label: "Prêt personnel",
						termDisplayTitle: "/recherche?query=pret-personnel",
					},
					{
						label: "Rachat de crédit",
						termDisplayTitle: "/recherche?query=rachat-credit",
					},
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
		ctaSearch: {
			label: "Se connecter",
			variant: "accent",
			type: "button",
			onClick: (e) => console.log({ event: e, msg: "open search modal" }),
		},
		ctaLogin: {
			label: "Se connecter",
			type: "button",
			onClick: (e) => console.log({ event: e, msg: "connexion" }),
		},
		ctaDownloadApp: {
			label: "App",
			variant: "accent",
			type: "button",
			iconLeft: "download",
			href: "#",
		},
		// URLs stores : servies à la place de `ctaDownloadApp.href` selon l'OS du visiteur
		// (résolution après montage — en desktop Storybook, c'est bien `href` qui s'applique).
		downloadAppHrefIos: "https://apps.apple.com/fr/app/sofinco/id1234567890",
		downloadAppHrefAndroid: "https://play.google.com/store/apps/details?id=fr.sofinco",
		ctaLoan: {
			label: "Simuler mon crédit",
			variant: "accent",
			type: "button",
		},
		topBarProps: {
			tabs: [
				{ href: "/particuliers", label: "Particuliers" },
				{ href: "/professionnels", label: "Professionnels" },
			],
		},
	},
} satisfies Meta<typeof Menu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The full menu region as rendered in Jahia: the TopBar (tabs + search) sits above the nav. */

export const WithGlobalCta: Story = {
	args: {
		ctaSearch: {
			label: "Se connecter",
			variant: "accent",
			type: "button",
			onClick: (e) => console.log({ event: e, msg: "open search modal" }),
		},
		ctaLogin: {
			label: "Se connecter",
			variant: "accent",
			type: "button",
			onClick: (e) => console.log({ event: e, msg: "connexion" }),
		},
		ctaDownloadApp: {
			label: "App",
			variant: "accent",
			type: "button",
			iconLeft: "download",
			href: "#",
		},
		ctaLoan: {
			label: "Simuler mon crédit",
			variant: "accent",
			type: "button",
		},
	},
};
