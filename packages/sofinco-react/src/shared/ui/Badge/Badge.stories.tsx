import type { Meta, StoryObj } from "@storybook/react-vite";

import Badge from "./Badge";

const meta = {
	title: "shared/ui/Badge",
	component: Badge,
	args: {
		label: "Prêt perso",
		variant: "accent",
	},
	argTypes: {
		label: { control: "text" },
		variant: {
			control: "select",
			options: ["accent", "primary"],
		},
		className: { control: "text" },
	},
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Accent: Story = {};

export const Primary: Story = {
	args: {
		variant: "primary",
	},
};