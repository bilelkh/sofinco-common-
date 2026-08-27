import type { Meta, StoryObj } from "@storybook/react-vite";
import HeroV3 from "./HeroV3";

const meta: Meta<typeof HeroV3> = {
	title: "B2C/Hero/HeroV3",
	component: HeroV3,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof HeroV3>;

const defaultArgs = {
	variant: "v3" as const,
	title: "Financez vos projets avec le crédit conso Sofinco",
	subtitle: "Bénéficiez d'un TAEG fixe de 4,50% pour 15 000€ empruntés",
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
	hookValue: "4,50%",
	hookDateLabel: "JUSQU'AU 7 JANVIER",
	cta: {
		type: "button" as const,
		variant: "accent" as const,
		label: "Je profite de l'offre",
		href: "#",
		props: { target: "_self" },
	},
	badgeLabel: "Prêt perso",
};

export const Default: Story = {
	args: defaultArgs,
};

export const WithSimulator: Story = {
	args: {
		...defaultArgs,
		simulator: {
			simulatorTitle: "Financez vos projets avec le crédit conso Sofinco",
			amountPlaceholder: "J'ai besoin de",
			amountMin: 500,
			amountMax: 75000,
			cta: {
				label: "Je simule mon crédit",
				href: "#",
				target: "_self",
				variant: "accent",
				size: "medium",
				type: "submit",
			},
		},
	},
};

export const WithoutCta: Story = {
	name: "Sans CTA principal",
	args: {
		...defaultArgs,
		cta: undefined,
	},
};

export const WithoutBadge: Story = {
	name: "Sans badge",
	args: {
		...defaultArgs,
		badgeLabel: undefined,
	},
};
