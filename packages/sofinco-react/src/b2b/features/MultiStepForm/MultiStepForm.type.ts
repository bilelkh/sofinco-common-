import type { ReactNode } from "react";

import type {
	AutocompleteLabels,
	AutocompleteOption,
	AutocompleteSearch,
} from "@shared/ui/Autocomplete/Autocomplete.type";
import type { SelectOption, SelectOptionGroup } from "@shared/ui/Select/Select.type";
import type { StepperCounterVariant, StepperVariant } from "@shared/ui/Stepper";
import type { IconKey } from "@shared/ui/svg";
import type { MaskConfig, MaskName } from "@shared/utils/mask";

/**
 * Valeurs du formulaire. Volontairement `string` partout : les trois contrôles
 * du DS (`TextField`, `Textarea`, `Select`) travaillent sur du texte, y compris
 * pour un `type="number"` — un `<input>` ne rend jamais autre chose. Les
 * conversions (nombre, date, booléen) restent à la charge du service destinataire,
 * où le domaine métier est connu.
 */
export type MultiStepFormValues = Record<string, string>;

/** Règles de validation reconnues, dans l'ordre où elles sont évaluées. */
export type ValidationRuleKey =
	| "required"
	| "email"
	| "pattern"
	| "minLength"
	| "maxLength"
	| "min"
	| "max"
	| "validate";

export interface ValidationRules {
	/**
	 * Champ obligatoire. Doublonne `required` du champ : `required` porte
	 * l'affordance (astérisque, `aria-required`), cette règle porte le contrôle.
	 * Poser l'un des deux suffit — le composant les réunit.
	 */
	required?: boolean;
	/** Format e-mail. Contrôle volontairement permissif, cf. `validation.ts`. */
	email?: boolean;
	/** Expression régulière. Une `string` est compilée sans drapeau. */
	pattern?: RegExp | string;
	minLength?: number;
	maxLength?: number;
	/** Bornes numériques — la valeur est convertie avant comparaison. */
	min?: number;
	max?: number;
	/**
	 * Règle libre, évaluée en dernier. Retourne le message d'erreur, ou
	 * `undefined` si la valeur est acceptée. Reçoit toutes les valeurs du
	 * formulaire, étapes précédentes comprises (confirmation de mot de passe,
	 * champ conditionnel…).
	 */
	validate?: (value: string, values: MultiStepFormValues) => string | undefined;
}

/**
 * Messages d'erreur par règle. Chaque clé absente retombe sur le message par
 * défaut du DS (en français, cf. `validation.ts`).
 */
export type FieldErrorMessages = Partial<Record<ValidationRuleKey, string>>;

interface BaseFieldConfig {
	/** Clé de la valeur dans l'objet posté à l'API. Unique sur tout le formulaire. */
	name: string;
	label: ReactNode;
	/** Masque le libellé sans le retirer de l'arbre d'accessibilité. */
	hideLabel?: boolean;
	placeholder?: string;
	/** Texte d'aide sous le champ, masqué tant qu'une erreur est affichée. */
	hint?: ReactNode;
	required?: boolean;
	disabled?: boolean;
	/**
	 * Valeur du champ à l'ouverture — celle que Jahia a déjà, un Siret par exemple.
	 * Seule source d'amorçage du formulaire.
	 *
	 * ⚠️ Lue une seule fois, à l'initialisation : ce n'est PAS une valeur contrôlée.
	 * La modifier ensuite ne remonte rien au champ, qui appartient dès lors à la
	 * saisie de l'utilisateur. Pour repartir d'autres valeurs, il faut remonter le
	 * formulaire (une `key` React qui change).
	 */
	value?: string;
	validation?: ValidationRules;
	errorMessages?: FieldErrorMessages;
	autoComplete?: string;
	/**
	 * Largeur dans la grille de l'étape. `full` (défaut) occupe la ligne, `half`
	 * partage la ligne avec le champ voisin à partir du palier tablette.
	 */
	width?: "full" | "half";
	className?: string;
}

export interface TextFieldConfig extends BaseFieldConfig {
	/** `text` par défaut. Types natifs `<input>` rendus par `TextField`. */
	type?: "text" | "email" | "tel" | "number" | "url" | "password" | "date";
	icon?: IconKey;
	trailingIcon?: IconKey;
	/** Bouton d'effacement dès que le champ porte une valeur. */
	clearable?: boolean;
	maxLength?: number;
	inputMode?: "text" | "numeric" | "decimal" | "tel" | "email" | "url" | "search";
	readOnly?: boolean;
	/**
	 * Masque de saisie — `"phone"`, `"siret"`, ou un gabarit sur mesure
	 * (`{ mask: "__/__/____", replacement: { _: /\d/ } }`).
	 *
	 * La valeur postée reste NUE : les séparateurs ne sortent jamais
	 * du champ. Les règles de `validation` continuent donc de porter sur des
	 * chiffres seuls (`/^\d{14}$/`), et `maxLength` devient inutile — le gabarit
	 * borne déjà la saisie. `type` doit rester `text`, `email` ou `tel`.
	 */
	mask?: MaskName | MaskConfig;
}

export interface TextareaFieldConfig extends BaseFieldConfig {
	type: "textarea";
	rows?: number;
	maxLength?: number;
	/** Compteur `courant / max` sous le champ. Exige `maxLength`. */
	showCounter?: boolean;
	resize?: "none" | "vertical";
	readOnly?: boolean;
}

export interface SelectFieldConfig extends BaseFieldConfig {
	type: "select";
	options?: SelectOption[];
	/** Options groupées, rendues après les `options` à plat. */
	groups?: SelectOptionGroup[];
	icon?: IconKey;
}

export interface AutocompleteFieldConfig extends BaseFieldConfig {
	type: "autocomplete";
	/**
	 * Source des options. Reçoit la saisie et un signal d'annulation ; à elle
	 * d'appeler le service et de rendre des options. Le formulaire ne connaît
	 * aucune API : c'est la configuration qui apporte la sienne.
	 */
	onSearch: AutocompleteSearch;
	/** Caractères avant déclenchement de la recherche. Défaut 1. */
	minLength?: number;
	/** Attente avant l'appel, en ms. Défaut 250. */
	debounceMs?: number;
	icon?: IconKey;
	clearable?: boolean;
	labels?: AutocompleteLabels;
	/**
	 * Valeurs supplémentaires écrites au choix d'une option, fusionnées dans le
	 * formulaire. C'est la réponse au cas où `value` ne suffit pas à désigner le
	 * choix : un code postal vaut pour quatorze communes, la commune retenue doit
	 * donc vivre dans son propre champ.
	 *
	 * Les clés rendues ici n'ont pas à figurer dans `fields` — un champ qui n'est
	 * jamais saisi n'a pas de contrôle à rendre.
	 */
	fills?: (option: AutocompleteOption) => MultiStepFormValues;
	/**
	 * Libellé à réafficher quand l'étape est remontée. Les champs des autres
	 * étapes ne sont pas montés : revenir en arrière reconstruit le contrôle, qui
	 * a perdu le libellé de l'option choisie alors que la valeur, elle, est
	 * toujours là. Sans cette fonction le champ se rouvrirait vide sur une valeur
	 * pourtant renseignée.
	 */
	display?: (values: MultiStepFormValues) => string;
}

export type FormFieldConfig =
	| TextFieldConfig
	| TextareaFieldConfig
	| SelectFieldConfig
	| AutocompleteFieldConfig;

export interface FormStepConfig {
	/** Identifiant stable de l'étape, remonté par `onStepChange`. Défaut : son index. */
	id?: string;
	/** Libellé de l'étape — variante `number` du Stepper, et nom accessible du panneau. */
	label?: string;
	/** Titre affiché en tête de l'étape. */
	title?: ReactNode;
	/** Texte d'introduction sous le titre. */
	description?: ReactNode;
	fields?: FormFieldConfig[];
	/**
	 * Contenu libre rendu après les champs — bloc de consentement, encart légal,
	 * récapitulatif… Échappatoire assumée : tout ce que la configuration de champs
	 * ne sait pas décrire passe par là plutôt que d'élargir `FormFieldConfig`.
	 */
	content?: ReactNode;
}

export interface MultiStepFormLabels {
	/** Bouton d'avancement des étapes intermédiaires. Défaut « Continuer ». */
	next?: string;
	/** Bouton de la dernière étape. Défaut « Envoyer ». */
	submit?: string;
	/** Nom accessible du bouton retour (icône seule). Défaut « Étape précédente ». */
	previous?: string;
	/** Message affiché quand l'appel à l'API échoue. Défaut en français, cf. le composant. */
	error?: string;
}

export interface MultiStepFormStepperConfig {
	/** Masque l'indicateur — parcours à une seule étape, ou stepper rendu ailleurs. */
	show?: boolean;
	variant?: StepperVariant;
	counterVariant?: StepperCounterVariant;
	ariaLabel?: string;
}

export interface MultiStepFormSettings {
	/**
	 * URL de l'API recevant l'objet complet, appelée en `POST` `fetch` avec un corps
	 * `application/x-www-form-urlencoded` — le format exact que produisait le POST de
	 * formulaire HTML, `retURL` compris. C'est le SEUL point de sortie du formulaire :
	 * sans elle, la dernière étape valide n'envoie rien (signalé en console).
	 *
	 * ⚠️ L'endpoint doit autoriser l'origine du site en CORS. Salesforce Web-to-Lead
	 * (`webto.salesforce.com`) ne le fait PAS : viser un service à soi, ou un relais.
	 */
	salesforceUrl?: string;
	/**
	 * URL vers laquelle naviguer une fois l'appel réussi. Aucune navigation sans elle.
	 * Un chemin relatif est absolutisé, et repart aussi dans le champ `retURL` du corps.
	 */
	successUrl?: string;
}

export interface MultiStepFormProps {
	/**
	 * Étapes du parcours, dans l'ordre. Le nombre d'étapes du Stepper en découle :
	 * il n'y a pas de `totalSteps` à tenir synchronisé à la main.
	 */
	steps: FormStepConfig[];
	/** Notifié à chaque changement d'étape, après validation de l'étape quittée. */
	onStepChange?: (step: { index: number; id: string }, values: MultiStepFormValues) => void;
	/**
	 * Retour demandé depuis la première étape. Sans ce rappel, le bouton retour
	 * n'est pas rendu sur la première étape : il n'aurait nulle part où aller.
	 */
	onFirstStepBack?: () => void;
	settings?: MultiStepFormSettings;
	stepper?: MultiStepFormStepperConfig;
	labels?: MultiStepFormLabels;
	/** Nom accessible du formulaire. */
	ariaLabel?: string;
	className?: string;
}
