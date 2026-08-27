import type { Meta, StoryObj } from "@storybook/react-vite";

import Stepper from "./Stepper";

/** Largeur du composant dans la maquette — les deux variantes y sont posées en 380px. */
const FRAME_WIDTH = 380;

const meta = {
	title: "shared/ui/Stepper",
	component: Stepper,
	args: {
		variant: "line",
		activeStep: 1,
		label: "label",
		hasButton: false,
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["line", "number"],
		},
		activeStep: { control: { type: "number", min: 1 } },
		totalSteps: { control: { type: "number", min: 1 } },
		label: { control: "text" },
		hasButton: { control: "boolean" },
		backLabel: { control: "text" },
		ariaLabel: { control: "text" },
		className: { control: "text" },
		onBack: { action: "back" },
	},
	decorators: [
		(Story) => (
			<div style={{ width: FRAME_WIDTH }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Stepper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const LineWithBackButton: Story = {
	args: {
		hasButton: true,
		activeStep: 2,
	},
};

export const LineComplete: Story = {
	args: {
		activeStep: 6,
	},
};

/** Les six états de la variante `line`, dans l'ordre de la planche Figma. */
export const LineAllSteps: Story = {
	render: (args) => (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			{[1, 2, 3, 4, 5, 6].map((step) => (
				<Stepper key={step} {...args} variant="line" activeStep={step} />
			))}
		</div>
	),
};

export const Number: Story = {
	args: {
		variant: "number",
	},
};

/** Les quatre états de la variante `number` : le libellé suit la pastille courante. */
export const NumberAllSteps: Story = {
	render: (args) => (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			{[1, 2, 3, 4].map((step) => (
				<Stepper key={step} {...args} variant="number" activeStep={step} />
			))}
		</div>
	),
};

/** Le nombre d'étapes n'est pas figé : la maquette n'en fixe que la valeur par défaut. */
export const NumberThreeSteps: Story = {
	args: {
		variant: "number",
		totalSteps: 3,
		activeStep: 2,
		label: "Vos informations",
	},
};
