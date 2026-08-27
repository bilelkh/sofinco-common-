import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

import { FootnoteText } from "@shared/footnotes";
import Field, { fieldStyles, useField } from "@shared/ui/Field";
import { findEnabled } from "@shared/ui/Select/useSelectKeyboard";
import { ICONS } from "@shared/ui/svg";

import type { AutocompleteOption, AutocompleteProps } from "./Autocomplete.type";
import { useAutocompleteSearch } from "./useAutocompleteSearch";
import styles from "./autocomplete.module.css";

const CheckIcon = ICONS.check;
const ClearIcon = ICONS.x;
const LoaderIcon = ICONS.loader;

const DEFAULT_LABELS = {
	loading: "Recherche en cours…",
	empty: "Aucun résultat",
	error: "La recherche est indisponible. Réessayez dans un instant.",
	minLength: "Saisissez au moins {n} caractères.",
	clear: "Effacer le champ",
};

/**
 * Champ de saisie adossé à une recherche distante — motif « combobox with list
 * autocomplete » des WAI-ARIA APG.
 *
 * Il diffère de `Select` sur le point qui compte : le contrôle est un `<input>`
 * et non un `<button>`, parce qu'il faut pouvoir y taper. Le focus n'en sort
 * jamais pour autant, l'option courante restant désignée par
 * `aria-activedescendant` — c'est ce qui permet aux flèches de parcourir la
 * liste sans que le lecteur d'écran perde le champ.
 *
 * **Il se présente comme un `TextField`, pas comme un `Select` :** pas de
 * chevron en fin de champ. La fin de champ n'accueille que le fileur d'attente
 * et le bouton d'effacement, exactement comme dans `TextField`. Un chevron
 * promet une liste qu'on déplie ; ici il n'y a rien à déplier tant que rien
 * n'est tapé, et il détournait les clics vers un geste qui n'ouvre aucun
 * panneau utile.
 *
 * La liste n'est jamais locale : elle est le résultat de `onSearch`. Le
 * composant ne filtre donc rien lui-même, et n'a aucune idée de ce que la
 * source considère comme une correspondance.
 */
const Autocomplete = ({
	label,
	hideLabel = false,
	hint,
	errorMessage,
	invalid = false,
	onSearch,
	value,
	onValueChange,
	defaultLabel = "",
	minLength = 1,
	debounceMs = 250,
	icon,
	clearable = true,
	labels,
	name,
	placeholder,
	disabled,
	required,
	readOnly,
	id,
	className,
	fieldClassName,
	controlClassName,
	"aria-describedby": describedBy,
	onBlur,
	onOpenChange,
	panelFooter,
}: AutocompleteProps) => {
	const { fieldId, labelId, hintId, errorId, hasError, showHint, ariaDescribedBy } = useField({
		id,
		hint,
		errorMessage,
		invalid,
		describedBy,
	});

	const text = { ...DEFAULT_LABELS, ...labels };

	/*
	 * Deux textes, et non un seul : `query` est ce qui s'affiche et se tape,
	 * `committedLabel` ce que le champ doit retrouver si la saisie est
	 * abandonnée. Les confondre ferait de toute frappe non validée une
	 * modification de la valeur retenue.
	 */
	const [query, setQuery] = useState(defaultLabel);
	const [committedLabel, setCommittedLabel] = useState(defaultLabel);
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);

	const rootRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Tant que la saisie n'est que le libellé déjà retenu, il n'y a rien à
	// chercher : rouvrir un champ rempli ne doit pas provoquer d'appel réseau
	// dont le seul résultat serait l'option déjà choisie.
	const searchEnabled = open && !readOnly && !disabled && query !== committedLabel;

	const { options, status } = useAutocompleteSearch({
		query,
		onSearch,
		minLength,
		debounceMs,
		enabled: searchEnabled,
	});

	const listboxId = `${fieldId}-listbox`;
	const optionId = (index: number) => `${fieldId}-option-${index}`;

	/*
	 * La première option devient active dès que la liste change : c'est ce qui rend
	 * « taper puis Entrée » possible sans passer par les flèches.
	 *
	 * `options` vient d'une recherche asynchrone, pas du rendu : l'index actif ne peut
	 * donc pas être dérivé pendant celui-ci. Il reste par ailleurs modifiable au clavier,
	 * ce n'est pas une valeur calculée mais un état dont l'effet fixe le point de départ.
	 */
	useEffect(() => {
		// eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
		setActiveIndex(options.length > 0 ? findEnabled(options, 0, 1) : -1);
	}, [options]);

	const setOpenState = (next: boolean) => {
		setOpen(next);
		onOpenChange?.(next);
	};

	const closePanel = () => {
		setOpenState(false);
		setActiveIndex(-1);
	};

	const commit = (index: number) => {
		const option = options[index];
		if (!option || option.disabled) return;
		setQuery(option.label);
		setCommittedLabel(option.label);
		onValueChange?.(option.value, option);
		closePanel();
	};

	const clear = () => {
		setQuery("");
		setCommittedLabel("");
		onValueChange?.("", undefined);
		closePanel();
		// Le bouton disparaît avec la valeur : sans ce rappel le focus retomberait
		// sur le <body> et la navigation clavier repartirait du document.
		inputRef.current?.focus();
	};

	/*
	 * Sortie de champ : le texte est réaligné sur la dernière option retenue.
	 * Une saisie libre laissée telle quelle donnerait un champ qui affiche
	 * « ANTON » alors que la valeur soumise vaut « 92160 » — ou pire, plus rien.
	 */
	const handleBlur = () => {
		if (query !== committedLabel) setQuery(committedLabel);
		closePanel();
		onBlur?.();
	};

	// Fermeture au clic extérieur. `pointerdown` et non `click` : un clic dont le
	// press commence dehors et le release dedans ne doit pas rouvrir le panneau.
	useEffect(() => {
		if (!open) return;

		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) closePanel();
		};

		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (disabled || readOnly) return;

		switch (event.key) {
			case "ArrowDown": {
				event.preventDefault();
				if (!open) {
					setOpenState(true);
					return;
				}
				const next = findEnabled(options, activeIndex + 1, 1);
				if (next >= 0) setActiveIndex(next);
				break;
			}
			case "ArrowUp": {
				event.preventDefault();
				const previous = findEnabled(options, activeIndex - 1, -1);
				if (previous >= 0) setActiveIndex(previous);
				break;
			}
			case "Home": {
				if (!open) return;
				event.preventDefault();
				setActiveIndex(findEnabled(options, 0, 1));
				break;
			}
			case "End": {
				if (!open) return;
				event.preventDefault();
				setActiveIndex(findEnabled(options, options.length - 1, -1));
				break;
			}
			case "Enter": {
				// Seulement quand une option est désignée : sinon la touche doit
				// rester au formulaire, qui la traite comme une soumission.
				if (open && activeIndex >= 0) {
					event.preventDefault();
					commit(activeIndex);
				}
				break;
			}
			case "Escape": {
				if (!open) return;
				event.preventDefault();
				setQuery(committedLabel);
				closePanel();
				break;
			}
			case "Tab": {
				// Le Tab n'est pas bloqué : le panneau se referme et le focus part
				// normalement au champ suivant.
				closePanel();
				break;
			}
		}
	};

	const showClear = clearable && query !== "" && !disabled && !readOnly;
	const LeadingIcon = icon ? ICONS[icon] : null;
	const tooShort = query.trim().length < minLength;

	return (
		<div className={styles.autocomplete} ref={rootRef}>
			<Field
				fieldId={fieldId}
				labelId={labelId}
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
						{/* Le fileur ne remplace pas le bouton d'effacement : il vit à côté,
						    sinon la cible de clic sauterait sous le doigt à chaque frappe. */}
						{status === "loading" && (
							<span
								className={clsx(fieldStyles.field__icon, styles.autocomplete__spinner)}
								aria-hidden="true"
							>
								<LoaderIcon />
							</span>
						)}
						{showClear && (
							<button
								type="button"
								className={fieldStyles.field__clear}
								onClick={clear}
								// `onMouseDown` neutralisé : sans ça le champ perdrait le focus
								// avant le clic, `handleBlur` refermerait le panneau et le clic
								// n'atteindrait jamais le bouton.
								onMouseDown={(event) => event.preventDefault()}
								aria-label={text.clear}
							>
								<ClearIcon />
							</button>
						)}
					</>
				}
			>
				<input
					ref={inputRef}
					id={fieldId}
					type="text"
					role="combobox"
					className={clsx(fieldStyles.field__control, controlClassName)}
					value={query}
					placeholder={placeholder}
					disabled={disabled}
					readOnly={readOnly}
					required={required}
					// La liste est le résultat d'une recherche, jamais une complétion
					// insérée dans le champ : `list`, et non `both` ni `inline`.
					aria-autocomplete="list"
					aria-expanded={open}
					aria-controls={open ? listboxId : undefined}
					aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
					aria-required={required || undefined}
					aria-invalid={hasError || undefined}
					aria-describedby={ariaDescribedBy}
					// L'autocomplétion du navigateur doublerait le panneau d'une seconde
					// liste, rendue par-dessus et hors de notre contrôle.
					autoComplete="off"
					onChange={(event) => {
						setQuery(event.target.value);
						if (!open) setOpenState(true);
					}}
					onKeyDown={onKeyDown}
					onBlur={handleBlur}
					// Un champ déjà rempli s'ouvre sur sa sélection : le texte est
					// présélectionné, la première frappe repart donc d'une saisie vierge.
					onFocus={(event) => {
						if (committedLabel !== "" && query === committedLabel) event.target.select();
					}}
				/>
			</Field>

			{open && (
				<div
					id={listboxId}
					role="listbox"
					aria-labelledby={labelId}
					className={styles.autocomplete__panel}
				>
					{tooShort ? (
						<p className={styles.autocomplete__message} role="presentation">
							{text.minLength.replace("{n}", String(minLength))}
						</p>
					) : status === "loading" ? (
						<p className={styles.autocomplete__message} role="presentation">
							{text.loading}
						</p>
					) : status === "error" ? (
						<p
							className={clsx(styles.autocomplete__message, styles["autocomplete__message--error"])}
							role="presentation"
						>
							{text.error}
						</p>
					) : options.length === 0 ? (
						<p className={styles.autocomplete__message} role="presentation">
							{text.empty}
						</p>
					) : (
						options.map((option, index) => (
							<AutocompleteItem
								key={option.value + option.label}
								id={optionId(index)}
								option={option}
								selected={option.label === committedLabel}
								active={index === activeIndex}
								onSelect={() => commit(index)}
								onHover={() => !option.disabled && setActiveIndex(index)}
							/>
						))
					)}
					{panelFooter && <div className={styles.autocomplete__footer}>{panelFooter}</div>}
				</div>
			)}

			{/*
			 * Miroir caché : il porte la valeur — le code, pas le libellé affiché —
			 * dans une soumission HTML classique. `type="hidden"` et non un champ
			 * réduit à zéro comme celui de `Select` : la recherche exigeant déjà
			 * JavaScript, il n'y a pas de parcours sans lui à préserver, et donc pas
			 * de bulle de validation native à ancrer.
			 */}
			{name && <input type="hidden" name={name} value={value ?? ""} />}
		</div>
	);
};

type AutocompleteItemProps = {
	id: string;
	option: AutocompleteOption;
	selected: boolean;
	active: boolean;
	onSelect: () => void;
	onHover: () => void;
};

const AutocompleteItem = ({
	id,
	option,
	selected,
	active,
	onSelect,
	onHover,
}: AutocompleteItemProps) => {
	const OptionIcon = option.icon ? ICONS[option.icon] : null;

	return (
		<div
			id={id}
			role="option"
			aria-selected={selected}
			aria-disabled={option.disabled || undefined}
			data-active={active || undefined}
			data-selected={selected || undefined}
			data-disabled={option.disabled || undefined}
			className={styles.autocomplete__option}
			// `onMouseDown` plutôt que `onClick` : le `blur` du champ partirait en
			// premier, refermerait le panneau, et le clic n'arriverait jamais.
			onMouseDown={(event) => {
				event.preventDefault();
				if (!option.disabled) onSelect();
			}}
			onMouseEnter={onHover}
		>
			{OptionIcon && (
				<span className={styles.autocomplete__option__icon} aria-hidden="true">
					<OptionIcon />
				</span>
			)}
			<span className={styles.autocomplete__option__body}>
				<span className={styles.autocomplete__option__label}>
					<FootnoteText>{option.label}</FootnoteText>
				</span>
				{option.description && (
					<span className={styles.autocomplete__option__description}>
						<FootnoteText>{option.description}</FootnoteText>
					</span>
				)}
			</span>
			{selected && (
				<span className={styles.autocomplete__option__check} aria-hidden="true">
					<CheckIcon />
				</span>
			)}
		</div>
	);
};

export default Autocomplete;
