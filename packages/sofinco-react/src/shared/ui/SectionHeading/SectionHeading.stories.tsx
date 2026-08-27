import type { Meta, StoryObj } from "@storybook/react-vite";

import SectionHeading from "./SectionHeading";

const meta = {
	title: "Shared/UI/SectionHeading",
	component: SectionHeading,
	args: {
		title: "Une solution pour chacun de vos besoins",
		subtitle: "Découvrez nos offres adaptées à chaque projet de financement.",
		titleAs: "h2",
		variant: "dark",
		align: "center",
	},
	argTypes: {
		titleAs: {
			control: "select",
			options: ["h1", "h2", "h3", "h4"],
		},
		visualStyle: {
			control: "select",
			options: ["h1", "h2", "h3", "h4", "none"],
		},
		variant: {
			control: "inline-radio",
			options: ["dark", "white"],
		},
		align: {
			control: "inline-radio",
			options: ["start", "center"],
		},
	},
} satisfies Meta<typeof SectionHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutSubtitle: Story = {
	args: {
		subtitle: undefined,
	},
};

export const WithEyebrow: Story = {
	args: {
		eyebrow: "Actualités",
	},
};

export const Start: Story = {
	args: {
		align: "start",
	},
};

export const White: Story = {
	args: {
		variant: "white",
	},
	parameters: {
		backgrounds: { default: "dark" },
	},
};
