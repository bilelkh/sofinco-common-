import type { Meta, StoryObj } from "@storybook/react-vite";
import { Footer } from "./Footer";
import mainMeta, { Default } from "./Footer.stories";

// Vue élargie du meta principal pour réutiliser ses args/parameters.
const base: Meta<typeof Footer> = mainMeta;

const meta: Meta<typeof Footer> = {
	title: "Common/Footer/B2C",
	component: Footer,
	parameters: { ...(base.parameters ?? {}) },
	args: base.args,
};

export default meta;

type Story = StoryObj<typeof Footer>;

export const Apercu: Story = {
	...Default,
	name: "Aperçu",
};
