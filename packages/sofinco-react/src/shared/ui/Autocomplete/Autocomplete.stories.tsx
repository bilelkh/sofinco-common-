import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { searchCityOptions } from "@shared/utils/searchCities";

/*
 * Le référentiel de production n'autorise que `https://www.sofinco.fr` et
 * `https://www.pro.sofinco.fr`, d'où le proxy (cf. `citiesProxy.js`) pour tout le reste.
 * Celui de recette (`rct-api-ref`) autorise en plus, et explicitement, `http://localhost:8080`
 * — le port sur lequel Storybook est fixé dans `package.json` (`storybook dev -p 8080`) —
 * et répond avec les en-têtes CORS attendus : l'appel se fait donc ici en direct.
 *
 * Ce point d'entrée reste couplé à ce port précis ; le changer côté Storybook ferait à
 * nouveau échouer l'appel en 403, comme pour toute autre origine non listée.
 */
const CITIES_ENDPOINT_DEV = "https://rct-api-ref.sofinco.fr/nomenclatures/v1/cities";

import Autocomplete from "./Autocomplete";
import type { AutocompleteOption } from "./Autocomplete.type";

/**
 * Source locale : les stories de démonstration ne doivent dépendre ni du réseau
 * ni d'un service tiers, sans quoi la documentation tombe avec lui. Le délai
 * simule une latence, sinon l'état d'attente ne serait jamais visible.
 */
const CATALOGUE: AutocompleteOption[] = [
	{ value: "pret-perso", label: "Prêt personnel", description: "De 3 000 € à 75 000 €" },
	{ value: "credit-renouvelable", label: "Crédit renouvelable", description: "Réserve d'argent" },
	{ value: "credit-auto", label: "Crédit auto", description: "Neuf ou occasion" },
	{ value: "credit-travaux", label: "Crédit travaux", description: "Rénovation, énergie" },
	{ value: "rachat-credits", label: "Rachat de crédits", description: "Regroupement" },
	{ value: "assurance-adi", label: "Assurance emprunteur", disabled: true },
];

const searchCatalogue = (query: string, signal: AbortSignal): Promise<AutocompleteOption[]> =>
	new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			const needle = query.toLowerCase();
			resolve(CATALOGUE.filter((option) => option.label.toLowerCase().includes(needle)));
		}, 400);

		signal.addEventListener("abort", () => {
			clearTimeout(timer);
			reject(new DOMException("Aborted", "AbortError"));
		});
	});

const meta = {
	title: "shared/ui/Autocomplete",
	component: Autocomplete,
	parameters: {
		layout: "centered",
	},
	args: {
		label: "Produit recherché",
		placeholder: "Commencez à taper…",
		onSearch: searchCatalogue,
	},
	argTypes: {
		label: { control: "text" },
		hint: { control: "text" },
		placeholder: { control: "text" },
		errorMessage: { control: "text" },
		minLength: { control: { type: "number", min: 0, max: 5 } },
		debounceMs: { control: { type: "number", min: 0, max: 2000, step: 50 } },
		required: { control: "boolean" },
		disabled: { control: "boolean" },
		clearable: { control: "boolean" },
		onValueChange: { action: "valueChange" },
	},
	decorators: [
		(Story) => (
			<div style={{ width: "22rem" }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Autocomplete>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Comportement de référence : une frappe, une recherche différée, un choix. */
export const Default: Story = {};

/** Aide sous le champ, et seuil de déclenchement relevé à trois caractères. */
export const WithHint: Story = {
	args: {
		hint: "Trois caractères au minimum.",
		minLength: 3,
	},
};

/** État d'erreur — l'aide cède la place au message, qui est annoncé. */
export const WithError: Story = {
	args: {
		errorMessage: "Choisissez un produit dans la liste.",
		required: true,
	},
};

/** Champ déjà renseigné : `defaultLabel` réaffiche le libellé de la valeur. */
export const Prefilled: Story = {
	args: {
		value: "credit-auto",
		defaultLabel: "Crédit auto",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		defaultLabel: "Crédit auto",
		value: "credit-auto",
	},
};

/** Source en panne : le panneau le dit plutôt que de rester vide. */
export const SearchUnavailable: Story = {
	args: {
		onSearch: async () => {
			throw new Error("Service indisponible");
		},
	},
};

/**
 * Le cas réel : le référentiel des communes Sofinco.
 *
 * Un code postal désigne jusqu'à quatorze communes — saisir « 62128 » le montre.
 * La valeur retenue est donc le code, et la commune choisie voyage dans `meta` :
 * c'est le couple des deux qui identifie le choix, jamais le code seul.
 *
 * Story branchée sur le service : sans accès réseau, elle affiche « recherche
 * indisponible ».
 */
export const Cities: Story = {
	args: {
		label: "Code postal",
		placeholder: "Code postal ou commune",
		hint: "Essayez « 62128 », « orleans » ou « saint-denis ».",
		minLength: 2,
		onSearch: (query, signal) =>
			searchCityOptions(query, { signal, endpoint: CITIES_ENDPOINT_DEV }),
	},
	render: (args) => {
		const [choice, setChoice] = useState<AutocompleteOption>();

		return (
			<div style={{ display: "grid", gap: "1rem" }}>
				<Autocomplete
					{...args}
					onValueChange={(_value, option) => setChoice(option)}
				/>
				<output style={{ font: "inherit", fontSize: "0.875rem" }}>
					{choice
						? `code postal : ${choice.meta?.code} — commune : ${choice.meta?.city}`
						: "Aucune commune retenue."}
				</output>
			</div>
		);
	},
};
