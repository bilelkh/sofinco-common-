import type {
	FormFieldConfig,
	FormStepConfig,
	MultiStepFormValues,
	ValidationRuleKey,
} from "./MultiStepForm.type";

/**
 * Contrôle e-mail volontairement permissif : « un arobase, un point après ».
 * Une regex exhaustive (RFC 5322) rejette des adresses valides et n'empêche
 * pas les fautes de frappe — seul un envoi réel les détecte. Le serveur reste
 * l'autorité, ce contrôle n'est qu'un garde-fou de saisie.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Messages par défaut. Copie utilisateur en français, comme partout dans le DS. */
const DEFAULT_MESSAGES: Record<ValidationRuleKey, (limit?: number) => string> = {
	required: () => "Ce champ est obligatoire.",
	email: () => "Saisissez une adresse e-mail valide.",
	pattern: () => "Le format saisi n'est pas valide.",
	minLength: (limit) => `Saisissez au moins ${limit} caractères.`,
	maxLength: (limit) => `Saisissez au plus ${limit} caractères.`,
	min: (limit) => `Saisissez une valeur supérieure ou égale à ${limit}.`,
	max: (limit) => `Saisissez une valeur inférieure ou égale à ${limit}.`,
	validate: () => "La valeur saisie n'est pas valide.",
};

const message = (field: FormFieldConfig, rule: ValidationRuleKey, limit?: number): string =>
	field.errorMessages?.[rule] ?? DEFAULT_MESSAGES[rule](limit);

/**
 * Construit le validateur d'un champ : une fonction pure `(valeur, valeurs) →
 * message | undefined`.
 *
 * Pure et détachée de tout état de rendu, elle sert deux appelants qui ne
 * peuvent pas partager le même chemin : les validateurs de champ TanStack (champ
 * monté, saisie en cours) et le contrôle de sûreté joué sur *toutes* les étapes
 * avant soumission, dont les champs ne sont pas montés et n'ont donc aucune
 * instance TanStack à interroger.
 *
 * Ordre des règles : `required` d'abord — sur un champ vide et facultatif, tout
 * le reste est sauté, sans quoi un `minLength` refuserait un champ qu'on a le
 * droit de ne pas remplir.
 */
export const buildFieldValidator =
	(field: FormFieldConfig) =>
	(rawValue: string | undefined, values: MultiStepFormValues): string | undefined => {
		/*
		 * Un champ désactivé n'est jamais validé — c'est la règle du HTML natif
		 * (`disabled` exclut de la validation de contrainte), et surtout la seule
		 * qui ne mène pas à une impasse : un champ à la fois `disabled` et
		 * `required` mais vide bloquerait l'étape pour toujours, l'utilisateur
		 * n'ayant aucun moyen de le corriger. Sa valeur reste remontée dans
		 * l'objet posté : elle vient du CMS, elle fait partie de la candidature.
		 */
		if (field.disabled) return undefined;

		const value = rawValue ?? "";
		const rules = field.validation ?? {};
		const isRequired = rules.required ?? field.required ?? false;
		const trimmed = value.trim();

		if (isRequired && trimmed === "") return message(field, "required");
		if (trimmed === "") return rules.validate?.(value, values);

		if (rules.email && !EMAIL_PATTERN.test(trimmed)) return message(field, "email");

		if (rules.pattern) {
			const pattern = typeof rules.pattern === "string" ? new RegExp(rules.pattern) : rules.pattern;
			// `lastIndex` d'une regex `/g` fournie par l'appelant survit d'un appel à
			// l'autre : sans remise à zéro, une frappe sur deux passerait.
			pattern.lastIndex = 0;
			if (!pattern.test(value)) return message(field, "pattern");
		}

		if (rules.minLength !== undefined && value.length < rules.minLength) {
			return message(field, "minLength", rules.minLength);
		}
		if (rules.maxLength !== undefined && value.length > rules.maxLength) {
			return message(field, "maxLength", rules.maxLength);
		}

		if (rules.min !== undefined || rules.max !== undefined) {
			const numeric = Number(value.replace(",", "."));
			// Une saisie non numérique ne peut être ni « trop petite » ni « trop
			// grande » : c'est un problème de format, que `pattern` ou `type` traite.
			if (!Number.isNaN(numeric)) {
				if (rules.min !== undefined && numeric < rules.min) {
					return message(field, "min", rules.min);
				}
				if (rules.max !== undefined && numeric > rules.max) {
					return message(field, "max", rules.max);
				}
			}
		}

		return rules.validate?.(value, values);
	};

/** Tous les champs d'une étape, dans l'ordre de rendu. */
export const stepFields = (step: FormStepConfig): FormFieldConfig[] => step.fields ?? [];

/**
 * Premier champ invalide du parcours, toutes étapes confondues. Sert de dernier
 * verrou avant le POST : une étape franchie puis modifiée par du code appelant
 * (valeurs pilotées, champ conditionnel) ne doit pas passer inaperçue.
 */
export const findFirstInvalidField = (
	steps: FormStepConfig[],
	values: MultiStepFormValues,
): { stepIndex: number; field: FormFieldConfig; error: string } | undefined => {
	for (const [stepIndex, step] of steps.entries()) {
		for (const field of stepFields(step)) {
			const error = buildFieldValidator(field)(values[field.name], values);
			if (error) return { stepIndex, field, error };
		}
	}
	return undefined;
};

/**
 * Valeurs initiales du formulaire. Chaque champ déclaré est présent dès le
 * départ, y compris ceux des étapes non encore rendues : TanStack ne connaît que
 * les champs montés, et un objet posté dont la forme change selon le
 * chemin parcouru serait impossible à typer côté Jahia.
 *
 * La seule source d'amorçage est l'attribut `value` du champ : le formulaire n'a
 * pas de valeurs initiales globales. Une clé annexe de `fills` part donc toujours
 * vide — aucun champ ne la déclare, rien ne peut la pré-remplir.
 */
export const buildDefaultValues = (steps: FormStepConfig[]): MultiStepFormValues => {
	const values: MultiStepFormValues = {};

	for (const step of steps) {
		for (const field of stepFields(step)) {
			values[field.name] = field.value ?? "";

			/*
			 * Les clés annexes d'un champ `autocomplete` sont amorcées elles aussi.
			 * Elles ne sont écrites qu'au choix d'une option : sans cet amorçage, un
			 * parcours où l'utilisateur ne touche pas au champ rendrait un objet
			 * amputé de ces clés — exactement la forme variable que cette fonction
			 * existe pour empêcher. `fills` est appelée sur une option vide, dont on
			 * ne garde que les clés.
			 */
			if (field.type === "autocomplete" && field.fills) {
				for (const key of Object.keys(field.fills({ value: "", label: "" }))) {
					values[key] = "";
				}
			}
		}
	}

	return values;
};
