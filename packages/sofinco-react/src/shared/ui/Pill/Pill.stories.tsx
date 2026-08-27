import type { Meta, StoryObj } from "@storybook/react-vite";

import Pill from "./Pill";

const meta = {
  title: "Shared/UI/Pill",
  component: Pill,
  args: {
    label: "Sans engagement",
    icon: "check",
  },
  argTypes: {
    label: { control: "text" },
    icon: { control: "text" },
    className: { control: "text" },
  },
} satisfies Meta<typeof Pill>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithIcon: Story = {};

export const LabelOnly: Story = {
  args: {
    icon: undefined,
  },
};
