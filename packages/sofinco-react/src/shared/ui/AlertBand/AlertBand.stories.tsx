import type { Meta, StoryObj } from "@storybook/react-vite";
import MessageCircleQuestionMark from "@/shared/ui/svg/message-circle-question-mark";

import AlertBand from "./AlertBand";

const meta = {
  title: "shared/ui/AlertBand",
  component: AlertBand,
  args: {
    message:
      "Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.",
    variant: "info",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "warning", "error", "success", "sanitary"],
    },
    message: { control: "text" },
    className: { control: "text" },
    iconLeft: { control: false },
    iconRight: { control: false },
  },
} satisfies Meta<typeof AlertBand>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Error: Story = {
  args: {
    variant: "error",
    message:
      "Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.",
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    message:
      "Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.",
  },
};

export const Sanitary: Story = {
  args: {
    variant: "sanitary",
    message:
      "Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.",
  },
};

export const WithIconLeft: Story = {
  args: {
    message:
      "Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.",
    iconLeft: <MessageCircleQuestionMark />,
  },
};

export const WithIconRight: Story = {
  args: {
    message:
      "Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.",
    iconRight: <MessageCircleQuestionMark />,
  },
};

export const WithBothIcons: Story = {
  args: {
    message:
      "Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.",
    iconLeft: <MessageCircleQuestionMark />,
    iconRight: <MessageCircleQuestionMark />,
  },
};
