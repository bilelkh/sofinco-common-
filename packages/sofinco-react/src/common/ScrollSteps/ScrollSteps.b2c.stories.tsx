import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScrollSteps } from "./ScrollSteps";
import mainMeta, { Default } from "./ScrollSteps.stories";

// Vue élargie du meta principal pour réutiliser ses args/parameters.
const base: Meta<typeof ScrollSteps> = mainMeta;

const meta: Meta<typeof ScrollSteps> = {
	title: "Common/ScrollSteps/B2C",
	component: ScrollSteps,
	parameters: { ...(base.parameters ?? {}) },
	args: base.args,
};

export default meta;

type Story = StoryObj<typeof ScrollSteps>;

export const Apercu: Story = {
	...Default,
	name: "Aperçu",
};
