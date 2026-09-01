import type { Meta, StoryObj } from "@storybook/react-vite";
import AvisClient from "@common/AvisClient/AvisClient";

const meta: Meta<typeof AvisClient> = {
	title: "Common/AvisClient",
	component: AvisClient,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof AvisClient>;

const sampleText =
	"J'ai particulièrement apprécié le fait de pouvoir faire une simulation de prêt, librement, sans donner mon identité (ceci a favorisé mon choix).";

export const Default: Story = {
	args: {
		title: "Rejoignez plus de 6 millons de clients qui ont fait confiance à Sofinco",
		subtitle: "Sofinco ? C’est encore nos clients qui en parlent le mieux..",
		linkLabel: "Voir tous les avis clients",
		linkHref: "#",
		sticker: {
			avisLogoUrl: "/images/samples/AvisClient/logo-avis-verifies.svg",
			ratingReviewsCount: 5646,
			ratingScore: 4.4,
		},
		items: [
			{
				id: "1",
				rating: 5,
				text: sampleText,
				author: "Gérard M.",
				realizedDate: "20.03.2026",
				publishedDate: "24.03.2026",
				tone: "lilac",
			},
			{
				id: "2",
				rating: 5,
				text: sampleText,
				author: "Gérard M.",
				realizedDate: "20.03.2026",
				publishedDate: "24.03.2026",
				tone: "peach",
			},
			{
				id: "3",
				rating: 5,
				text: sampleText,
				author: "Gérard M.",
				realizedDate: "20.03.2026",
				publishedDate: "24.03.2026",
				tone: "pink",
			},
			{
				id: "4",
				rating: 4,
				text: sampleText,
				author: "Marie L.",
				realizedDate: "18.03.2026",
				publishedDate: "22.03.2026",
				tone: "yellow",
			},
			{
				id: "5",
				rating: 5,
				text: sampleText,
				author: "Paul D.",
				realizedDate: "15.03.2026",
				publishedDate: "19.03.2026",
				tone: "lilac",
			},
		],
	},
};
