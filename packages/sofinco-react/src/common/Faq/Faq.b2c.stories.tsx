import type { Meta, StoryObj } from "@storybook/react-vite";
import { Faq } from "./Faq";
import { Default } from "./Faq.stories";

const meta: Meta<typeof Faq> = {
	title: "Common/Faq/B2C",
	component: Faq,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof Faq>;

export const CarteBancaire: Story = {
	name: "Carte bancaire (page produit)",
	args: {
		...Default.args,
		title: "Une question sur notre carte ?",
		imageUrl: "/images/samples/ProductPages/ProductCardPage/Faq/faq-carte-bancaire-desktop.webp",
		imageAlt: "Une femme souriante prenant une photo avec son téléphone",
		link: {
			href: "#",
			label: "Consulter la FAQ",
		},
	},
};

export const CreditRenouvelable: Story = {
	name: "Crédit renouvelable (page produit)",
	args: {
		title: "Une question sur le Crédit Renouvelable ?",
		subtitle: "Vous avez des questions sur nos produits ou solutions ? Nous avons les réponses !",
		imageUrl:
			"/images/samples/ProductPages/ProductCreditPage/Faq/faq-credit-renouvelable-desktop.webp",
		imageAlt: "Une personne consultant son crédit renouvelable depuis son téléphone",
		items: [
			{
				id: "1",
				question: "Qu'est-ce qu'un crédit renouvelable ?",
				answer:
					"Le crédit renouvelable est une réserve d'argent disponible à tout moment, que vous utilisez selon vos besoins et remboursez à votre rythme.",
			},
			{
				id: "2",
				question: "Comment fonctionne le crédit renouvelable associé à la carte Sofinco ?",
				answer:
					"Le crédit renouvelable Sofinco met à votre disposition une somme d'argent de 1 501 € à 10 000 €, utilisable en totalité ou en partie selon vos besoins et votre rythme d'utilisation. Au fur et à mesure de vos remboursements, le montant disponible se reconstitue automatiquement. Associé à la carte Sofinco, il vous permet de régler vos achats en magasin ou en ligne, au comptant différé ou en plusieurs fois, et d'effectuer des virements sur votre compte bancaire en 48h.",
			},
			{
				id: "3",
				question: "Quel est le taux d'un crédit renouvelable ?",
				answer:
					"Le taux (TAEG) du crédit renouvelable est révisable, défini par tranches d'encours selon le montant utilisé.",
			},
			{
				id: "4",
				question: "Quel montant peut-on obtenir avec un crédit renouvelable ?",
				answer: "Le crédit renouvelable Sofinco va de 1 501 € à 10 000 €.",
			},
			{
				id: "5",
				question: "Y a-t-il un délai de rétractation ?",
				answer:
					"Oui, vous disposez d'un délai de rétractation de 14 jours calendaires après la signature de votre contrat.",
			},
		],
	},
};

export const PretPerso: Story = {
	name: "Prêt personnel (page produit)",
	args: {
		title: "Une question sur le Prêt Personnel ?",
		subtitle: "Vous avez des questions sur nos produits ou solutions ? Nous avons les réponses !",
		imageUrl: "/images/samples/ProductPages/ProductLoanPage/Faq/FAQ-pret-perso-desktop.webp",
		imageAlt: "Une personne consultant son prêt personnel depuis son téléphone",
		items: [
			{
				id: "1",
				question: "Qu'est-ce qu'un prêt perso ?",
				answer:
					"Le prêt personnel est un crédit à la consommation non affecté : vous empruntez une somme fixe, remboursée par mensualités constantes, sans avoir à justifier l'utilisation des fonds.",
			},
			{
				id: "2",
				question: "Quel est le taux d'un prêt personnel ?",
				answer:
					"Le TAEG fixe dépend du montant emprunté et de la durée choisie. Avec Sofinco, il est compris entre 4,000 % et 15,700 %, et reste fixe pendant toute la durée du prêt, sans mauvaise surprise.",
			},
			{
				id: "3",
				question: "Combien peut-on emprunter et sur quelle durée ?",
				answer:
					"Avec le prêt personnel Sofinco, vous pouvez emprunter de 3 001 € à 75 000 €, remboursables sur une durée de 12 à 120 mois selon votre projet et votre capacité de remboursement.",
			},
			{
				id: "4",
				question: "Combien de temps pour obtenir les fonds ?",
				answer:
					"Après signature électronique de votre contrat et à l'issue du délai légal de rétractation, les fonds sont débloqués en une seule fois sur votre compte bancaire.",
			},
			{
				id: "5",
				question: "Quels documents dois-je fournir lors de ma demande de crédit ?",
				answer:
					"Une pièce d'identité en cours de validité, un justificatif de domicile de moins de 3 mois, vos derniers bulletins de salaire ainsi qu'un RIB.",
			},
		],
		link: {
			href: "#",
			label: "Consulter la FAQ",
		},
	},
};
