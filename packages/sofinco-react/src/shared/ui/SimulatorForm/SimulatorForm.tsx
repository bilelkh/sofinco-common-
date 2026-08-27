import { useId } from "react";
import clsx from "clsx";
import { useForm } from "@tanstack/react-form";

import Cta from "@shared/ui/Cta/Cta";
import { createSimulatorFormSubmitHandler } from "@shared/utils/simulatorFormSubmit";
import { ICONS } from "@shared/ui/svg";

import type { SimulatorFormProps } from "@shared/ui/SimulatorForm/SimulatorForm.type";
import styles from "@shared/ui/SimulatorForm/SimulatorForm.module.css";

const WarningIcon = ICONS.warning;
const XIcon = ICONS["circle-x"];

/**
 * Le champ est dimensionné pour 6 chiffres (`field-sizing: content`, repli
 * `12ch`) : au-delà, la valeur déborderait de la pilule. On plafonne donc la
 * saisie plutôt que de laisser le layout casser.
 */
const MAX_AMOUNT_DIGITS = 6;
const MAX_AMOUNT = 10 ** MAX_AMOUNT_DIGITS - 1; // 999999

/**
 * Ne garde que les chiffres, tronqués à {@link MAX_AMOUNT_DIGITS}. Les montants
 * sont des euros entiers positifs : `-`, `.` et `e` — que `<input type="number">`
 * accepte pourtant — sont écartés au passage.
 *
 * Les zéros de tête sont retirés avant la troncature : sans ça un collage type
 * « 00123456789 » consommerait deux caractères du quota puis serait renormalisé
 * par l'input number, désynchronisant le state (« 001234 ») et le DOM (« 1234 »).
 * Le lookahead préserve un « 0 » seul, le temps que l'utilisateur tape la suite.
 */
function capAmountDigits(raw: string): string {
	return raw
		.replace(/\D/g, "")
		.replace(/^0+(?=\d)/, "")
		.slice(0, MAX_AMOUNT_DIGITS);
}

/**
 * Espace fine insécable (U+202F) — séparateur de milliers de la typographie
 * française. Insécable pour que « 15 000 » ne soit jamais coupé, et fine parce
 * que c'est la convention FR (cf. le formatage Java côté sofinco-core).
 */
const AMOUNT_GROUP_SEPARATOR = "\u202F";

/** « 15000 » → « 15 000 ». Entrée = chiffres bruts uniquement. */
function formatAmount(raw: string): string {
	return raw.replace(/\B(?=(\d{3})+(?!\d))/g, AMOUNT_GROUP_SEPARATOR);
}

function countDigits(value: string): number {
	return value.replace(/\D/g, "").length;
}

/**
 * Position du caret dans une valeur formatée, juste après `digitCount` chiffres.
 * Permet de replacer le curseur au même endroit *logique* après réinsertion des
 * séparateurs — sans ça, toute frappe en milieu de champ renverrait le caret en
 * fin de ligne.
 */
function caretAfterDigits(formatted: string, digitCount: number): number {
	if (digitCount <= 0) return 0;
	let seen = 0;
	for (let i = 0; i < formatted.length; i++) {
		if (formatted[i] >= "0" && formatted[i] <= "9") {
			seen += 1;
			if (seen === digitCount) return i + 1;
		}
	}
	return formatted.length;
}

/**
 * Messages par défaut, surchargeables via les props `requiredErrorMessage`,
 * `minErrorMessage` et `maxErrorMessage`. Les jetons `{min}` / `{max}` sont
 * remplacés par la borne effective — des chaînes plates plutôt que des
 * callbacks, pour rester pilotables depuis une propriété JCR côté Jahia.
 */
const DEFAULT_AMOUNT_ERROR_MESSAGES = {
	required: "Ce champ est requis",
	min: "Le montant minimum est de {min}€",
	max: "Le montant maximum est de {max}€",
};

/**
 * Défaut du placeholder — source de vérité unique. Ni les composants parents
 * (`SimulatorBlock`, `HeroSimulator`, `ChatBot`) ni les mappers Jahia ne doivent
 * le redéfinir : ils passent la valeur authorée ou rien.
 */
const DEFAULT_AMOUNT_PLACEHOLDER = "J'ai besoin de";

interface AmountErrorMessages {
	required?: string;
	min?: string;
	max?: string;
}

function validateAmount(
	value: string,
	min: number,
	max: number,
	// `||` et non `??` : une chaîne vide retombe sur le défaut, comme le fait
	// déjà `errorMessage` (cf. story EmptyErrorMessageFallsThrough).
	messages: AmountErrorMessages = {},
): string | undefined {
	if (!value) return messages.required || DEFAULT_AMOUNT_ERROR_MESSAGES.required;
	const numeric = Number(value);
	// Bornes formatées comme le champ lui-même : sans ça le message afficherait
	// « 50000€ » sous un champ qui, lui, montre « 50 000 ».
	if (numeric < min) {
		return (messages.min || DEFAULT_AMOUNT_ERROR_MESSAGES.min).replace(
			/\{min\}/g,
			formatAmount(String(min)),
		);
	}
	if (numeric > max) {
		return (messages.max || DEFAULT_AMOUNT_ERROR_MESSAGES.max).replace(
			/\{max\}/g,
			formatAmount(String(max)),
		);
	}
	return undefined;
}

const SimulatorForm = ({
	formId,
	amountPlaceholder,
	amountMin,
	amountMax,
	ctaLabel,
	ctaVariant,
	ctaSection,
	ctaHref,
	ctaTarget,
	errorMessage,
	requiredErrorMessage,
	minErrorMessage,
	maxErrorMessage,
	className,
	onSubmit,
}: SimulatorFormProps) => {
	const generatedId = useId();
	const inputId = `simulator-form-amount-${generatedId}`;
	const errorTextId = `simulator-form-amount-error-${generatedId}`;

	// Guard against a mis-ordered config (min > max) that would make the native
	// number input impossible to satisfy, leaving the form permanently unsubmittable.
	// Les bornes sont aussi ramenées à MAX_AMOUNT : un `amountMax` à 7 chiffres
	// serait inatteignable au clavier (saisie plafonnée) et rendrait le message
	// « Le montant maximum est de … » mensonger.
	const effectiveMin = Math.min(amountMin, amountMax, MAX_AMOUNT);
	const effectiveMax = Math.min(Math.max(amountMin, amountMax), MAX_AMOUNT);

	const amountErrorMessages: AmountErrorMessages = {
		required: requiredErrorMessage,
		min: minErrorMessage,
		max: maxErrorMessage,
	};

	const formAction = ctaHref ?? "";
	const handleNativeSubmit = createSimulatorFormSubmitHandler({
		ctaHref,
		ctaTarget,
	});

	const form = useForm({
		defaultValues: { amount: "" },
		// Ne se déclenche qu'une fois les validators du champ passés (TanStack les
		// exécute avant `onSubmit`) — no-op quand la prop `onSubmit` est absente.
		onSubmit: ({ value }) => onSubmit?.(Number(value.amount)),
	});

	return (
		<form
			id={formId}
			action={formAction}
			method="GET"
			target={ctaTarget}
			// Désactive la validation native, qui bloquerait la soumission d'un champ
			// vide (`required`) avec sa propre bulle avant que `onSubmit` ne s'exécute :
			// le message maison « Ce champ est requis » ne s'afficherait jamais.
			// `required` est conservé côté input pour la sémantique (aria-required).
			noValidate
			className={clsx(styles["simulator-form"], className)}
			onSubmit={(event) => {
				if (onSubmit) {
					// Flux conversationnel (ChatBot) : pas de navigation, on rappelle le
					// parent avec le montant validé via le handler `onSubmit` de `useForm`.
					event.preventDefault();
					void form.handleSubmit();
					return;
				}
				// `type="text"` (imposé par le séparateur de milliers) fait perdre la
				// validation native `min`/`max` qui bloquait jusqu'ici la soumission :
				// on la rejoue ici pour ne pas naviguer avec un montant hors bornes.
				// `handleSubmit` affiche le message d'erreur au passage.
				if (
					validateAmount(form.state.values.amount, effectiveMin, effectiveMax, amountErrorMessages)
				) {
					event.preventDefault();
					void form.handleSubmit();
					return;
				}
				void form.handleSubmit();
				handleNativeSubmit(event);
			}}
		>
			<div className={styles["simulator-form__wrapper"]}>
				<label className={styles["sr-only"]} htmlFor={inputId}>
					Montant souhaité
				</label>
				<form.Field
					name="amount"
					// Validation à la soumission uniquement : ni `onChange` ni `onBlur`,
					// qui affichaient une erreur dès la première frappe ou au simple
					// passage dans le champ.
					validators={{
						onSubmit: ({ value }) =>
							validateAmount(value, effectiveMin, effectiveMax, amountErrorMessages),
					}}
				>
					{(field) => {
						const internalError = field.state.meta.errors.find(
							(error): error is string => typeof error === "string",
						);
						const displayedError = errorMessage || internalError;

						return (
							<>
								<div
									className={clsx(
										styles["simulator-form__field-group"],
										displayedError && styles["simulator-form__field-group--error"],
									)}
								>
									<div className={styles["simulator-form__field-wrapper"]}>
										{/*
										 * `type="text"` et non `number` : un input number n'accepte comme
										 * valeur qu'un nombre à virgule flottante valide et refuserait donc
										 * « 15 000 ». Le state garde les chiffres bruts, l'affichage est
										 * formaté, et le champ caché ci-dessous porte la valeur soumise.
										 */}
										<input
											id={inputId}
											type="text"
											inputMode="numeric"
											autoComplete="off"
											className={clsx(
												styles["simulator-form__field"],
												displayedError && styles["simulator-form__field--error"],
											)}
											placeholder={amountPlaceholder || DEFAULT_AMOUNT_PLACEHOLDER}
											value={formatAmount(field.state.value)}
											onChange={(event) => {
												const el = event.target;
												const caretDigits = countDigits(
													el.value.slice(0, el.selectionStart ?? el.value.length),
												);
												const raw = capAmountDigits(el.value);
												const formatted = formatAmount(raw);

												// Input contrôlé : quand la valeur formatée est identique à
												// celle déjà rendue, React ne re-rend pas et le DOM garderait
												// la frappe en trop. On resynchronise DOM + caret à la main.
												el.value = formatted;
												const caret = caretAfterDigits(formatted, caretDigits);
												el.setSelectionRange(caret, caret);

												field.handleChange(raw);
											}}
											onKeyDown={(event) => {
												const el = event.currentTarget;
												const caret = el.selectionStart;
												// Sélection en cours → suppression native, rien à corriger.
												if (caret === null || caret !== el.selectionEnd) return;

												// Supprimer un séparateur seul n'a aucun effet visible : le
												// formatage le réinsère aussitôt et la touche paraît morte.
												// On retire donc le chiffre situé juste au-delà.
												const onSeparatorBack =
													event.key === "Backspace" &&
													el.value[caret - 1] === AMOUNT_GROUP_SEPARATOR;
												const onSeparatorForward =
													event.key === "Delete" && el.value[caret] === AMOUNT_GROUP_SEPARATOR;
												if (!onSeparatorBack && !onSeparatorForward) return;

												const digitsBefore = countDigits(el.value.slice(0, caret));
												const removeAt = onSeparatorBack ? digitsBefore - 1 : digitsBefore;
												const raw = capAmountDigits(el.value);
												if (removeAt < 0 || removeAt >= raw.length) return;

												event.preventDefault();
												// Repasser par `capAmountDigits` : supprimer le premier chiffre
												// laisserait sinon des zéros de tête (« 1 000 » → « 000 »), là où
												// un backspace ordinaire sur le même chiffre donne « 0 ».
												const nextRaw = capAmountDigits(
													raw.slice(0, removeAt) + raw.slice(removeAt + 1),
												);
												const formatted = formatAmount(nextRaw);
												el.value = formatted;
												const nextCaret = caretAfterDigits(
													formatted,
													Math.min(removeAt, nextRaw.length),
												);
												el.setSelectionRange(nextCaret, nextCaret);
												field.handleChange(nextRaw);
											}}
											onBlur={field.handleBlur}
											aria-invalid={displayedError ? true : undefined}
											aria-describedby={displayedError ? errorTextId : undefined}
											required
										/>
										{/* Valeur réellement soumise (GET) : chiffres bruts, sans séparateur. */}
										<input type="hidden" name="amount" value={field.state.value} />
										<span
											className={clsx(
												styles["simulator-form__currency"],
												displayedError && styles["simulator-form__field--error"],
											)}
											aria-hidden="true"
										>
											€
										</span>
									</div>
									{form.state.values.amount && (
										<button
											onClick={() => form.setFieldValue("amount", "")}
											className={clsx(
												styles["simulator-form__clear-button"],
												displayedError && styles["simulator-form__field--error"],
											)}
											type="button"
											aria-label="Effacer"
										>
											<XIcon />
										</button>
									)}
								</div>
								{displayedError && (
									<em className={styles["simulator-form__error"]} id={errorTextId} role="alert">
										<span aria-hidden="true">
											<WarningIcon />
										</span>
										{displayedError}
									</em>
								)}
							</>
						);
					}}
				</form.Field>
			</div>
			<Cta type="submit" variant={ctaVariant} label={ctaLabel} ctaSection={ctaSection} />
		</form>
	);
};

export default SimulatorForm;
