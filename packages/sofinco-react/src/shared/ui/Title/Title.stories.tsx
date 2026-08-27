import type { Meta, StoryObj } from "@storybook/react-vite";

import Title from "./Title";

const meta = {
	title: "Shared/UI/Title",
	component: Title,
	args: {
		children: "Hello World",
		as: "h1",
	},
	argTypes: {
		as: {
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
	},
} satisfies Meta<typeof Title>;

export default meta;

type Story = StoryObj<typeof meta>;

export const H1: Story = {
	args: {
		as: "h1",
	},
};

export const H2: Story = {
	args: {
		as: "h2",
	},
};

export const H3: Story = {
	args: {
		as: "h3",
	},
};

export const H4: Story = {
	args: {
		as: "h4",
	},
};

export const H2WithH3Style: Story = {
	name: "H2 with H3 style",
	args: {
		as: "h2",
		visualStyle: "h3",
		children: "Semantic H2 with H3 appearance",
	},
};

export const H2WithH4Style: Story = {
	name: "H2 with H4 style",
	args: {
		as: "h2",
		visualStyle: "h4",
		children: "Semantic H2 with H4 appearance",
	},
};

export const H3WithH2Style: Story = {
	name: "H3 with H2 style",
	args: {
		as: "h3",
		visualStyle: "h2",
		children: "Semantic H3 with H2 appearance",
	},
};

export const NoVisualStyle: Story = {
	name: "No visual style (none)",
	args: {
		as: "h1",
		visualStyle: "none",
		children: "Semantic H1 without heading visual styles",
	},
};

export const Dark: Story = {
	args: {
		as: "h2",
		variant: "dark",
		children: "Titre dark (navy)",
	},
};

export const White: Story = {
	args: {
		as: "h2",
		variant: "white",
		children: "Titre blanc sur fond coloré",
	},
	parameters: {
		backgrounds: { default: "dark" },
	},
};
