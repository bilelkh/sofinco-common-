import type { Meta, StoryObj } from "@storybook/react-vite";
import NewsBlock from "./NewsBlock";
import mainMeta, { Default } from "./NewsBlock.stories";

// Vue élargie du meta principal pour réutiliser ses args/parameters.
const base: Meta<typeof NewsBlock> = mainMeta;

const meta: Meta<typeof NewsBlock> = {
	title: "Common/NewsBlock/NewsBlock/B2C",
	component: NewsBlock,
	parameters: { ...(base.parameters ?? {}) },
	args: base.args,
};

export default meta;

type Story = StoryObj<typeof NewsBlock>;

export const Apercu: Story = {
	...Default,
	name: "Aperçu",
};
