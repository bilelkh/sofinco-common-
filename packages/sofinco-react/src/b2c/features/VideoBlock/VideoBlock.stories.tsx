import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import VideoBlock from "./VideoBlock";

const transcriptionContent = `
	<p><strong>C'est quoi un prêt personnel ? Quelle est sa définition ? Aujourd'hui, Sofinco vous répond !</strong></p>
	<p>Vous avez un projet en tête : travaux, mariage ou voyage ?</p>
	<p>Le prêt personnel Sofinco est une <strong>solution de financement rapide, claire et accessible</strong> pour concrétiser vos envies.</p>
	<p>C'est un crédit à la consommation non affecté : vous empruntez un montant précis et le remboursez par mensualités fixes sur une durée définie.</p>
	<p><strong>Quelle différence avec un crédit renouvelable ?</strong></p>
	<p>Le prêt personnel correspond à un montant fixe versé en une fois pour un projet défini.</p>
	<p>Le crédit renouvelable peut être utilisé au fil de vos besoins dans la limite des fonds disponibles.</p>
	<p><strong>Pourquoi choisir le prêt personnel Sofinco ?</strong></p>
	<p>Une solution de financement fiable et personnalisable pour accompagner vos projets.</p>
`;

const meta = {
	title: "B2C/VideoBlock",
	component: VideoBlock,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		title: {
			children: "Comprendre le prêt personnel",
			as: "h2",
		},
		subtitle:
			"Découvrez en quelques minutes le fonctionnement d'un prêt personnel et les avantages de cette solution de financement.",
		video: {
			url: "https://www.youtube-nocookie.com/embed/QfSm9j6KFNw",
			title: "Carte de crédit Sofinco, comment ça marche ?",
		},
		previewImg: {
			url: "https://images.unsplash.com/photo-1781461241820-a32cf22e10dd?q=80&w=3132&auto=format&fit=crop",
			alt: "",
		},
		transcription: {
			title: "Retranscription vidéo",
			content: transcriptionContent,
		},
	},
	argTypes: {
		title: {
			control: "object",
		},
		subtitle: {
			control: "text",
		},
		video: {
			control: "object",
		},
		previewImg: {
			control: "object",
		},
		transcription: {
			control: "object",
		},
	},
} satisfies Meta<typeof VideoBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPreviewImage: Story = {
	name: "Avec image de prévisualisation",
};

export const WithoutPreviewImage: Story = {
	name: "Sans image de prévisualisation",
	args: {
		previewImg: undefined,
	},
};

export const WithoutHeading: Story = {
	name: "Sans titre ni sous-titre",
	args: {
		title: undefined,
		subtitle: undefined,
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// Tracking — vérifie que les attributs data-tracking / data-tracking-view sont
// présents avec le bon payload. Lance par storybook+vitest (addon-vitest).
// ─────────────────────────────────────────────────────────────────────────────

const VIDEO_TITLE = "Carte de crédit Sofinco, comment ça marche ?";

/**
 * Vérifie le payload `launch_video` côté preview button + le payload
 * `video_impression` côté root. Le bootstrap global (#lib/tracking-bootstrap
 * dans template-set) lit ces attributs au runtime et push dans dataLayer.
 */
export const TrackingAttributes: Story = {
	name: "Tracking — attributs data-tracking",
	tags: ["!dev"], // story technique, non listée dans la sidebar par défaut
	args: {
		video: { url: "https://www.youtube-nocookie.com/embed/abc", title: VIDEO_TITLE },
		previewImg: { url: "https://example.com/preview.png", alt: "" },
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// 1. Le bouton de preview porte data-tracking={launch_video}
		const playButton = await canvas.findByRole("button", {
			name: `Lire la vidéo : ${VIDEO_TITLE}`,
		});
		const launchPayload = JSON.parse(playButton.getAttribute("data-tracking") ?? "{}");
		expect(launchPayload).toEqual({
			event: "launch_video",
			video_label: VIDEO_TITLE,
		});

		// 2. La racine porte data-tracking-view={video_impression}
		const root = canvasElement.querySelector("[data-tracking-view]");
		expect(root).not.toBeNull();
		const impressionPayload = JSON.parse(root!.getAttribute("data-tracking-view") ?? "{}");
		expect(impressionPayload).toEqual({
			event: "video_impression",
			video_label: VIDEO_TITLE,
		});
	},
};

/**
 * Garde-fou : sans previewImg, le clic n'a pas lieu → pas de
 * data-tracking sur un bouton (l'iframe est rendu directement).
 * La vue impression reste portée par la racine.
 */
export const TrackingWithoutPreview: Story = {
	name: "Tracking — sans image de prévisualisation",
	tags: ["!dev"],
	args: {
		previewImg: undefined,
	},
	play: async ({ canvasElement }) => {
		// Pas de bouton « Lire la vidéo : … » → pas de data-tracking de launch
		const buttons = canvasElement.querySelectorAll("button[data-tracking]");
		expect(buttons.length).toBe(0);

		// La vue impression reste présente sur la racine
		const root = canvasElement.querySelector("[data-tracking-view]");
		expect(root).not.toBeNull();
	},
};