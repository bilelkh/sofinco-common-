import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { InsuranceFocus } from "./InsuranceFocus";

const meta = {
	title: "B2C/InsuranceFocus",
	component: InsuranceFocus,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"«Insurance focus» promo block: navy card on a sky background. Two-column split on desktop (text / image), stacked on mobile. The CTA is required.",
			},
		},
	},
	args: {
		title: {
			children: "Je protège mes projets en toutes circonstances",
			as: "h2",
			visualStyle: "h2",
		},
		description:
			"En cas d'accident de la vie, soyez rassuré : votre assurance Sofinco⁽⁸⁾ prend le relais sur vos mensualités. Votre projet reste protégé pour vous laisser le temps de souffler.",
		imageSrc:
			"/images/samples/ProductPages/ProductCreditPage/InsuranceFocus/assurance-credit-renouvelable-desktop.webp",
		imageAlt: "",
		cta: {
			label: "Je découvre l'assurance",
			href: "/assurance",
			target: "_self",
			variant: "accent",
			ctaSection: "insurance-focus",
		},
	},
} satisfies Meta<typeof InsuranceFocus>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Nominal render — Figma mockup.
 * Play test: landmark named via aria-labelledby + H2 heading + clickable CTA.
 */
export const Default: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(
			canvas.getByRole("region", { name: "Je protège mes projets en toutes circonstances" }),
		).toBeInTheDocument();
		expect(
			canvas.getByRole("heading", { name: "Je protège mes projets en toutes circonstances" }),
		).toBeInTheDocument();
		expect(canvas.getByRole("link", { name: "Je découvre l'assurance" })).toHaveAttribute(
			"href",
			"/assurance",
		);
	},
};

/**
 * Long title stress test (3 lines on desktop) — check wrapping and the
 * split's vertical alignment.
 */
export const LongTitle: Story = {
	args: {
		title: {
			children:
				"Je protège mes projets en toutes circonstances, quelle que soit la situation, avec une couverture complète",
			as: "h2",
			visualStyle: "h2",
		},
	},
};

/**
 * Long description stress test (5+ lines) — check vertical breathing room
 * and the CTA's position (must not overflow the card).
 */
export const LongDescription: Story = {
	args: {
		description:
			"En cas d'accident de la vie, soyez rassuré : votre assurance Sofinco⁽⁸⁾ prend le relais sur vos mensualités. Votre projet reste protégé pour vous laisser le temps de souffler. Les garanties couvrent le décès, la perte totale et irréversible d'autonomie, l'incapacité temporaire de travail et la perte d'emploi selon les options souscrites. Souscription 100 % en ligne, sans questionnaire médical pour les montants inférieurs à 15 000 €.",
	},
};

/**
 * Degraded state — image removed after publishing (`imageSrc = ""`).
 * The component must stay readable: text content only, no `<img src="">`.
 */
export const WithoutImage: Story = {
	args: {
		imageSrc: "",
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// No image rendered
		expect(canvas.queryByRole("img")).not.toBeInTheDocument();
		// Text content + CTA remain present
		expect(
			canvas.getByRole("heading", { name: "Je protège mes projets en toutes circonstances" }),
		).toBeInTheDocument();
		expect(canvas.getByRole("link", { name: "Je découvre l'assurance" })).toBeInTheDocument();
	},
};

/**
 * Informative image (alt provided) — checks that the contributed `alt` is
 * correctly rendered to the DOM and exposed to screen readers as a named
 * `img` role. Complements the DS-side unit test for the mapping (integration).
 */
export const WithInformativeImage: Story = {
	args: {
		imageAlt: "Une bouée de sauvetage sur un pont de bateau",
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(
			canvas.getByRole("img", { name: "Une bouée de sauvetage sur un pont de bateau" }),
		).toBeInTheDocument();
	},
};
