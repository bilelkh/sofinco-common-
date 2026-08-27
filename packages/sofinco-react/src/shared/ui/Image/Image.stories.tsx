import type { Meta, StoryObj } from "@storybook/react-vite";
import Image from "./Image";

const SAMPLE =
	"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80";
const SAMPLE_PORTRAIT =
	"https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80";

const meta = {
	title: "shared/ui/Image",
	component: Image,
	args: {
		src: SAMPLE,
		alt: "Paysage de montagne au coucher du soleil",
		width: 600,
		height: 400,
	},
	argTypes: {
		loading: { control: "select", options: ["lazy", "eager"] },
		decoding: { control: "select", options: ["async", "sync", "auto"] },
		fetchPriority: { control: "select", options: ["high", "low", "auto"] },
		decorative: { control: "boolean" },
		src: { control: "text" },
		alt: { control: "text" },
	},
	parameters: {
		docs: {
			description: {
				component:
					'Single entry point for content images. Renders a semantic `<img>` (or `<picture>` when `sources` are given) with `loading="lazy"` / `decoding="async"` defaults. Owns no visual CSS — the consumer\'s `className` is forwarded verbatim.',
			},
		},
	},
} satisfies Meta<typeof Image>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Default: lazy-loaded, async-decoded content image with alt text. */
export const Default: Story = {};

/** Purely decorative image — `decorative` forces `alt=""` + `aria-hidden` (no `alt` prop allowed). */
export const Decorative: Story = {
	args: {
		decorative: true,
	},
};

/**
 * Above-the-fold / LCP image — opt out of lazy-loading and hint the browser to
 * prioritize the fetch (as `HeroImg` / `HeroPPOfferCard` do).
 */
export const AboveTheFold: Story = {
	args: {
		loading: "eager",
		fetchPriority: "high",
	},
};

/**
 * Art-directed responsive image via `sources` — renders a `<picture>` that swaps
 * a portrait crop on narrow viewports. Resize the preview to see the switch.
 */
export const ArtDirected: Story = {
	args: {
		src: SAMPLE,
		alt: "Paysage adapté à la taille de l'écran",
		sources: [{ media: "(max-width: 600px)", srcSet: SAMPLE_PORTRAIT }],
	},
	parameters: {
		docs: {
			description: {
				story:
					"Pass `sources` to wrap the `<img>` in a `<picture>`. Pure markup (no JS selection) so it is SSR/hydration-safe. Generalizes the hand-rolled `<picture>` in `ProductAdvantageSlide` / `SolutionComplementary`.",
			},
		},
	},
};
