import { useState } from "react";
import clsx from "clsx";

import Field, { fieldStyles, useField } from "@shared/ui/Field";
import { ICONS } from "@shared/ui/svg";

import type { TextareaProps } from "./Textarea.type";
import styles from "./textarea.module.css";

const AlertIcon = ICONS["circle-alert"];

const DEFAULT_ROWS = 4;

const Textarea = ({
	label,
	hideLabel = false,
	hint,
	errorMessage,
	invalid = false,
	rows = DEFAULT_ROWS,
	resize = "vertical",
	showCounter = false,
	className,
	fieldClassName,
	controlClassName,
	id,
	value,
	defaultValue,
	onChange,
	disabled,
	readOnly,
	required,
	maxLength,
	ref,
	"aria-describedby": describedBy,
	...textareaProps
}: TextareaProps) => {
	const { fieldId, hintId, errorId, hasError, showHint, ariaDescribedBy } = useField({
		id,
		hint,
		errorMessage,
		invalid,
		describedBy,
	});

	// Contrôlé en interne quand le consommateur ne fournit pas de `value` : le
	// compteur a besoin de la longueur courante à chaque frappe, ce qu'un champ
	// non contrôlé ne lui donnerait pas sans lire le DOM.
	const isControlled = value !== undefined;
	const [internalValue, setInternalValue] = useState(defaultValue ?? "");
	const currentValue = isControlled ? String(value ?? "") : internalValue;

	// Sans borne il n'y a rien à compter : on masque plutôt que d'afficher un
	// « 12 / undefined ».
	const counter = showCounter && maxLength !== undefined;

	// Pas de cadenas sur un champ désactivé : le grisé et l'attribut `disabled` du
	// `<textarea>` portent déjà l'état, l'icône ne faisait que le redire.
	const StatusIcon = hasError ? AlertIcon : null;

	return (
		<Field
			fieldId={fieldId}
			hintId={hintId}
			errorId={errorId}
			hasError={hasError}
			showHint={showHint}
			label={label}
			hideLabel={hideLabel}
			hint={hint}
			errorMessage={errorMessage}
			required={required}
			disabled={disabled}
			readOnly={readOnly}
			multiline
			className={className}
			fieldClassName={fieldClassName}
			trailing={
				StatusIcon && (
					<span
						className={clsx(
							fieldStyles.field__icon,
							hasError && !disabled && fieldStyles["field__icon--alert"],
						)}
						aria-hidden="true"
					>
						<StatusIcon />
					</span>
				)
			}
			footer={
				counter && (
					// `aria-hidden` : le compteur double une information que `maxLength`
					// donne déjà nativement, et son annonce à chaque frappe noierait la
					// saisie sous le bruit.
					<span className={fieldStyles.field__counter} aria-hidden="true">
						{currentValue.length} / {maxLength}
					</span>
				)
			}
		>
			<textarea
				{...textareaProps}
				ref={ref}
				id={fieldId}
				className={clsx(
					fieldStyles.field__control,
					styles.textarea,
					resize === "none" && styles["textarea--fixed"],
					controlClassName,
				)}
				rows={rows}
				value={currentValue}
				onChange={(event) => {
					if (!isControlled) setInternalValue(event.target.value);
					onChange?.(event);
				}}
				disabled={disabled}
				readOnly={readOnly}
				required={required}
				maxLength={maxLength}
				aria-invalid={hasError || undefined}
				aria-describedby={ariaDescribedBy}
			/>
		</Field>
	);
};

export default Textarea;
