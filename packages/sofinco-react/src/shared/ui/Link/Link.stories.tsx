import type { Meta, StoryObj } from "@storybook/react-vite";
import Link from "./Link";

const meta = {
	title: "shared/ui/Link",
	component: Link,
	args: {
		label: "Click here",
		href: "/example",
		iconVariant: "primary",
	},
	argTypes: {
		iconVariant: {
			control: "select",
			options: ["primary", "accent", "danger"],
		},
		isExternal: { control: "boolean" },
		href: { control: "text" },
	},
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Accent: Story = {
	args: {
		iconLeft: "chevron-up",
		iconVariant: "accent",
	},
};

export const Danger: Story = {
	args: {
		iconLeft: "chevron-up",
		iconVariant: "danger",
	},
};

export const WithIconLeft: Story = {
	args: {
		iconLeft: "chevron-up",
	},
};

export const WithIconRight: Story = {
	args: {
		iconRight: "chevron-up",
	},
};

export const WithBothIcons: Story = {
	args: {
		iconLeft: "chevron-up",
		iconRight: "chevron-up",
	},
};

export const External: Story = {
	args: {
		href: "https://example.com",
		isExternal: true,
		label: "External link",
	},
};

export const WithTracking: Story = {
	args: {
		label: "Voir toutes les actualités",
		href: "/actualites",
		iconRight: "chevron-up",
		tracking: {
			event: "click_link",
			link_label: "Voir toutes les actualités",
			link_section: "news_block",
		},
	},
	parameters: {
		docs: {
			description: {
				story:
					"Renders a `data-tracking` attribute (serialized JSON) when `tracking.event` is set. The attribute is consumed by the global click delegator installed by the template-set Layout.",
			},
		},
	},
};

export const WithoutTrackingEvent: Story = {
	args: {
		label: "No tracking event set",
		href: "/example",
		tracking: {
			link_section: "footer",
		},
	},
	parameters: {
		docs: {
			description: {
				story:
					"When `tracking.event` is omitted, no `data-tracking` attribute is emitted — extra fields alone are not enough to fire an event.",
			},
		},
	},
};
