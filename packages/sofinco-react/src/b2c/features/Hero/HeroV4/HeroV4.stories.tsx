import type { Meta, StoryObj } from "@storybook/react-vite";
import HeroV4 from "./HeroV4";

const meta: Meta<typeof HeroV4> = {
	title: "B2C/Hero/HeroV4",
	component: HeroV4,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof HeroV4>;

const defaultArgs = {
	variant: "v4" as const,
	title: "Gérez vos dépenses. Financez vos projets.",
	subtitle:
		"Prêts, réserve d'argent, paiements flexibles : optez pour la solution qui vous convient.",
	video: {
		srcDesktop: "https://videos.pexels.com/video-files/36139210/15325786_2560_1440_30fps.mp4",
		srcMobile: "https://videos.pexels.com/video-files/36139210/15325786_2560_1440_30fps.mp4",
		poster:
			"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=80",
	},
	campaignCta: {
		label: "Voir la campagne",
		href: "#",
		ctaSection: "hero-campaign-cta",
	},
	qr: {
		src: "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://www.sofinco.fr",
		text: "Télécharger l'app.",
	},
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
			},
		},

		video: {
			srcDesktop: "https://videos.pexels.com/video-files/36139210/15325786_2560_1440_30fps.mp4",
			srcMobile: "https://videos.pexels.com/video-files/36139210/15325786_2560_1440_30fps.mp4",
			poster:
				"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=80",
		},
	},
};

export const WithoutSimulator: Story = {
	name: "Sans simulateur",
	args: {
		...defaultArgs,
		simulator: undefined,

		video: {
			srcDesktop: "https://videos.pexels.com/video-files/36139210/15325786_2560_1440_30fps.mp4",
			srcMobile: "https://videos.pexels.com/video-files/36139210/15325786_2560_1440_30fps.mp4",
			poster:
				"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=80",
		},
	},
};
