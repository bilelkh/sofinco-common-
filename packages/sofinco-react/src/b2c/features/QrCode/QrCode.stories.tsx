import type { Meta, StoryObj } from "@storybook/react-vite";

import QrCode from "./QrCode";

const meta = {
	title: "B2C/QrCode/QrCode",
	component: QrCode,

	args: {
		src: "/images/samples/QrCode/qr-code.svg",
		text: "Scannez le QR code pour accéder à l'application.",
		// Le canvas de docs est plus étroit que le seuil de 1041px : sans cette échappatoire,
		// toutes les stories ci-dessous rendraient une zone vide. Voir `BelowThreshold` pour le
		// comportement réellement servi au visiteur.
		alwaysVisible: true,
	},
	argTypes: {
		src: { control: "text" },
		text: { control: "text" },
		className: { control: "text" },
		alwaysVisible: { control: "boolean" },
	},
} satisfies Meta<typeof QrCode>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithShortText: Story = {
	args: {
		text: "Télécharger l'app",
	},
};

export const WithLongText: Story = {
	args: {
		text: "Scannez ce QR code pour continuer votre parcours sur mobile et retrouver votre demande en cours.",
	},
};

export const BelowThreshold: Story = {
	name: "Sous le seuil (1041px) — rien n'est affiché",
	args: {
		alwaysVisible: false,
	},
	parameters: {
		viewport: { defaultViewport: "tablet" },
	},
};
