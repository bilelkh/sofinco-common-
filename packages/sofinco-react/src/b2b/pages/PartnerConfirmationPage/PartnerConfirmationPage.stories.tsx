import type { Meta, StoryObj } from "@storybook/react-vite";

import PartnerConfirmationPage from "./PartnerConfirmationPage";


const meta = {
	title: "Pages/B2B/PartnerConfirmationPage",
	component: PartnerConfirmationPage,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		title: "Devenez Partenaire Sofinco",
		subtitle: "Proposez le financement Sofinco à vos clients. Plus de 15 000 entreprises l'ont déjà choisi.",
		confirmationTitle: "Demande envoyée",
		confirmationMessage: "Merci, nous avons bien reçu votre demande de partenariat.",
	},
} satisfies Meta<typeof PartnerConfirmationPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
