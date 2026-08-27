/*
 * Règles de validation de `MultiStepForm`.
 *
 * Ces fonctions sont pures et servent deux appelants aux contraintes opposées
 * (validateurs TanStack d'un champ monté, contrôle final sur des étapes
 * démontées) : c'est la seule couche du composant où une régression est
 * silencieuse — un formulaire qui laisse passer une valeur invalide a l'air de
 * fonctionner.
 */
import { describe, expect, it } from "vitest";

import { buildDefaultValues, buildFieldValidator, findFirstInvalidField } from "./validation";
import type { FormFieldConfig, FormStepConfig } from "./MultiStepForm.type";

const field = (config: Partial<FormFieldConfig> = {}): FormFieldConfig =>
	({ name: "champ", label: "Champ", ...config }) as FormFieldConfig;

const validate = (config: Partial<FormFieldConfig>, value: string | undefined, values = {}) =>
	buildFieldValidator(field(config))(value, values);

describe("règle required", () => {
	it("refuse une valeur vide", () => {
		expect(validate({ required: true }, "")).toBe("Ce champ est obligatoire.");
	});

	it("refuse une valeur faite d'espaces", () => {
		expect(validate({ required: true }, "   ")).toBe("Ce champ est obligatoire.");
	});

	it("refuse une valeur absente", () => {
		expect(validate({ required: true }, undefined)).toBe("Ce champ est obligatoire.");
	});

	it("accepte une valeur renseignée", () => {
		expect(validate({ required: true }, "Leroy Merlin")).toBeUndefined();
	});

	it("se déclenche aussi depuis validation.required", () => {
		expect(validate({ validation: { required: true } }, "")).toBe("Ce champ est obligatoire.");
	});
});

describe("champ désactivé", () => {
	/*
	 * Sans cette exemption, un champ `disabled` + `required` laissé vide bloquerait
	 * l'étape définitivement : rien ne permet à l'utilisateur de le corriger.
	 */
	it("n'est jamais validé, même obligatoire et vide", () => {
		expect(validate({ disabled: true, required: true }, "")).toBeUndefined();
	});

	it("ignore aussi ses règles de format", () => {
		expect(validate({ disabled: true, validation: { email: true } }, "cassé")).toBeUndefined();
	});

	it("reste validé tant qu'il est actif", () => {
		expect(validate({ disabled: false, required: true }, "")).toBe("Ce champ est obligatoire.");
	});
});

describe("champ facultatif vide", () => {
	/*
	 * Le cas qui casse le plus souvent : sans court-circuit, un `minLength` posé
	 * sur un champ qu'on a le droit de ne pas remplir le rendrait obligatoire.
	 */
	it("saute les règles de format", () => {
		expect(validate({ validation: { minLength: 5, email: true } }, "")).toBeUndefined();
	});

	it("passe malgré tout par la règle libre", () => {
		const message = validate(
			{ validation: { validate: () => "Renseignez au moins un contact." } },
			"",
		);

		expect(message).toBe("Renseignez au moins un contact.");
	});
});

describe("règles de format", () => {
	it("refuse un e-mail sans domaine", () => {
		expect(validate({ validation: { email: true } }, "jean@")).toBe(
			"Saisissez une adresse e-mail valide.",
		);
	});

	it("accepte un e-mail valide", () => {
		expect(validate({ validation: { email: true } }, "jean@exemple.fr")).toBeUndefined();
	});

	it("applique une expression régulière fournie en chaîne", () => {
		expect(validate({ validation: { pattern: "^\\d{14}$" } }, "123")).toBe(
			"Le format saisi n'est pas valide.",
		);
		expect(validate({ validation: { pattern: "^\\d{14}$" } }, "32476789990963")).toBeUndefined();
	});

	/*
	 * Une regex `/g` conserve son `lastIndex` d'un appel à l'autre : sans remise à
	 * zéro, la même valeur serait acceptée puis refusée en alternance.
	 */
	it("reste stable sur une regex globale rejouée", () => {
		const pattern = /^\d{5}$/g;

		expect(validate({ validation: { pattern } }, "59800")).toBeUndefined();
		expect(validate({ validation: { pattern } }, "59800")).toBeUndefined();
	});

	it("interpole la borne dans le message de longueur", () => {
		expect(validate({ validation: { minLength: 14 } }, "1234")).toBe(
			"Saisissez au moins 14 caractères.",
		);
	});

	it("compare les bornes numériques sur la valeur convertie", () => {
		expect(validate({ validation: { min: 1000 } }, "500")).toBe(
			"Saisissez une valeur supérieure ou égale à 1000.",
		);
		expect(validate({ validation: { max: 10 } }, "42")).toBe(
			"Saisissez une valeur inférieure ou égale à 10.",
		);
		expect(validate({ validation: { min: 0, max: 100 } }, "50")).toBeUndefined();
	});

	it("ignore les bornes numériques sur une saisie non numérique", () => {
		expect(validate({ validation: { min: 10 } }, "abc")).toBeUndefined();
	});
});

describe("messages personnalisés", () => {
	it("remplace le message par défaut de la règle visée", () => {
		const message = validate(
			{ required: true, errorMessages: { required: "Le SIRET est nécessaire." } },
			"",
		);

		expect(message).toBe("Le SIRET est nécessaire.");
	});

	it("laisse les autres règles sur leur message par défaut", () => {
		const message = validate(
			{ validation: { email: true }, errorMessages: { required: "Obligatoire." } },
			"jean@",
		);

		expect(message).toBe("Saisissez une adresse e-mail valide.");
	});
});

describe("règle libre", () => {
	it("reçoit toutes les valeurs du formulaire", () => {
		const message = validate(
			{
				validation: {
					validate: (value, values) =>
						value === values.confirmation ? undefined : "Les deux valeurs diffèrent.",
				},
			},
			"abc",
			{ confirmation: "xyz" },
		);

		expect(message).toBe("Les deux valeurs diffèrent.");
	});

	it("est évaluée après les règles de format", () => {
		const message = validate(
			{ validation: { email: true, validate: () => "Domaine non autorisé." } },
			"jean@",
		);

		expect(message).toBe("Saisissez une adresse e-mail valide.");
	});
});

describe("buildDefaultValues", () => {
	const steps: FormStepConfig[] = [
		{ fields: [field({ name: "siret", value: "324" })] },
		{ fields: [field({ name: "email" })] },
	];

	it("déclare une valeur pour tous les champs, étapes non rendues comprises", () => {
		expect(buildDefaultValues(steps)).toEqual({ siret: "324", email: "" });
	});

	/*
	 * Les clés annexes d'un champ `autocomplete` ne sont écrites qu'au choix
	 * d'une option. Sans amorçage, un parcours où l'utilisateur ne touche pas au
	 * champ posterait un objet amputé de ces clés — la forme variable
	 * que `buildDefaultValues` existe justement pour empêcher.
	 */
	const withFills: FormStepConfig[] = [
		{
			fields: [
				{
					name: "codePostal",
					type: "autocomplete",
					label: "Code postal",
					onSearch: async () => [],
					fills: (option) => ({ ville: option.meta?.city ?? "" }),
				},
			],
		},
	];

	it("amorce aussi les clés annexes d'un champ autocomplete", () => {
		expect(buildDefaultValues(withFills)).toEqual({ codePostal: "", ville: "" });
	});

	/*
	 * Une clé annexe part TOUJOURS vide : elle n'a pas de champ à elle, donc pas
	 * d'attribut `value`, et le formulaire n'accepte plus de valeurs initiales
	 * globales. Elle ne se remplit qu'au choix d'une option, par `fills`.
	 */
	it("laisse la clé annexe vide même quand le champ porteur est amorcé", () => {
		const amorce: FormStepConfig[] = [
			{
				fields: [
					{
						name: "codePostal",
						type: "autocomplete",
						label: "Code postal",
						value: "59800",
						onSearch: async () => [],
						fills: (option) => ({ ville: option.meta?.city ?? "" }),
					},
				],
			},
		];

		expect(buildDefaultValues(amorce)).toEqual({ codePostal: "59800", ville: "" });
	});
});

describe("findFirstInvalidField", () => {
	const steps: FormStepConfig[] = [
		{ fields: [field({ name: "siret", required: true })] },
		{ fields: [field({ name: "email", validation: { email: true } })] },
	];

	it("ne remonte rien quand tout est valide", () => {
		expect(findFirstInvalidField(steps, { siret: "324", email: "a@b.fr" })).toBeUndefined();
	});

	it("désigne l'étape du premier champ fautif", () => {
		const invalid = findFirstInvalidField(steps, { siret: "324", email: "cassé" });

		expect(invalid?.stepIndex).toBe(1);
		expect(invalid?.field.name).toBe("email");
	});

	it("s'arrête au premier fautif dans l'ordre des étapes", () => {
		const invalid = findFirstInvalidField(steps, { siret: "", email: "cassé" });

		expect(invalid?.stepIndex).toBe(0);
		expect(invalid?.field.name).toBe("siret");
	});
});
