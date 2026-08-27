import type { Meta, StoryObj } from "@storybook/react-vite";

import SeoMesh from "./SeoMesh";
import { creditBlock, epargneBlock } from "./SeoMesh.samples";

const meta = {
	title: "Common/SeoMesh/SeoMesh",
	component: SeoMesh,
	args: {
		blocks: [creditBlock],
	},
	argTypes: {
		blocks: { control: "object" },
	},
} satisfies Meta<typeof SeoMesh>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TwoBlocks: Story = {
	name: "Deux blocs",
	args: {
		blocks: [creditBlock, epargneBlock],
	},
};

