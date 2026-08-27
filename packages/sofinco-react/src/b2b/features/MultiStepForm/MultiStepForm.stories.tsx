import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";

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


import MultiStepForm from "./MultiStepForm";
import type { FormStepConfig } from "./MultiStepForm.type";

const SECTEURS = [
	{ value: "bricolage", label: "Bricolage" },
	{ value: "ameublement", label: "Ameublement" },
	{ value: "automobile", label: "Automobile" },
	{ value: "energie", label: "Énergies & rénovation" },
	{ value: "sport", label: "Sport & loisirs" },
];

/**
 * Parcours de référence : trois étapes qui couvrent les trois contrôles du DS
 * (`TextField`, `Select`, `Textarea`) et l'essentiel des règles de validation.
 */
const STEPS: FormStepConfig[] = [
	{
		id: "entreprise",
		label: "Votre entreprise",
		title: "Votre entreprise",
		description:
			"Remplissez l’information",
		fields: [
			{
				name: "siret",
				label: "Siret",
				value: "32476789990963",
				clearable: true,
				inputMode: "numeric",
				// Affiché `324 767 899 90963` ; la valeur soumise reste `32476789990963`,
				// ce que la règle `pattern` ci-dessous continue de contrôler.
				mask: "siret",
				required: true,
				validation: { pattern: /^\d{14}$/ },
				errorMessages: { pattern: "Le Siret comporte 14 chiffres." },
			},
			{ name: "raisonSociale", label: "Raison sociale", value: "Leroy Merlin", clearable: true, required: true },
			{
				name: "codePostal",
				type: "autocomplete",
				label: "Code postal",
				placeholder: "Code postal ou commune",
				value: "59800",
				required: true,
				// Deux caractères : à un seul, le référentiel rend vingt communes prises
				// dans toute la France, ce qui n'aide personne.
				minLength: 2,
				onSearch: (query, signal) => searchCityOptions(query, { signal, endpoint: CITIES_ENDPOINT_DEV }),
				/*
				 * Un code postal désigne jusqu'à quatorze communes : la commune retenue est
				 * rangée à côté du code, sans quoi le choix serait perdu à la soumission.
				 */
				fills: (option) => ({ ville: option.meta?.city ?? "" }),
				display: (values) =>
					values.codePostal && values.ville ? `${values.ville} (${values.codePostal})` : "",
				validation: { pattern: /^\d{5}$/ },
				errorMessages: {
					required: "Choisissez une commune dans la liste.",
					pattern: "Choisissez une commune dans la liste.",
				},
			},
			{
				name: "secteur",
				type: "select",
				label: "Secteur d'activité",
				placeholder: "Choisissez un secteur",
				value: "bricolage",
				options: SECTEURS,
				required: true,
			},
		],
	},
	{
		id: "contact",
		label: "Votre contact",
		title: "Votre contact",
		description: "Nous revenons vers vous sous 48 heures ouvrées.",
		fields: [
			{ name: "prenom", label: "Prénom", required: true },
			{ name: "nom", label: "Nom",  required: true },
			{
				name: "email",
				type: "email",
				label: "E-mail professionnel",
				placeholder: "prenom.nom@entreprise.fr",
				autoComplete: "email",
				required: true,
				validation: { email: true },
			},
			{
				name: "telephone",
				type: "tel",
				label: "Téléphone",
				hint: "10 chiffres.",
				autoComplete: "tel",
				inputMode: "tel",
				// Affiché deux par deux (`06 12 34 56 78`) ; la valeur soumise reste
				// `0612345678`.
				mask: "phone",
				required: true,
				validation: { pattern: /^0\d{9}$/ },
				errorMessages: { pattern: "Saisissez un numéro à 10 chiffres commençant par 0." },
			},
		],
	},
	{
		id: "projet",
		label: "Votre projet",
		title: "Votre projet",
		description: "Quelques mots sur vos besoins nous aident à préparer l'échange.",
		fields: [
			{
				name: "typeFinancement",
				type: "select",
				label: "Type de financement recherché",
				placeholder: "Choisissez une option",
				required: true,
				options: [
					{ value: "3x4x", label: "Paiement en 3x / 4x" },
					{ value: "credit", label: "Crédit affecté" },
					{ value: "reserve", label: "Réserve d'argent" },
				],
			},
			{
				name: "message",
				type: "textarea",
				label: "Votre message",
				placeholder: "Décrivez votre activité et vos volumes annuels.",
				rows: 5,
				maxLength: 500,
				showCounter: true,
				validation: { minLength: 20 },
				errorMessages: { minLength: "Décrivez votre besoin en 20 caractères minimum." },
			},
		],
	},
];

const meta = {
	title: "b2b/features/MultiStepForm",
	component: MultiStepForm,
	parameters: {
		layout: "padded",
	},
	args: {
		steps: STEPS,
		// `ville` accompagne le code postal pré-rempli : `display` en refait le
		// libellé affiché, « LILLE (59800) ».
		defaultValues: { ville: "LILLE" },
		settings: {
			salesforceUrl:
				"https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId=00DJ9000000Qej3",
			successUrl: "/contact/confirmation",
		},
		ariaLabel: "Devenir partenaire Sofinco",
		onSubmit: action("submit"),
	},
	argTypes: {
		steps: { control: "object" },
		labels: { control: "object" },
		settings: { control: "object" },
		stepper: { control: "object" },
		isSubmitting: { control: "boolean" },
		submitError: { control: "text" },
		ariaLabel: { control: "text" },
		className: { control: "text" },
		onSubmit: { action: "submit" },
		onStepChange: { action: "stepChange" },
		onFirstStepBack: { action: "firstStepBack" },
	},
	decorators: [
		(Story) => (
			<div style={{ display: "flex", justifyContent: "center" }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof MultiStepForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Parcours complet, tel que la maquette le pose sur la page « Devenir partenaire ». */
export const Default: Story = {};

/**
 * Bouton retour dès la première étape : `onFirstStepBack` donne au parent Jahia
 * la main sur la sortie (retour à la page précédente, fermeture d'une modale…).
 */
export const WithFirstStepBack: Story = {
	args: {
		onFirstStepBack: () => {},
	},
};

/** Étape unique : le bouton principal porte directement le libellé de soumission. */
export const SingleStep: Story = {
	args: {
		steps: [STEPS[0]],
	},
};

/** Variante `number` du Stepper — le libellé de l'étape courante est affiché. */
export const NumberStepper: Story = {
	args: {
		stepper: { variant: "number" },
	},
};

/** Sans indicateur : parcours court, ou progression rendue ailleurs dans la page. */
export const WithoutStepper: Story = {
	args: {
		stepper: { show: false },
	},
};

/** Attente pilotée par le parent pendant l'appel réseau côté Jahia. */
export const Submitting: Story = {
	args: {
		isSubmitting: true,
	},
};

/** Échec côté serveur : le parent remonte le message, la saisie reste intacte. */
export const WithSubmitError: Story = {
	args: {
		submitError: "Le service est momentanément indisponible. Réessayez dans quelques instants.",
	},
};

/** Libellés de boutons redéfinis — parcours de rappel téléphonique, par exemple. */
export const CustomLabels: Story = {
	args: {
		labels: { next: "Étape suivante", submit: "Envoyer ma demande", previous: "Revenir en arrière" },
	},
};
