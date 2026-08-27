import type { Meta, StoryObj } from "@storybook/react-vite";
import HeroV2 from "./HeroV2";

const meta: Meta<typeof HeroV2> = {
	title: "B2C/Hero/HeroV2",
	component: HeroV2,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof HeroV2>;

const defaultArgs = {
	variant: "v2" as const,
	title: "Gérez vos dépenses. Financez vos projets.",
	subtitle:
		"Prêts, réserve d'argent, paiements flexibles : optez pour la solution qui vous convient.",
	img: {
		lowSrc:
			"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=20&q=1",
		desktopSrc:
			"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=100",
		tabletSrc:
			"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1024&q=90",
		mobileSrc:
			"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&h=1000&q=80",
	},
	offerTitleBadge: "Prêt Perso",
	offerBadge: "Jusqu'au 7 janvier",
	offerRate: "4,50%",
	offerRateLabel: "TAEG fixe",
	offerRateLabelBis: "de 13 à 48 mois",
	offerAmount: "pour 15 000€",
	offerLegalText:
		"Pour 15 000€ sur 48 mois, une mensualité de 341,44€ et un montant total dû de 16 389,12€. Mensualités flexibles de 13 à 48 mois.",
	cta: {
		type: "button" as const,
		variant: "accent" as const,
		label: "Je profite de l'offre",
		href: "#",
		props: { target: "_self" },
	},
};

export const Default: Story = {
	args: defaultArgs,
};

export const WithSimulator: Story = {
	args: {
		...defaultArgs,
		simulator: {
			simulatorTitle: "Financez vos projets avec le crédit conso Sofinco",
			amountPlaceholder: "Montant souhaité",
			amountMin: 500,
			amountMax: 75000,
			cta: {
				label: "Je découvre mes conditions",
				href: "#",
				target: "_self",
				variant: "accent",
				size: "medium",
			},
		},
	},
};

export const WithoutSimulator: Story = {
	name: "Sans simulateur",
	args: {
		...defaultArgs,
		simulator: undefined,
	},
};
