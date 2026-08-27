import { useRef, useState } from "react";
import clsx from "clsx";
import { useMask } from "@react-input/mask";

import Field, { fieldStyles, useField } from "@shared/ui/Field";
import { useIsomorphicLayoutEffect } from "@shared/hooks/useIsomorphicLayoutEffect";
import { ICONS } from "@shared/ui/svg";
import { applyMask, resolveMask, unmask } from "@shared/utils/mask";

import type { TextFieldProps } from "./TextField.type";

const AlertIcon = ICONS["circle-alert"];
const ClearIcon = ICONS.x;

const DEFAULT_CLEAR_LABEL = "Effacer le champ";

const TextField = ({
	label,
	hideLabel = false,
	hint,
	errorMessage,
	invalid = false,
	icon,
	trailingIcon,
	clearable = false,
	onClear,
	clearLabel = DEFAULT_CLEAR_LABEL,
	mask,
	onValueChange,
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
	ref,
	"aria-describedby": describedBy,
	...inputProps
}: TextFieldProps) => {
	const { fieldId, hintId, errorId, hasError, showHint, ariaDescribedBy } = useField({
		id,
		hint,
		errorMessage,
		invalid,
		describedBy,
	});

	// L'input est toujours rendu contrôlé, y compris quand le consommateur ne
	// fournit pas de `value` : c'est ce qui permet au bouton « effacer » de vider
	// le champ sans écrire dans le DOM à la main. `defaultValue` n'amorce donc
	// que l'état interne et n'est jamais transmis à l'`<input>`.
	const isControlled = value !== undefined;
	const [internalValue, setInternalValue] = useState(defaultValue ?? "");
	const currentValue = isControlled ? String(value ?? "") : internalValue;

	/*
	 * Champ masqué : la valeur manipulée reste NUE (chiffres seuls), les
	 * séparateurs n'existent qu'à l'écran. C'est ce qui laisse les règles de
	 * validation et les services aval travailler sur `0612345678` pendant que
	 * l'utilisateur lit `06 12 34 56 78`.
	 */
	const maskConfig = mask ? resolveMask(mask) : null;
	// `applyMask` (et non `unmask`) sur la valeur reçue : elle est nue, et
	// `unformat` mangerait un chiffre sur trois en la prenant pour du texte groupé.
	const displayValue = maskConfig ? applyMask(currentValue, maskConfig) : currentValue;

	/*
	 * `useMask` s'accroche à l'`<input>` par un `ref` : il corrige la valeur du DOM
	 * et replace le caret à chaque frappe, sans posséder ni la valeur ni le rendu —
	 * la coquille `Field` reste donc intacte. Le hook est appelé à tous les rendus
	 * (règle des hooks) ; c'est le `ref` qui n'est branché que sur un champ masqué.
	 */
	// Le `ref` rendu est typé non-nullable ; on le relâche ici plutôt qu'à chaque
	// affectation, `null` étant précisément ce qui désenregistre le masque.
	const maskRef = useMask(maskConfig ?? {}) as React.MutableRefObject<HTMLInputElement | null>;

	const inputRef = useRef<HTMLInputElement | null>(null);
	const setInputRef = (node: HTMLInputElement | null) => {
		inputRef.current = node;
		// Le `ref` de `useMask` est un proxy : l'affectation (dés)enregistre le
		// masque sur l'élément. `null` hors masque, pour qu'un champ qui perd son
		// masque ne reste pas enregistré.
		maskRef.current = maskConfig ? node : null;
		if (typeof ref === "function") ref(node);
		else if (ref) ref.current = node;
	};

	/*
	 * Caret laissé par la bibliothèque, à réappliquer après le rendu.
	 *
	 * La bibliothèque le place correctement, mais un `<input>` CONTRÔLÉ le perd
	 * aussitôt : React réécrit la valeur du DOM pendant l'évènement (il y remet
	 * encore l'ancienne, `onValueChange` n'ayant pas fini de remonter), et toute
	 * affectation de `value` renvoie le caret en fin de champ. Invisible tant qu'on
	 * tape à la fin — c'est justement là que le caret devait aller — mais une
	 * insertion au milieu sautait à la fin à chaque frappe.
	 *
	 * On ne recalcule rien : la chaîne masquée est la même avant et après le rendu,
	 * l'index de caractère est donc encore exact.
	 */
	const caretRef = useRef<number | null>(null);

	useIsomorphicLayoutEffect(() => {
		const input = inputRef.current;
		const caret = caretRef.current;
		if (!maskConfig || !input || caret === null) return;

		caretRef.current = null;
		if (input.selectionStart !== caret) input.setSelectionRange(caret, caret);
	});

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		// La valeur du DOM a déjà été masquée par la bibliothèque : `unmask` y est à
		// sa place, elle ne l'est nulle part ailleurs.
		const next = maskConfig ? unmask(event.target.value, maskConfig) : event.target.value;
		if (maskConfig) caretRef.current = event.target.selectionStart;

		if (!isControlled) setInternalValue(next);
		onChange?.(event);
		onValueChange?.(next);
	};

	// Un champ désactivé ou en lecture seule n'est pas effaçable : le bouton
	// serait actionnable au clavier alors que la valeur, elle, ne l'est pas.
	const showClear = clearable && currentValue !== "" && !disabled && !readOnly && !hasError;

	const LeadingIcon = icon ? ICONS[icon] : null;
	// La fin de champ n'accueille qu'un élément : l'alerte signale l'erreur, et le
	// bouton « effacer » ne réapparaît qu'une fois celle-ci écartée. `trailingIcon`
	// ne sert que le reste du temps.
	//
	// L'état désactivé ne pose plus de cadenas : il est déjà porté par le grisé du
	// champ et par l'attribut `disabled` de l'`<input>`, que les technologies
	// d'assistance annoncent. L'icône n'ajoutait rien et mangeait la fin de champ.
	const TrailingIcon = hasError
		? AlertIcon
		: !showClear && trailingIcon
			? ICONS[trailingIcon]
			: null;

	const handleClear = () => {
		if (!isControlled) setInternalValue("");
		onClear?.();
		onValueChange?.("");
		// Le bouton disparaît avec la valeur : sans ça le focus retomberait sur le
		// <body> et la navigation clavier repartirait du début du document.
		inputRef.current?.focus();
	};

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
			className={className}
			fieldClassName={fieldClassName}
			leading={
				LeadingIcon && (
					<span className={fieldStyles.field__icon} aria-hidden="true">
						<LeadingIcon />
					</span>
				)
			}
			trailing={
				<>
					{showClear && (
						<button
							type="button"
							className={fieldStyles.field__clear}
							onClick={handleClear}
							aria-label={clearLabel}
						>
							<ClearIcon />
						</button>
					)}
					{TrailingIcon && (
						<span
							className={clsx(
								fieldStyles.field__icon,
								hasError && !disabled && fieldStyles["field__icon--alert"],
							)}
							aria-hidden="true"
						>
							<TrailingIcon />
						</span>
					)}
				</>
			}
		>
			<input
				{...inputProps}
				ref={setInputRef}
				id={fieldId}
				className={clsx(fieldStyles.field__control, controlClassName)}
				value={displayValue}
				onChange={handleChange}
				// Le gabarit borne déjà la saisie : un `maxLength` par-dessus compterait
				// les séparateurs — qu'un collage `+33 6 12 34 56 78` ferait déborder — et
				// tronquerait le texte AVANT que la bibliothèque ne le voie.
				maxLength={maskConfig ? undefined : inputProps.maxLength}
				disabled={disabled}
				readOnly={readOnly}
				required={required}
				aria-invalid={hasError || undefined}
				aria-describedby={ariaDescribedBy}
			/>
		</Field>
	);
};

export default TextField;
