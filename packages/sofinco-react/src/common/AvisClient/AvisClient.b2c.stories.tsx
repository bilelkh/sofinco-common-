import type { Meta, StoryObj } from "@storybook/react-vite";
import AvisClient from "@common/AvisClient/AvisClient";
import { Default } from "./AvisClient.stories";

const meta: Meta<typeof AvisClient> = {
	title: "Common/AvisClient/B2C",
	component: AvisClient,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof AvisClient>;

export const CarteBancaire: Story = {
	name: "Carte bancaire (page produit)",
	args: {
		...Default.args,
		title: "Rejoignez plus de 6 000 000 de clients Sofinco",
		subtitle:
			"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc pellentesque magna ut erat vehicula, nec euismod nisl lacinia.",
	},
};

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
	args: {
		...Default.args,
		title: "Ils ont choisi le Crédit Renouvelable Sofinco",
		subtitle: "Plus de 6 millions de clients nous font confiance",
	},
};

export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: {
		...Default.args,
		title: "Rejoignez les 6 millions de clients qui ont fait confiance à Sofinco",
		subtitle: "Ce que pensent nos clients du Prêt Personnel Sofinco",
	},
};
