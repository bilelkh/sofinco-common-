import type { Meta, StoryObj } from "@storybook/react-vite";
import { SectionHero } from "./SectionHero";

const meta: Meta<typeof SectionHero> = {
	title: "B2C/Hero/SectionHero",
	component: SectionHero,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof SectionHero>;

const heroBase = {
	variant: "v1" as const,
	title: "La liberté d'agir sur mes projets, quand je le décide",
	subtitle:
		"Avec Sofinco, vous pilotez votre argent à votre rythme. Des outils simples et clairs, pensés pour la vraie vie.",
	img: {
		lowSrc: "/images/samples/HomePage/Hero/hero-image-homepage-mobile.webp",
		desktopSrc: "/images/samples/HomePage/Hero/hero-image-homepage-desktop.webp",
		tabletSrc: "/images/samples/HomePage/Hero/hero-image-homepage-tablet.webp",
		mobileSrc: "/images/samples/HomePage/Hero/hero-image-homepage-mobile.webp",
	},
	args: [
		{ id: "1", label: "Suivi de mes prêts" },
		{ id: "2", label: "Pilotage de ma réserve" },
		{ id: "3", label: "Paiement différé ou fractionné" },
	],
};

const simulator = {
	simulatorTitle: "Financez vos projets avec le crédit conso Sofinco",
	amountPlaceholder: "J'ai besoin de €",
	amountMin: 500,
	amountMax: 75000,
	cta: {
		label: "Je simule mon crédit",
		href: "#",
		target: "_self",
		variant: "accent" as const,
		size: "medium" as const,
	},
};

const qrApp = {
	src: "/images/samples/QrCode/qr-code.svg",
	text: "Télécharger l'app.",
	isActive: true,
};

export const Default: Story = {
	args: {
		hero: heroBase,
	},
};

export const WithSimulator: Story = {
	args: {
		hero: { ...heroBase, simulator },
		simulator,
	},
};

export const WithQrSticker: Story = {
	name: "Avec QR Sticker",
	args: {
		hero: { ...heroBase, simulator },
		simulator,
		qrApp,
	},
};
