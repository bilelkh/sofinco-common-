import type { Meta, StoryObj } from "@storybook/react-vite";

import CardComparatorTable from "./CardComparatorTable";

const meta: Meta<typeof CardComparatorTable> = {
	title: "B2C/CardComparatorTable",
	component: CardComparatorTable,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		title: "Trouvez la carte faite pour vous",
		subtitle:
			"Trois niveaux, les mêmes fondamentaux : débit différé, réserve de crédit flexible, tout géré depuis l'app.",
		items: [
			{
				id: "origin",
				image:
					"/images/samples/ProductPages/ProductCardPage/CardComparatorTable/carte-pure-sofinco.svg",
				title: "Origin",
				description: "L'essentiel, sans superflu. 100% digitale, sans conditions.",
				features: [
					{ id: "origin-digital", label: "Carte digitale uniquement", included: true },
					{ id: "origin-reserve", label: "Réserve jusqu'à 6K€", included: true },
					{ id: "origin-ceiling", label: "Plafond de paiement de 5k€ par mois", included: true },
					{ id: "origin-withdrawals", label: "Pas de retraits à l'étranger", included: false },
					{
						id: "origin-warranties",
						label: "Garanties achats et voyage non incluses",
						included: false,
					},
				],
				cta: { label: "Obtenir la carte Origin", href: "#" },
			},
			{
				id: "pure",
				image:
					"/images/samples/ProductPages/ProductCardPage/CardComparatorTable/carte-pure-sofinco.svg",
				title: "Pure",
				description: "La carte du quotidien, avec carte physique et garanties complètes.",
				features: [
					{ id: "pure-physical", label: "Carte physique en PVC", included: true },
					{ id: "pure-reserve", label: "Réserve jusqu'à 6K€", included: true },
					{ id: "pure-ceiling", label: "Plafond de paiement de 5k€ par mois", included: true },
					{ id: "pure-withdrawals", label: "3 retraits à l'étranger par mois", included: true },
					{ id: "pure-warranties", label: "Garanties achats et voyage incluses", included: true },
				],
				cta: { label: "Obtenir la carte Pure", href: "#" },
			},
			{
				id: "premium",
				image:
					"/images/samples/ProductPages/ProductCardPage/CardComparatorTable/carte-pure-sofinco.svg",
				title: "Premium",
				description: "La carte pour les dépenses importantes et les voyageurs réguliers.",
				features: [
					{ id: "premium-physical", label: "Carte physique en métal", included: true },
					{ id: "premium-reserve", label: "Réserve jusqu'à 20K€", included: true },
					{ id: "premium-ceiling", label: "Plafond de paiement de 15k€ par mois", included: true },
					{
						id: "premium-withdrawals",
						label: "Retraits à l'étranger illimités",
						included: true,
					},
					{
						id: "premium-warranties",
						label: "Garanties achats et voyage incluses",
						included: true,
					},
				],
				cta: { label: "Obtenir la carte Premium", href: "#" },
				badgeLabel: "Nouveauté",
			},
		],
	},
};

export const TwoCard: Story = {
	name: "Cas 2 Cartes",
	args: {
		title: "Trouvez la carte faite pour vous",
		subtitle:
			"Trois niveaux, les mêmes fondamentaux : débit différé, réserve de crédit flexible, tout géré depuis l'app.",
		items: [
			{
				id: "pure",
				image:
					"/images/samples/ProductPages/ProductCardPage/CardComparatorTable/carte-pure-sofinco.svg",
				title: "Pure",
				description: "La carte du quotidien, avec carte physique et garanties complètes.",
				features: [
					{ id: "pure-physical", label: "Carte physique en PVC", included: true },
					{ id: "pure-reserve", label: "Réserve jusqu'à 6K€", included: true },
					{ id: "pure-ceiling", label: "Plafond de paiement de 5k€ par mois", included: true },
					{ id: "pure-withdrawals", label: "3 retraits à l'étranger par mois", included: true },
					{ id: "pure-warranties", label: "Garanties achats et voyage incluses", included: true },
				],
				cta: { label: "Obtenir la carte Pure", href: "#" },
			},
			{
				id: "premium",
				image:
					"/images/samples/ProductPages/ProductCardPage/CardComparatorTable/carte-pure-sofinco.svg",
				title: "Premium",
				description: "La carte pour les dépenses importantes et les voyageurs réguliers.",
				features: [
					{ id: "premium-physical", label: "Carte physique en métal", included: true },
					{ id: "premium-reserve", label: "Réserve jusqu'à 20K€", included: true },
					{ id: "premium-ceiling", label: "Plafond de paiement de 15k€ par mois", included: true },
					{
						id: "premium-withdrawals",
						label: "Retraits à l'étranger illimités",
						included: true,
					},
					{
						id: "premium-warranties",
						label: "Garanties achats et voyage incluses",
						included: true,
					},
				],
				cta: { label: "Obtenir la carte Premium", href: "#" },
				badgeLabel: "Nouveauté",
			},
		],
	},
};
