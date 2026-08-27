import type { Meta, StoryObj } from "@storybook/react-vite";
import Card from "./Card";

const defaultArgs = {
	title: "Financez vos projets avec le crédit conso Sofinco",
	image: "/images/samples/Menu/nos-solutions-navigation-menu.webp",
	cta: {
		label: "Decouvrir",
		type: "button",
		variant: "primary",
	},
} as const;

const meta = {
	title: "Common/Menu/Desktop/Card",
	component: Card,
	args: defaultArgs,
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "fullbg"],
		},
		image: { control: "text" },
		title: { control: "text" },
		cta: { control: "object" },
	},
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => (
			<div style={{ maxWidth: "364px", maxHeight: "432px" }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultVariant: Story = {
	args: {
		variant: "default",
		title: "Financez vos projets avec le crédit conso Sofinco",
		image: "/images/samples/Menu/nos-solutions-navigation-menu.webp",
	},
};

export const FullBackgroundVariant: Story = {
	args: {
		variant: "fullbg",
		title: "Payez au quotidien avec le crédit renouvelable Sofinco",
		image: "/images/samples/Menu/payer-au-quotidien-navigation-menu.webp",
	},
};

export const WithCtaLink: Story = {
	args: {
		variant: "default",
		cta: {
			label: "Je découvre mes conditions",
			type: "button",
			variant: "accent",
			href: "https://example.com",
		},
	},
};

/** `cta` is optional — without it the card renders image + title only. */
export const WithoutCta: Story = {
	args: {
		variant: "default",
		title: "Financez vos projets avec le crédit conso Sofinco",
		cta: undefined,
	},
};
