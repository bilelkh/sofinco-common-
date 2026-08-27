import type { Meta, StoryObj } from "@storybook/react-vite";
import Menu from "./Menu";
import mainMeta, { Default } from "./Menu.stories";

// Vue élargie du meta principal pour réutiliser ses args/parameters.
const base: Meta<typeof Menu> = mainMeta;

const meta: Meta<typeof Menu> = {
	title: "Common/Menu/Menu/B2C",
	component: Menu,
	parameters: { ...(base.parameters ?? {}) },
	args: base.args,
};

export default meta;

type Story = StoryObj<typeof Menu>;

export const Apercu: Story = {
	...Default,
	name: "Aperçu",
};
