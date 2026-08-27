import type { Meta, StoryObj } from "@storybook/react-vite";
import SolutionComplementary from "./SolutionComplementary";
import mainMeta, { Default } from "./SolutionComplementary.stories";

// Vue élargie du meta principal pour réutiliser ses args/parameters.
const base: Meta<typeof SolutionComplementary> = mainMeta;

const meta: Meta<typeof SolutionComplementary> = {
	title: "Common/Solution/SolutionComplementary/B2C",
	component: SolutionComplementary,
	parameters: { ...(base.parameters ?? {}) },
	args: base.args,
};

export default meta;

type Story = StoryObj<typeof SolutionComplementary>;

export const Apercu: Story = {
	...Default,
	name: "Aperçu",
};
