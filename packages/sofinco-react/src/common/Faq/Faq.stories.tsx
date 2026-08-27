import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Faq } from "./Faq";

const meta: Meta<typeof Faq> = {
	title: "Common/Faq",
	component: Faq,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof Faq>;

const defaultArgs = {
	title: "Vos questions sur le crédit conso",
	subtitle: "Vous avez des questions sur nos produits ou solutions ? Nous avons les réponses !",
	imageUrl: "/images/samples/HomePage/Faq/image-faq-homepage-desktop.webp",
	imageAlt: "Une main tenant une carte bancaire Sofinco devant un ciel bleu",
	items: [
		{
			id: "1",
			question: "Quels types de prêts propose Sofinco ?",
			answer:
				"Sofinco propose une large gamme de crédits à la consommation : prêt personnel, crédit auto, crédit travaux, regroupement de crédits et réserve d'argent.",
		},
		{
			id: "2",
			question: "Quel délai entre l'acceptation de l'offre de prêt et le déblocage des fonds ?",
			answer:
				"Après la signature de l'offre de prêt, vous disposez d'un délai de rétractation de 14 jours calendaires après votre signature, pendant lequel vous pouvez revenir sur votre décision. Le délai de déblocage des fonds peut toutefois être réduit à 7 jours, auquel cas votre droit de rétractation s'exerce quand même jusqu'au 14ème jour.",
		},
		{
			id: "3",
			question: "Comment effectuer ma demande de crédit conso ?",
			answer:
				"Vous pouvez effectuer votre demande directement en ligne sur sofinco.fr, en agence ou via votre espace client. Le parcours digital ne prend que quelques minutes.",
		},
		{
			id: "4",
			question: "Quels documents dois-je fournir lors de ma demande de crédit ?",
			answer:
				"Une pièce d'identité en cours de validité, un justificatif de domicile de moins de 3 mois, vos derniers bulletins de salaire ainsi qu'un RIB.",
		},
		{
			id: "5",
			question: "Jusqu'à quel âge peut-on emprunter ?",
			answer:
				"Sofinco étudie chaque demande au cas par cas. L'âge limite dépend de la durée du prêt et du type de crédit souscrit.",
		},
	],
	link: {
		href: "#",
		label: "Consulter la FAQ",
	},
};

export const Default: Story = {
	args: defaultArgs,
};

export const WithoutImage: Story = {
	name: "Sans image",
	args: {
		...defaultArgs,
		imageUrl: "",
		imageAlt: "",
	},
};

export const ExternalSource: Story = {
	name: "Source externe (Smart Tribune)",
	args: {
		...defaultArgs,
		useExternalSource: true,
		integration: {
			jsUrl: "https://assets.app.smart-tribune.com/sofinco/FAQ/faq-refonte-2024.main.js",
			kbId: "198",
			thematicsFilter: "",
			tagsFilter: "",
			tagsOr: false,
			cookieOptin: true,
			searchFiltered: false,
			headerId: "",
			extraParams: [],
		},
	},
};

export const NotManyQuestion: Story = {
	name: "Avec deux questions",
	args: {
		...defaultArgs,
		items: defaultArgs.items.slice(0, 2),
	},
};

/**
 * Manual FAQ renders as native `<details>`/`<summary>` — the accordion toggles with
 * zero JavaScript state. This story drives the native disclosure: every item starts
 * closed, clicking a summary opens its `<details>` (and the browser closes it again on
 * a second click). Confirms the no-hydration, server-only behaviour.
 */
export const NativeDetails: Story = {
	name: "Accordéon natif (details/summary)",
	args: defaultArgs,
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);

		// Each item is a real <details> — closed on first paint, no JS required.
		const items = canvasElement.querySelectorAll<HTMLDetailsElement>("details");
		expect(items.length).toBe(defaultArgs.items.length);
		items.forEach((item) => expect(item.open).toBe(false));

		const firstSummary = items[0].querySelector("summary")!;

		await step("Clicking a summary opens the native <details>", async () => {
			await userEvent.click(firstSummary);
			expect(items[0].open).toBe(true);
			// Answer text is now revealed by the browser (not React state).
			expect(canvas.getByText(/large gamme de crédits/i)).toBeVisible();
		});

		await step("Clicking it again closes it", async () => {
			await userEvent.click(firstSummary);
			expect(items[0].open).toBe(false);
		});
	},
};
