import type { Meta, StoryObj } from "@storybook/react-vite";
import { composeStories } from "@storybook/react-vite";
import { action } from "storybook/actions";

import * as MultiStepFormStories from "@b2b/features/MultiStepForm/MultiStepForm.stories";

import FormHero from "./FormHero";

/*
 * Le parcours vient de la story du formulaire : le bandeau n'a pas à redéclarer
 * une configuration d'étapes pour se documenter, et deux copies divergeraient à
 * la première évolution de la maquette.
 */
const { Default: Form } = composeStories(MultiStepFormStories);
const CONFIRMATION_STORY_URL =
	"http://localhost:8080/?path=/story/pages-b2b-partnerconfirmationpage--default";

const meta = {
	title: "b2b/features/FormHero",
	component: FormHero,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		title: "Devenez Partenaire Sofinco",
		subtitle:
			"Proposez le financement Sofinco à vos clients. Plus de 15 000 entreprises l'ont déjà choisi.",
	},
	argTypes: {
		title: { control: "text" },
		subtitle: { control: "text" },
		titleAs: { control: "inline-radio", options: ["h1", "h2"] },
		className: { control: "text" },
		children: { control: false },
	},
} satisfies Meta<typeof FormHero>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Bandeau seul — titre et accroche viennent de Jahia. */
export const Default: Story = {};

/** Sans accroche : le bandeau se referme sur le seul titre, sans paragraphe vide. */
export const TitleOnly: Story = {
	args: {
		subtitle: undefined,
	},
};

/**
 * L'assemblage de la maquette : le formulaire occupe l'emplacement chevauchant et
 * remonte sur le bas du bandeau. C'est le rendu à comparer à la maquette, et la
 * combinaison que Jahia pose sur une page « formulaire ».
 */
export const WithForm: Story = {
	args: {
		children: (
			<Form
				settings={{}}
				onSubmit={(values) => {
					action("submit")(values);
					window.top?.location.assign(CONFIRMATION_STORY_URL);
				}}
			/>
		),
	},
};

/**
 * L'emplacement n'est pas réservé au formulaire : il accueille n'importe quel
 * contenu, dont la hauteur reste libre — la carte est dans le flux.
 */
export const WithOverlappingCard: Story = {
	args: {
		children: (
			<div
				style={{
					width: "100%",
					maxWidth: 660,
					minHeight: 320,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "var(--color-white)",
					borderRadius: "var(--radius-xl)",
					color: "var(--color-text-muted)",
				}}
			>
				Emplacement du formulaire
			</div>
		),
	},
};
