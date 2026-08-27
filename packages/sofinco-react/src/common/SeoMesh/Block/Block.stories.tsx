import type { Meta, StoryObj } from "@storybook/react-vite";

import Block from "./Block";

const meta = {
  title: "Common/SeoMesh/Block",
  component: Block,
  decorators: [
    (Story) => (
      <div style={{ padding: "32px", backgroundColor: "#f5f5f5" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    title: "Besoins d'un Crédit ?",
    ctaProps: {
      href: "/credit-conso",
      label: "Je fais un crédit conso",
      type: "button",
      variant: "accent",
      size: "small",
      iconRight: "arrow-right",
    },
    linkSectionLeft: {
      title: "Types de crédit",
      links: [
        {
          href: "/credit-personnel",
          label: "Crédit personnel",
          iconLeft: "arrow-right" as const,
        },
        {
          href: "/credit-renouvelable",
          label: "Crédit renouvelable",
          iconLeft: "arrow-right" as const,
        },
        {
          href: "/credit-auto",
          label: "Crédit auto",
          iconLeft: "arrow-right" as const,
        },
        {
          href: "/credit-travaux",
          label: "Crédit travaux",
          iconLeft: "arrow-right" as const,
        },
        {
          href: "/rachat-credit",
          label: "Rachat de crédit",
          iconLeft: "arrow-right" as const,
        },
      ],
    },
    linkSectionRight: {
      title: "Guides pratiques",
      links: [
        {
          href: "/guide/simuler-credit",
          label: "Simuler un crédit",
          iconLeft: "arrow-right" as const,
        },
        {
          href: "/guide/taux-interet",
          label: "Comprendre les taux d'intérêt",
          iconLeft: "arrow-right" as const,
        },
        {
          href: "/guide/assurance-emprunteur",
          label: "L'assurance emprunteur",
          iconLeft: "arrow-right" as const,
        },
        {
          href: "/guide/remboursement",
          label: "Gérer son remboursement",
          iconLeft: "arrow-right" as const,
        },
        {
          href: "/guide/surendettement",
          label: "Éviter le surendettement",
          iconLeft: "arrow-right" as const,
        },
      ],
    },
  },
  argTypes: {
    title: { control: "text" },
    ctaProps: { control: "object" },
    linkSectionLeft: { control: "object" },
    linkSectionRight: { control: "object" },
    className: { control: "text" },
  },
} satisfies Meta<typeof Block>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: "block-default",
  },
};

export const OnlyLeftSection: Story = {
  args: {
    id: "block-only-left",
    linkSectionRight: undefined,
  },
};

export const OnlyRightSection: Story = {
  args: {
    id: "block-only-right",
    linkSectionLeft: undefined,
  },
};

export const NoLinkSections: Story = {
  args: {
    id: "block-no-links",
    linkSectionLeft: undefined,
    linkSectionRight: undefined,
  },
};
