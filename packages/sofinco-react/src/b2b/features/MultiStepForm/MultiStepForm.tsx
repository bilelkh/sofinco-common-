import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import clsx from "clsx";
import { useForm } from "@tanstack/react-form";

import Autocomplete from "@shared/ui/Autocomplete/Autocomplete";
import Cta from "@shared/ui/Cta/Cta";
import Select from "@shared/ui/Select/Select";
import Stepper from "@shared/ui/Stepper/Stepper";
import TextField from "@shared/ui/TextField/TextField";
import Textarea from "@shared/ui/Textarea/Textarea";
import Title from "@shared/ui/Title/Title";
import { FootnoteText } from "@shared/footnotes";

import type {
	FormFieldConfig,
	MultiStepFormProps,
	MultiStepFormValues,
} from "./MultiStepForm.type";
import {
	buildDefaultValues,
	buildFieldValidator,
	findFirstInvalidField,
	stepFields,
} from "./validation";
import styles from "./multiStepForm.module.css";

const DEFAULT_LABELS = {
	next: "Continuer",
	submit: "Envoyer",
	previous: "Étape précédente",
} as const;

const resolveSuccessUrl = (url: string | undefined): string | undefined => {
	if (!url || !url.startsWith("/") || typeof window === "undefined") return url;
	return new URL(url, window.location.origin).toString();
};

/**
 * Formulaire multi-étapes générique — coquille DS pilotée *entièrement* par
 * configuration : `steps` décrit les étapes, leurs champs et leurs règles, et le
 * composant en déduit le rendu, l'indicateur de progression et la validation.
 * Aucune connaissance métier ici : le parent (composant Jahia) reçoit les valeurs
 * complètes dans `onSubmit` et décide de la suite.
 *
 * **Validation par étape.** On ne franchit une étape que si *ses* champs sont
 * valides ; ceux des étapes suivantes ne sont pas montés et ne sont donc jamais
 * évalués au passage. Deux chemins de validation coexistent, à dessein :
 *
 *  - `form.validateField` pour l'étape courante — c'est lui qui peuple les
 *    messages affichés sous les champs, via l'état TanStack ;
 *  - les validateurs purs de `validation.ts` pour le contrôle final sur toutes
 *    les étapes, et pour retrouver le premier champ fautif à focaliser. TanStack
 *    ne connaît que les champs montés : lui demander l'état d'une étape quittée
 *    n'a pas de sens.
 *
 * **Valeurs conservées.** Les champs d'une étape quittée sont démontés mais leurs
 * valeurs restent dans l'état du formulaire — un retour arrière retrouve la
 * saisie intacte, et `onSubmit` reçoit toujours le même objet, quel que soit le
 * chemin parcouru.
 *
 * A11Y — à chaque changement d'étape le focus est reposé sur l'en-tête de la
 * nouvelle étape : sans ça il resterait sur un bouton démonté et repartirait du
 * `<body>`. En cas d'échec de validation, le focus va au premier champ fautif,
 * dont le message est déjà annoncé par le `role="alert"` de `Field`.
 */
const MultiStepForm = ({
	steps,
	onSubmit,
	onStepChange,
	onFirstStepBack,
	defaultValues,
	settings,
	stepper,
	labels,
	isSubmitting = false,
	submitError,
	ariaLabel,
	className,
}: MultiStepFormProps) => {
	const baseId = useId();
	const fieldDomId = (name: string) => `${baseId}-${name}`;
	const titleId = `${baseId}-title`;

	const [stepIndex, setStepIndex] = useState(0);
	const [internalSubmitting, setInternalSubmitting] = useState(false);
	// Passe à `true` quand on ramène l'utilisateur sur une étape antérieure
	// invalidée : les champs doivent d'abord être montés pour porter leur erreur.
	const [pendingRevalidation, setPendingRevalidation] = useState(false);

	const headingRef = useRef<HTMLDivElement>(null);
	const renderedStepRef = useRef(0);
	const salesforceFormRef = useRef<HTMLFormElement>(null);

	const form = useForm({
		defaultValues: buildDefaultValues(steps, defaultValues),
		onSubmit: async ({ value }) => {
			// Reconstruit la forme complète attendue par le parent, y compris les
			// champs des étapes démontées et les valeurs auxiliaires du CMS.
			const completeValues = {
				...buildDefaultValues(steps, defaultValues),
				...value,
			};
			await onSubmit(completeValues);
		},
	});

	const total = steps.length;
	// Borné : une reconfiguration des étapes en cours de parcours (Jahia recharge
	// sa configuration) ne doit pas laisser l'index pointer dans le vide.
	const safeIndex = Math.max(0, Math.min(stepIndex, Math.max(total - 1, 0)));
	const currentStep = steps[safeIndex];
	const isLastStep = safeIndex === total - 1;
	const busy = isSubmitting || internalSubmitting;

	const stepLabels = { ...DEFAULT_LABELS, ...labels };
	const showStepper = stepper?.show ?? true;
	const showBack = safeIndex > 0 || Boolean(onFirstStepBack);

	/** Marque les champs de l'étape comme touchés puis les valide. */
	const validateStep = async (index: number): Promise<boolean> => {
		const fields = stepFields(steps[index]);

		// Sans ce passage en « quitté », un champ jamais visité resterait muet : le
		// rendu masque les messages tant que `isBlurred` est faux.
		fields.forEach((field) => {
			form.setFieldMeta(field.name, (meta) => ({ ...meta, isTouched: true, isBlurred: true }));
		});

		const results = await Promise.all(
			fields.map((field) => form.validateField(field.name, "change")),
		);

		return results.every((errors) => errors.filter(Boolean).length === 0);
	};

	/** Focalise le premier champ fautif de l'étape, et l'amène dans le cadre. */
	const focusInvalidField = (index: number) => {
		const values = form.state.values as MultiStepFormValues;
		const invalid = stepFields(steps[index]).find((field) =>
			buildFieldValidator(field)(values[field.name], values),
		);
		if (!invalid) return;

		const node = document.getElementById(fieldDomId(invalid.name));
		node?.focus();
		node?.scrollIntoView({ block: "center", behavior: "smooth" });
	};

	const goToStep = (index: number) => {
		setStepIndex(index);
		onStepChange?.(
			{ index, id: steps[index]?.id ?? String(index) },
			form.state.values as MultiStepFormValues,
		);
	};

	const handleBack = () => {
		if (safeIndex === 0) {
			onFirstStepBack?.();
			return;
		}
		goToStep(safeIndex - 1);
	};

	/**
	 * Un seul point d'entrée pour l'avancement : le bouton principal est un
	 * `submit`, donc la touche Entrée dans un champ passe exactement par ici — et
	 * ne saute jamais la validation de l'étape.
	 */
	const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (busy || total === 0) return;

		if (!(await validateStep(safeIndex))) {
			focusInvalidField(safeIndex);
			return;
		}

		if (!isLastStep) {
			goToStep(safeIndex + 1);
			return;
		}

		// Dernier verrou avant la sortie vers le parent : une étape franchie plus
		// tôt a pu être invalidée depuis (valeur pilotée, règle croisée).
		const invalid = findFirstInvalidField(steps, form.state.values as MultiStepFormValues);
		if (invalid) {
			goToStep(invalid.stepIndex);
			setPendingRevalidation(true);
			return;
		}

		setInternalSubmitting(true);
		try {
			await form.handleSubmit();
			if (settings?.salesforceUrl) {
				const salesforceForm = salesforceFormRef.current;
				if (salesforceForm) HTMLFormElement.prototype.submit.call(salesforceForm);
			}
		} finally {
			setInternalSubmitting(false);
		}
	};

	// Repose le focus sur l'en-tête de l'étape qui vient d'être montée.
	useEffect(() => {
		if (renderedStepRef.current === safeIndex) return;
		renderedStepRef.current = safeIndex;
		headingRef.current?.focus();
	}, [safeIndex]);

	// Rejoue la validation après un retour forcé sur une étape antérieure : les
	// champs sont montés à ce tour-ci seulement, ils peuvent enfin porter l'erreur.
	useEffect(() => {
		if (!pendingRevalidation) return;
		/*
		 * Le drapeau est CONSOMMÉ ici, et nulle part ailleurs : il n'existe que pour
		 * différer la validation d'un tour de rendu, le temps que les champs de l'étape
		 * soient montés. Le remettre à `false` pendant le rendu le rallumerait aussitôt.
		 */
		// eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
		setPendingRevalidation(false);
		void validateStep(safeIndex).then(() => focusInvalidField(safeIndex));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pendingRevalidation, safeIndex]);

	// Une configuration vide n'a rien à rendre — et surtout pas une coquille de
	// formulaire avec un bouton d'envoi qui ne collecterait rien.
	if (total === 0) return null;

	const renderField = (field: FormFieldConfig) => {
		const validate = buildFieldValidator(field);
		const validateFromApi = ({
			value,
			fieldApi,
		}: {
			value: string;
			fieldApi: { form: { state: { values: MultiStepFormValues } } };
		}) => validate(value, fieldApi.form.state.values);

		return (
			/*
			 * Un SEUL validateur, sur `onChange`. TanStack range les messages par
			 * cause et ne nettoie que celle qu'il vient de rejouer : un validateur
			 * `onBlur` en plus laisserait son message en place après correction au
			 * clavier, le champ restant en erreur alors que la valeur est redevenue
			 * valide. Une cause unique ne peut pas se désynchroniser.
			 */
			<form.Field key={field.name} name={field.name} validators={{ onChange: validateFromApi }}>
				{(fieldApi) => {
					const { isBlurred, errors } = fieldApi.state.meta;
					// Affiché seulement une fois le champ quitté (ou l'étape validée, qui
					// pose `isBlurred`) : sinon l'erreur s'afficherait dès la 1re frappe.
					const errorMessage = isBlurred
						? (errors.find(Boolean) as string | undefined)
						: undefined;

					const common = {
						id: fieldDomId(field.name),
						name: field.name,
						label: field.label,
						hideLabel: field.hideLabel,
						hint: field.hint,
						placeholder: field.placeholder,
						required: field.required ?? field.validation?.required,
						disabled: field.disabled,
						autoComplete: field.autoComplete,
						errorMessage,
					};

					/*
					 * La cellule de grille est TOUJOURS cette enveloppe, jamais le
					 * contrôle : `Select` enrobe son champ d'un conteneur de
					 * positionnement (son panneau est en absolu), si bien que sa prop
					 * `className` n'atterrit pas sur son élément extérieur. Poser la
					 * largeur dessus laisserait le select sur une seule colonne quand
					 * les autres champs en occupent deux.
					 */
					const cell = (control: ReactNode) => (
						<div
							className={clsx(
								styles.form__field,
								field.width === "half" && styles["form__field--half"],
								field.className,
							)}
						>
							{control}
						</div>
					);

					if (field.type === "textarea") {
						return cell(
							<Textarea
								{...common}
								rows={field.rows}
								maxLength={field.maxLength}
								showCounter={field.showCounter}
								resize={field.resize}
								readOnly={field.readOnly}
								value={fieldApi.state.value}
								onChange={(event) => fieldApi.handleChange(event.target.value)}
								onBlur={fieldApi.handleBlur}
							/>
						);
					}

					if (field.type === "select") {
						return cell(
							<Select
								{...common}
								options={field.options}
								groups={field.groups}
								icon={field.icon}
								value={fieldApi.state.value}
								// `Select` n'expose pas de `onBlur` : son panneau est une listbox,
								// pas un `<input>`. Le choix d'une option vaut donc sortie de champ.
								onValueChange={(value) => {
									fieldApi.handleChange(value);
									fieldApi.handleBlur();
								}}
							/>,
						);
					}

					if (field.type === "autocomplete") {
						return cell(
							<Autocomplete
								{...common}
								onSearch={field.onSearch}
								minLength={field.minLength}
								debounceMs={field.debounceMs}
								icon={field.icon}
								clearable={field.clearable}
								labels={field.labels}
								value={fieldApi.state.value}
								// Le contrôle a perdu son libellé au démontage de l'étape, pas sa
								// valeur : seule la configuration sait le reconstruire.
								defaultLabel={field.display?.(form.state.values as MultiStepFormValues)}
								onValueChange={(value, option) => {
									fieldApi.handleChange(value);
									/*
									 * Les valeurs annexes sont écrites AVANT le blur : elles font partie
									 * du même choix, et une règle `validate` déclenchée par le blur les
									 * lit dans `form.state.values`.
									 *
									 * À l'effacement, `fills` est rappelée sur une option vide : elle
									 * rend les mêmes clés, qui sont donc vidées avec la principale. Sans
									 * ça la commune d'un code effacé survivrait seule jusqu'à `onSubmit`.
									 */
									if (field.fills) {
										const filled = field.fills(option ?? { value: "", label: "" });
										for (const [key, next] of Object.entries(filled)) {
											form.setFieldValue(key, option ? next : "");
										}
									}
								}}
								onBlur={fieldApi.handleBlur}
							/>,
						);
					}

					return cell(
						<TextField
							{...common}
							type={field.type ?? "text"}
							icon={field.icon}
							trailingIcon={field.trailingIcon}
							clearable={field.clearable}
							maxLength={field.maxLength}
							inputMode={field.inputMode}
							readOnly={field.readOnly}
							mask={field.mask}
							value={fieldApi.state.value}
							/*
							 * `onValueChange` et non `onChange` : sur un champ masqué,
							 * `event.target.value` porte le texte groupé, alors que le
							 * formulaire doit stocker la valeur nue. Sans masque, les deux
							 * remontent la même chose.
							 */
							onValueChange={(next) => fieldApi.handleChange(next)}
							onBlur={fieldApi.handleBlur}
							onClear={() => fieldApi.handleChange("")}
						/>,
					);
				}}
			</form.Field>
		);
	};

	return (
		<>
			<form
				className={clsx(styles.form, className)}
				onSubmit={handleFormSubmit}
				aria-label={ariaLabel}
				noValidate
			>
			{showStepper && (
				<div className={styles.form__stepper}>
					<Stepper
						variant={stepper?.variant ?? "line"}
						counterVariant={stepper?.counterVariant ?? "badge"}
						activeStep={safeIndex + 1}
						totalSteps={total}
						label={currentStep.label}
						ariaLabel={stepper?.ariaLabel ?? "Progression du formulaire"}
					/>
				</div>
			)}

			<div className={styles.form__body}>
				{(currentStep.title || currentStep.description) && (
					// `tabIndex={-1}` : cible du focus au changement d'étape. Le conteneur
					// plutôt que le seul titre, pour que la description soit annoncée aussi.
					<div className={styles.form__heading} ref={headingRef} tabIndex={-1}>
						{currentStep.title && (
							<Title as="h2" visualStyle="h4" id={titleId} className={styles.form__title}>
								{currentStep.title}
							</Title>
						)}
						{currentStep.description && (
							<p className={styles.form__description}>
								<FootnoteText>{currentStep.description}</FootnoteText>
							</p>
						)}
					</div>
				)}

				<div
					className={styles.form__step}
					role="group"
					aria-labelledby={currentStep.title ? titleId : undefined}
					aria-label={currentStep.title ? undefined : currentStep.label}
				>
					<div className={styles.form__fields}>{stepFields(currentStep).map(renderField)}</div>

					{/* `content` est un emplacement JSX libre (`ReactNode`), pas une chaîne
					    contribuée : le nom trompe l'heuristique de la règle. Ce que le parent y
					    place enveloppe son propre texte. */}
					{/* eslint-disable-next-line sofinco/require-footnote-text */}
					{currentStep.content}
				</div>

				<div className={styles.form__actions}>
					{showBack ? (
						<Cta
							className={styles.form__back}
							variant="secondary"
							iconOnly
							iconLeft="arrow-left"
							label={stepLabels.previous}
							onClick={handleBack}
							isDisabled={busy}
						/>
					) : (
						// Réserve la gouttière : sans elle le bouton principal glisserait à
						// gauche sur la première étape.
						<span aria-hidden="true" />
					)}

					<Cta
						className={styles.form__next}
						type="submit"
						variant="primary"
						label={isLastStep ? stepLabels.submit : stepLabels.next}
						iconRight="arrow-right"
						isLoading={busy}
					/>
				</div>

				{submitError && (
					<p className={styles.form__submitError} role="alert">
						{submitError}
					</p>
				)}
			</div>
			</form>

			{settings?.salesforceUrl && (
				<>
					<form
						ref={salesforceFormRef}
						method="POST"
						action={settings.salesforceUrl}
						target="_top"
						aria-hidden="true"
						className={styles["salesforce-form"]}
					>
						{Object.entries({
							...buildDefaultValues(steps, defaultValues),
							...(form.state.values as MultiStepFormValues),
							...(resolveSuccessUrl(settings.successUrl)
								? { retURL: resolveSuccessUrl(settings.successUrl) }
								: {}),
						}).map(([name, value]) => (
							<input key={name} type="hidden" name={name} value={value} readOnly />
						))}
					</form>
				</>
			)}
		</>
	);
};

export default MultiStepForm;
