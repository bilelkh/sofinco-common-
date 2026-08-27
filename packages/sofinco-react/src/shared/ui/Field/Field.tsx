import type { ReactNode } from "react";
import clsx from "clsx";

import { FootnoteText } from "@shared/footnotes";

import type { FieldOwnProps } from "./Field.type";
import type { FieldA11y } from "./useField";
import styles from "./field.module.css";

type FieldProps = Pick<
	FieldOwnProps,
	"label" | "hideLabel" | "hint" | "errorMessage" | "className" | "fieldClassName"
> &
	Pick<FieldA11y, "fieldId" | "hintId" | "errorId" | "hasError" | "showHint"> & {
		/** Optionnel : seul `Select` en a besoin, pour étiqueter son listbox. */
		labelId?: string;
		required?: boolean;
		disabled?: boolean;
		readOnly?: boolean;
		/** Aligne le contenu en haut de boîte — zone de saisie multiligne. */
		multiline?: boolean;
		/** Icône de tête, rendue avant le contrôle. */
		leading?: ReactNode;
		/** Bouton ou icône de fin, rendu après le contrôle. */
		trailing?: ReactNode;
		/** Contenu additionnel sous le champ (compteur de caractères…). */
		footer?: ReactNode;
		/** Le contrôle lui-même : `<input>`, `<textarea>` ou `<select>`. */
		children: ReactNode;
	};

/**
 * Coquille présentationnelle commune aux trois contrôles. Elle ne connaît ni
 * `<input>` ni `<select>` : le contrôle est passé en `children`, ce qui laisse à
 * chaque composant ses propres attributs natifs sans les faire transiter ici.
 *
 * Les identifiants viennent de `useField` plutôt que d'être calculés ici : le
 * contrôle en a besoin lui aussi (`id`, `aria-describedby`), et deux `useId`
 * concurrents les auraient désynchronisés.
 */
const Field = ({
	fieldId,
	labelId,
	hintId,
	errorId,
	hasError,
	showHint,
	label,
	hideLabel,
	hint,
	errorMessage,
	required,
	disabled,
	readOnly,
	multiline,
	className,
	fieldClassName,
	leading,
	trailing,
	footer,
	children,
}: FieldProps) => {
	const boxClassName = clsx(
		styles.field__box,
		hasError && styles["field__box--error"],
		disabled && styles["field__box--disabled"],
		readOnly && styles["field__box--readonly"],
		multiline && styles["field__box--multiline"],
		fieldClassName,
	);

	return (
		<div className={clsx(styles.field, className)}>
			<label
				id={labelId}
				className={clsx(styles.field__label, hideLabel && styles["sr-only"])}
				htmlFor={fieldId}
			>
				<FootnoteText>{label}</FootnoteText>
				{required && (
					// Marqueur purement visuel : `required` porte déjà l'information pour
					// les lecteurs d'écran via `aria-required`.
					<span className={styles.field__required} aria-hidden="true">
						*
					</span>
				)}
			</label>

			<div className={boxClassName}>
				{leading}
				{children}
				{trailing}
			</div>

			{(showHint || errorMessage || footer) && (
				<div className={styles.field__footer}>
					{showHint && (
						<p className={styles.field__hint} id={hintId}>
							{hint}
						</p>
					)}
					{errorMessage && (
						// `<em>` + `role="alert"` : même motif que `SimulatorForm`, pour que
						// le message soit annoncé dès son apparition.
						<em className={styles.field__error} id={errorId} role="alert">
							<FootnoteText>{errorMessage}</FootnoteText>
						</em>
					)}
					{footer}
				</div>
			)}
		</div>
	);
};

export default Field;
