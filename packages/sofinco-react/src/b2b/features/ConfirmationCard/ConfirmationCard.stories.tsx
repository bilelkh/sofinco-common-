import type { Meta, StoryObj } from "@storybook/react-vite";

import FormHero from "@b2b/features/FormHero/FormHero";

import ConfirmationCard from "./ConfirmationCard";

const meta = {
	title: "b2b/features/ConfirmationCard",
	component: ConfirmationCard,
	parameters: {
		layout: "centered",
	},
	args: {
		title: "Demande envoyée",
		message: "Merci, nous avons bien reçu votre demande de partenariat.",
	},
	argTypes: {
		title: { control: "text" },
		message: { control: "text" },
		className: { control: "text" },
	},
} satisfies Meta<typeof ConfirmationCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Carte seule, avec les trois puces de réassurance du parcours partenaire. */
export const Default: Story = {};

/**
 * Puces retirées : un tableau vide suffit, la carte se referme sur son message
 * sans laisser de liste vide.
 */
export const WithoutReassurances: Story = {
	args: {
		reassurances: [],
	},
};

/** Réassurances propres à un autre parcours — la liste est une donnée, pas un acquis. */
export const CustomReassurances: Story = {
	args: {
		reassurances: [
			{ icon: "message-circle-buble", label: "Un conseiller vous rappelle" },
			{ icon: "folder-check", label: "Dossier complet" },
		],
	},
};

/**
 * L'assemblage de la maquette : la carte occupe l'emplacement chevauchant de
 * `FormHero`, à la place qu'y tenait le formulaire.
 */
export const InFormHero: Story = {
	parameters: {
		layout: "fullscreen",
	},
	render: (args) => (
		<FormHero
			title="Devenez Partenaire Sofinco"
			subtitle="Proposez le financement Sofinco à vos clients. Plus de 15 000 entreprises l'ont déjà choisi."
		>
			<ConfirmationCard {...args} />
		</FormHero>
	),
};
