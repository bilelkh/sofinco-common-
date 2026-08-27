import type { Meta, StoryObj } from "@storybook/react-vite";
import Cta from "./Cta";

const meta = {
	title: "shared/ui/Cta",
	component: Cta,
	args: {
		label: "Click me",
		variant: "primary",
		type: "button",
	},
	argTypes: {
		variant: {
			control: "select",
			options: [
				"primary",
				"secondary",
				"accent",
				"ghost",
				"danger",
				"outlined",
				"app-badge",
				"campaign",
			],
		},
		size: {
			control: "select",
			options: ["small", "medium", "large"],
		},
		type: {
			control: "select",
			options: ["button", "submit", "reset"],
		},
		isLoading: { control: "boolean" },
		isDisabled: { control: "boolean" },
		href: { control: "text" },
		label: { control: "text" },
		onClick: { action: "clicked" },
	},
} satisfies Meta<typeof Cta>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
	args: {
		variant: "primary",
	},
};

export const Secondary: Story = {
	args: {
		variant: "secondary",
	},
};

export const Accent: Story = {
	args: {
		variant: "accent",
	},
};

export const Ghost: Story = {
	args: {
		variant: "ghost",
	},
};

export const Danger: Story = {
	args: {
		variant: "danger",
	},
};

export const Campaign: Story = {
	args: {
		variant: "campaign",
		label: "Voir la campagne",
		iconLeft: "play",
		href: "#",
		ctaSection: "hero-campaign-cta",
	},
	decorators: [
		(Story) => (
			<div
				style={{
					padding: "48px 24px",
					borderRadius: "16px",
					backgroundImage:
						"url(https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80)",
					backgroundSize: "cover",
					backgroundPosition: "center",
				}}
			>
				<Story />
			</div>
		),
	],
	parameters: {
		docs: {
			description: {
				story:
					"Glass overlay pill for a dark / video hero (see `HeroV4`). Translucent navy background with backdrop blur and a self-contained turquoise play-circle icon. Shown here over a navy backdrop so the pill reads.",
			},
		},
	},
};

export const Outlined: Story = {
	args: {
		variant: "outlined",
		iconLeft: "search",
		iconOnly: true,
	},
};

export const Loading: Story = {
	args: {
		isLoading: true,
	},
};

export const Disabled: Story = {
	args: {
		isDisabled: true,
	},
};

export const WithIconLeft: Story = {
	args: {
		iconLeft: "arrow-left",
	},
};

export const WithIconRight: Story = {
	args: {
		iconRight: "arrow-right",
	},
};

export const AsLink: Story = {
	args: {
		href: "https://example.com",
		label: "Go to example",
	},
};

export const WithTracking: Story = {
	args: {
		label: "Souscrire en ligne",
		href: "https://example.com/souscrire",
		ctaSection: "hero",
		tracking: {
			event: "click_subscribe",
			product: "pret_perso",
			position: "hero_primary",
		},
	},
	parameters: {
		docs: {
			description: {
				story:
					"Custom `tracking` event merged with the default `click_cta` payload. Inspect the rendered `data-tracking` attribute to see both events serialized as a JSON array.",
			},
		},
	},
};

export const WithTrackingButton: Story = {
	args: {
		label: "Ouvrir le simulateur",
		ctaSection: "homepage",
		tracking: {
			event: "open_simulator",
			simulator_type: "pret_auto",
		},
	},
	parameters: {
		docs: {
			description: {
				story:
					"Tracking on a button (no `href`). The `data-tracking` attribute is read by the global click delegator at runtime.",
			},
		},
	},
};
