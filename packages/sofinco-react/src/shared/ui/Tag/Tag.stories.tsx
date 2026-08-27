import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tag } from "./Tag";

const meta: Meta<typeof Tag> = {
	title: "shared/ui/Tag",
	component: Tag,
	decorators: [
		(Story) => (
			<div style={{ padding: "24px", backgroundColor: "var(--color-primary-light)" }}>
				<Story />
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof Tag>;

export const Default: Story = {
	name: "Défaut",
	args: {
		children: "Carte",
	},
};

export const LongLabel: Story = {
	name: "Libellé long",
	args: {
		children: "Flexibilité",
	},
};
