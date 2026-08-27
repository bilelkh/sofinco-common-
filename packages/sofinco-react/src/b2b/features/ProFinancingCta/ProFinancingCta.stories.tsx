import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProFinancingCta } from "./ProFinancingCta";

const meta = {
	title: "B2B/ProFinancingCta",
	component: ProFinancingCta,
	parameters: {
		layout: "padded",
	},
	args: {
		eyebrow: "Financement professionnel",
		title: "Développez votre activité avec Sofinco Pro",
		subtitle:
			"Des solutions de financement adaptées aux entreprises et aux indépendants, avec un accompagnement dédié.",
		cta: { label: "Être recontacté", href: "#" },
	},
} satisfies Meta<typeof ProFinancingCta>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
