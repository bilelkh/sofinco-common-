import type { Meta, StoryObj } from "@storybook/react-vite";

import Subtitle from "./Subtitle";

const meta = {
	title: "Shared/UI/Subtitle",
	component: Subtitle,
	args: {
		children: "Un sous-titre pour accompagner votre contenu.",
		as: "p",
		variant: "dark",
	},
	argTypes: {
		as: {
			control: "select",
			options: ["p", "h2", "h3", "h4", "span"],
		},
		variant: {
			control: "inline-radio",
			options: ["dark", "white"],
		},
	},
} satisfies Meta<typeof Subtitle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Dark: Story = {
	args: {
		variant: "dark",
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
