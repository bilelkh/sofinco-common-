import type { Meta, StoryObj } from "@storybook/react-vite";
import SeoMesh from "./SeoMesh";
import { creditBlock } from "./SeoMesh.samples";

const meta: Meta<typeof SeoMesh> = {
	title: "Common/SeoMesh/SeoMesh/B2C",
	component: SeoMesh,
	parameters: {},
};

export default meta;

type Story = StoryObj<typeof SeoMesh>;

const productLinkSections = {
	linkSectionLeft: creditBlock.linkSectionLeft,
	linkSectionRight: creditBlock.linkSectionRight,
};

const besoinCreditRenouvelableBlock = {
	id: "besoin-credit-renouvelable",
	title: "Besoin d'un crédit renouvelable ?",
	ctaProps: {
		href: "/credit-renouvelable",
		label: "Je souscris à un crédit renouvelable",
		type: "button" as const,
		variant: "accent" as const,
		size: "small" as const,
		iconRight: "arrow-right" as const,
	},
	...productLinkSections,
};

const creditRenouvelableADeZBlock = {
	id: "credit-renouvelable-a-a-z",
	title: "Le crédit renouvelable de A à Z",
	ctaProps: {
		href: "/credit-renouvelable",
		label: "Je souscris à un crédit renouvelable",
		type: "button" as const,
		variant: "accent" as const,
		size: "small" as const,
		iconRight: "arrow-right" as const,
	},
	...productLinkSections,
};

const besoinPretPersoBlock = {
	id: "besoin-pret-personnel",
	title: "Besoin d'un prêt personnel ?",
	ctaProps: {
		href: "/pret-personnel",
		label: "Je souscris à un prêt personnel",
		type: "button" as const,
		variant: "accent" as const,
		size: "small" as const,
		iconRight: "arrow-right" as const,
	},
	...productLinkSections,
};

const pretPersoADeZBlock = {
	id: "pret-personnel-a-a-z",
	title: "Le prêt personnel de A à Z",
	ctaProps: {
		href: "/pret-personnel",
		label: "Je souscris à un prêt personnel",
		type: "button" as const,
		variant: "accent" as const,
		size: "small" as const,
		iconRight: "arrow-right" as const,
	},
	...productLinkSections,
};

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
	args: {
		blocks: [besoinCreditRenouvelableBlock, creditRenouvelableADeZBlock],
	},
};

export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: {
		blocks: [besoinPretPersoBlock, pretPersoADeZBlock],
	},
};
