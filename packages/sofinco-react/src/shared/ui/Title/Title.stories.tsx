import type { Meta, StoryObj } from "@storybook/react-vite";

import Title from "./Title";

const meta = {
	title: "Shared/UI/Title",
	component: Title,
	args: {
		children: "Hello World",
		as: "h1",
	},
	argTypes: {
		// Le vocabulaire COMPLET de `TitleTag`, pas seulement les quatre échelles stylées.
		// Tronquer cette liste à h1–h4 rendait `h5`/`h6`/`p`/`span`/`div` inatteignables
		// depuis Storybook — donc les replis de `resolveVisualClass` invisibles à la revue.
		as: {
			control: "select",
			options: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "div"],
		},
		visualStyle: {
			control: "select",
			options: ["h1", "h2", "h3", "h4", "h5", "h6", "none"],
		},
		variant: {
			control: "inline-radio",
			options: ["dark", "white"],
		},
	},
} satisfies Meta<typeof Title>;

export default meta;

type Story = StoryObj<typeof meta>;

export const H1: Story = {
	args: {
		as: "h1",
	},
};

export const H2: Story = {
	args: {
		as: "h2",
	},
};

export const H3: Story = {
	args: {
		as: "h3",
	},
};

export const H4: Story = {
	args: {
		as: "h4",
	},
};

export const H2WithH3Style: Story = {
	name: "H2 with H3 style",
	args: {
		as: "h2",
		visualStyle: "h3",
		children: "Semantic H2 with H3 appearance",
	},
};

export const H2WithH4Style: Story = {
	name: "H2 with H4 style",
	args: {
		as: "h2",
		visualStyle: "h4",
		children: "Semantic H2 with H4 appearance",
	},
};

export const H3WithH2Style: Story = {
	name: "H3 with H2 style",
	args: {
		as: "h3",
		visualStyle: "h2",
		children: "Semantic H3 with H2 appearance",
	},
};

export const NoVisualStyle: Story = {
	name: "No visual style (none)",
	args: {
		as: "h1",
		visualStyle: "none",
		children: "Semantic H1 without heading visual styles",
	},
};

/*
 * LES TROIS REPLIS DE `resolveVisualClass`.
 *
 * Ce sont les branches ouvertes par l'élargissement de `TitleTag` à h5/h6/p/span/div.
 * Aucune n'était atteignable par une story tant que `argTypes.as.options` s'arrêtait à h4 :
 * un `styles["title--h5"]` inexistant rendait le titre SANS aucune typographie, en silence.
 */

export const H5FallsBackToH4Scale: Story = {
	name: "H5 → échelle h4 (plus petite disponible)",
	args: {
		as: "h5",
		children: "Titre h5 : le DS n'expose pas d'échelle h5, on rend la plus petite (h4)",
	},
};

export const H6FallsBackToH4Scale: Story = {
	name: "H6 → échelle h4 (plus petite disponible)",
	args: {
		as: "h6",
		children: "Titre h6 : même repli que h5",
	},
};

export const ParagraphNoHeadingTypography: Story = {
	name: "P → aucune typographie de titre",
	args: {
		as: "p",
		children: "« Normal » : ressemble à un titre pour le contributeur, n'en est pas un",
	},
};

export const SpanWithExplicitStyle: Story = {
	name: "Span avec apparence h3 explicite",
	args: {
		as: "span",
		visualStyle: "h3",
		children: "Balise non titrante (imbrication interdite) mais apparence h3 demandée",
	},
};

export const Dark: Story = {
	args: {
		as: "h2",
		variant: "dark",
		children: "Titre dark (navy)",
	},
};

export const White: Story = {
	args: {
		as: "h2",
		variant: "white",
		children: "Titre blanc sur fond coloré",
	},
	parameters: {
		backgrounds: { default: "dark" },
	},
};
