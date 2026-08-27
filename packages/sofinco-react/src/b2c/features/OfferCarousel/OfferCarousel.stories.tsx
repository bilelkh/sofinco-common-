import type { Meta, StoryObj } from "@storybook/react-vite";
import { OfferCarousel } from "./OfferCarousel";

const meta = {
	title: "B2C/OfferCarousel",
	component: OfferCarousel,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		slides: [
			{
				id: "offer-carte-colored",
				variant: "colored" as const,
				title: "Avec la carte Sofinco, j'ai le pouvoir de payer en 1x, 3x, 10X",
				description:
					"Avec la carte Sofinco associée à son crédit renouvelable, choisissez de régler vos achats au comptant ou en plusieurs fois, même après l'achat !",
				backgroundColor: "#9FF0EA",
				img: "/images/samples/HomePage/OfferCarousel/promo-actu-carte-desktop.webp",
				cta: { label: "Je découvre la carte", href: "#" },
			},
			{
				id: "offer-carte-glossy",
				variant: "glossy" as const,
				title: "Avec la carte Sofinco, j'ai le pouvoir de payer en 1x, 3x, 10X",
				description:
					"Avec la carte Sofinco associée à son crédit renouvelable, choisissez de régler vos achats au comptant ou en plusieurs fois, même après l'achat !",
				imgMobile: "/images/samples/HomePage/OfferCarousel/promo-actu-carte-mobile.webp",
				imgDesktop: "/images/samples/HomePage/OfferCarousel/promo-actu-carte-desktop.webp",
				cta: { label: "Je découvre la carte", href: "#" },
			},
			{
				id: "offer-electrifions",
				variant: "colored" as const,
				title:
					"Sofinco s'engage en débloquant l'éco rénovation avec le mouvement Électrifions la France",
				description:
					"Sofinco est le premier établissement financier habilité par l'État comme mandataire financier de l'Anah, capable d'avancer MaPrimeRénov', de financer le reste à charge et d'accompagner les particuliers dans leurs démarches administratives. Nous sommes fiers de permettre aux Français de passer à l'action dans leurs projets d'éco-rénovation !",
				backgroundColor: "#FDF0FE",
				img: "/images/samples/HomePage/OfferCarousel/promo-actu-electrifion-la-france-desktop.webp",
			},
			{
				id: "offer-nouvelle-identite",
				variant: "glossy" as const,
				title: "Sofinco fête ses 75 ans, découvrez notre nouvelle identité !",
				description:
					"Un nouveau territoire qui affirme notre évolution vers une marque de paiement et de financement plus tech, plus fluide, plus transparente et pleinement ancrée dans les usages contemporains.",
				imgMobile:
					"/images/samples/HomePage/OfferCarousel/promo-actu-nouvelle-identite-mobile.webp",
				imgDesktop:
					"/images/samples/HomePage/OfferCarousel/promo-actu-nouvelle-identite-desktop.webp",
				cta: { label: "Je découvre", href: "#" },
			},
		],
	},
} satisfies Meta<typeof OfferCarousel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SlideRate: Story = {
	args: {
		slides: [
			{
				id: "offer-rate-1",
				variant: "rate" as const,
				rateValue: "4,50%",
				rateSuffix: "TAEG FIXE",
				eyebrow: "JUSQU'AU 7 JANVIER",
				description: "Bénéficiez d'un TAEG fixe de 4,50% pour 15 000€ empruntés",
				cta: { label: "Je profite de l'offre", href: "#" },
			},
		],
	},
};

export const SlideGlossy: Story = {
	args: {
		slides: [
			{
				id: "offer-glossy-1",
				variant: "glossy" as const,
				title: "Retrouvez Sofinco à la TV !",
				description:
					"Sofinco réinvente l'expérience du crédit en proposant un parcours de souscription innovant : 100% digital, instantané, intelligent et pédagogique.",
				imgMobile: "/images/samples/HomePage/OfferCarousel/promo-actu-carte-mobile.webp",
				imgDesktop: "/images/samples/HomePage/OfferCarousel/promo-actu-carte-desktop.webp",
				cta: { label: "Découvrir la campagne", href: "#" },
			},
		],
	},
};

export const SlideColored: Story = {
	args: {
		slides: [
			{
				id: "offer-colored-1",
				variant: "colored" as const,
				title: "Sofinco récompensé par l'Association Française de la Relation Client",
				description:
					"Sofinco réinvente l'expérience du crédit en proposant un parcours de souscription de crédit innovant : 100% digital, instantané, intelligent et pédagogique.",
				eyebrow: "Un prix décerné par l'Association Française de la Relation Client",
				backgroundColor: "#FDF0FE",
				img: "/images/samples/HomePage/OfferCarousel/promo-actu-nouvelle-identite-desktop.webp",
			},
		],
	},
};

export const Mobile: Story = {
	parameters: {
		viewport: { defaultViewport: "mobile1" },
	},
};
