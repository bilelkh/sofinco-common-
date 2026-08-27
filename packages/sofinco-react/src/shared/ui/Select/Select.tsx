import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import { FootnoteText } from "@shared/footnotes";
import Field, { fieldStyles, useField } from "@shared/ui/Field";
import { ICONS } from "@shared/ui/svg";

import type { SelectOption, SelectProps } from "./Select.type";
import { findEnabled, useTypeahead } from "./useSelectKeyboard";
import styles from "./select.module.css";

const ChevronIcon = ICONS["chevron-down"];
const CheckIcon = ICONS.check;

/** Une entrée du panneau : soit un intitulé de groupe, soit une option. */
type Row =
	| { kind: "group"; label: string; key: string }
	| { kind: "option"; option: SelectOption; index: number };

const Select = ({
	label,
	hideLabel = false,
	hint,
	errorMessage,
	invalid = false,
	options,
	groups,
	placeholder,
	icon,
	className,
	fieldClassName,
	controlClassName,
	id,
	value,
	defaultValue,
	onValueChange,
	onOpenChange,
	name,
	disabled,
	required,
	"aria-describedby": describedBy,
}: SelectProps) => {
	const { fieldId, labelId, hintId, errorId, hasError, showHint, ariaDescribedBy } = useField({
		id,
		hint,
		errorMessage,
		invalid,
		describedBy,
	});

	const isControlled = value !== undefined;
	const [internalValue, setInternalValue] = useState(defaultValue ?? "");
	const currentValue = isControlled ? String(value ?? "") : internalValue;

	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);

	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// Les options à plat pilotent le clavier (index contigus, groupes ignorés) ;
	// `rows` porte l'ordre d'affichage, intitulés de groupes compris. Deux vues
	// d'une même source, pour ne pas avoir à sauter les en-têtes à la flèche.
	const { flat, rows } = useMemo(() => {
		const flatList: SelectOption[] = [];
		const rowList: Row[] = [];

		for (const option of options ?? []) {
			rowList.push({ kind: "option", option, index: flatList.length });
			flatList.push(option);
		}
		for (const group of groups ?? []) {
			rowList.push({ kind: "group", label: group.label, key: group.label });
			for (const option of group.options) {
				rowList.push({ kind: "option", option, index: flatList.length });
				flatList.push(option);
			}
		}

		return { flat: flatList, rows: rowList };
	}, [options, groups]);

	const typeahead = useTypeahead(flat);

	const selectedIndex = flat.findIndex((option) => option.value === currentValue);
	const selectedOption = selectedIndex >= 0 ? flat[selectedIndex] : undefined;

	const listboxId = `${fieldId}-listbox`;
	const optionId = (index: number) => `${fieldId}-option-${index}`;

	const setOpenState = (next: boolean) => {
		setOpen(next);
		onOpenChange?.(next);
	};

	const openPanel = (index: number) => {
		if (disabled) return;
		setActiveIndex(index >= 0 ? index : findEnabled(flat, 0, 1));
		setOpenState(true);
	};

	const closePanel = () => {
		setOpenState(false);
		setActiveIndex(-1);
	};

	const commit = (index: number) => {
		const option = flat[index];
		if (!option || option.disabled) return;
		if (!isControlled) setInternalValue(option.value);
		onValueChange?.(option.value);
		closePanel();
		// Le panneau disparaît : sans ce rappel, le focus retomberait sur le <body>
		// et la navigation clavier repartirait du début du document.
		triggerRef.current?.focus();
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

	// Maintient l'option active visible pendant la navigation au clavier — sans
	// ça, la sélection sort du cadre dès que la liste défile.
	useEffect(() => {
		if (!open || activeIndex < 0) return;
		listRef.current
			?.querySelector(`#${CSS.escape(optionId(activeIndex))}`)
			?.scrollIntoView({ block: "nearest" });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, activeIndex]);

	const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		if (disabled) return;

		const { key } = event;

		if (!open) {
			if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") {
				event.preventDefault();
				openPanel(selectedIndex);
				return;
			}
			// Une lettre sur un champ fermé change la valeur sans ouvrir la liste,
			// exactement comme le contrôle natif.
			if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
				const found = typeahead(key, selectedIndex);
				if (found >= 0) {
					event.preventDefault();
					commit(found);
				}
			}
			return;
		}

		switch (key) {
			case "ArrowDown": {
				event.preventDefault();
				const next = findEnabled(flat, activeIndex + 1, 1);
				if (next >= 0) setActiveIndex(next);
				break;
			}
			case "ArrowUp": {
				event.preventDefault();
				const previous = findEnabled(flat, activeIndex - 1, -1);
				if (previous >= 0) setActiveIndex(previous);
				break;
			}
			case "Home": {
				event.preventDefault();
				setActiveIndex(findEnabled(flat, 0, 1));
				break;
			}
			case "End": {
				event.preventDefault();
				setActiveIndex(findEnabled(flat, flat.length - 1, -1));
				break;
			}
			case "Enter":
			case " ": {
				event.preventDefault();
				commit(activeIndex);
				break;
			}
			case "Escape": {
				event.preventDefault();
				closePanel();
				break;
			}
			case "Tab": {
				// On ne bloque pas le Tab : le panneau se referme et le focus part
				// normalement au champ suivant.
				closePanel();
				break;
			}
			default: {
				if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
					const found = typeahead(key, activeIndex);
					if (found >= 0) {
						event.preventDefault();
						setActiveIndex(found);
					}
				}
			}
		}
	};

	const LeadingIcon = icon ? ICONS[icon] : null;
	// Le chevron est l'affordance du contrôle : il ne bouge pas. Ni l'erreur, où le
	// champ reste manipulable, ni l'état désactivé — que le grisé et l'attribut
	// `disabled` annoncent déjà — ne viennent le remplacer.
	const TrailingIcon = ChevronIcon;

	return (
		<div className={styles.select} ref={rootRef}>
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
				className={className}
				// Icônes et valeur vivent toutes dans le bouton : c'est ce qui rend
				// toute la surface du champ cliquable. La boîte ne garde donc ni
				// padding ni slots — elle n'est plus qu'une bordure.
				fieldClassName={clsx(fieldClassName, styles.select__box)}
			>
				{/*
				 * Motif « select-only combobox » (WAI-ARIA APG) : le focus ne quitte
				 * jamais le déclencheur, l'option courante est désignée par
				 * `aria-activedescendant`. Déplacer le focus dans la liste obligerait
				 * à le restaurer à la fermeture, et casse les lecteurs d'écran qui
				 * lisent alors le conteneur plutôt que le champ.
				 */}
				<button
					ref={triggerRef}
					type="button"
					id={fieldId}
					role="combobox"
					className={clsx(styles.select__trigger, controlClassName)}
					disabled={disabled}
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-controls={open ? listboxId : undefined}
					aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
					aria-required={required || undefined}
					aria-invalid={hasError || undefined}
					aria-describedby={ariaDescribedBy}
					onClick={() => (open ? closePanel() : openPanel(selectedIndex))}
					onKeyDown={onKeyDown}
				>
					{LeadingIcon && (
						<span className={fieldStyles.field__icon} aria-hidden="true">
							<LeadingIcon />
						</span>
					)}
					<span
						className={clsx(
							styles.select__value,
							!selectedOption && styles["select__value--placeholder"],
						)}
					>
						{selectedOption ? selectedOption.label : placeholder}
					</span>
					<span
						className={clsx(fieldStyles.field__icon, styles.select__chevron)}
						data-open={open || undefined}
						aria-hidden="true"
					>
						<TrailingIcon />
					</span>
				</button>
			</Field>

			{open && (
				<div
					ref={listRef}
					id={listboxId}
					role="listbox"
					aria-labelledby={labelId}
					className={styles.select__panel}
					tabIndex={-1}
				>
					{rows.map((row) =>
						row.kind === "group" ? (
							<div key={`group-${row.key}`} className={styles.select__group} role="presentation">
								<FootnoteText>{row.label}</FootnoteText>
							</div>
						) : (
							<SelectItem
								key={row.option.value}
								id={optionId(row.index)}
								option={row.option}
								selected={row.index === selectedIndex}
								active={row.index === activeIndex}
								onSelect={() => commit(row.index)}
								onHover={() => !row.option.disabled && setActiveIndex(row.index)}
							/>
						),
					)}
				</div>
			)}

			{/*
			 * Champ natif caché — la raison d'être de ce bloc : il porte la valeur
			 * dès le rendu serveur, donc un POST/GET HTML passe sans qu'aucun
			 * JavaScript n'ait tourné. C'est ce que `SimulatorForm` attend, et ce
			 * qu'une implémentation en listbox seule aurait perdu.
			 *
			 * Positionné sur le champ plutôt que déporté : la bulle de validation
			 * native (`required`) s'ancre ainsi au bon endroit.
			 */}
			{name && (
				<select
					className={styles.select__native}
					name={name}
					value={currentValue}
					required={required}
					disabled={disabled}
					aria-hidden="true"
					tabIndex={-1}
					// Le contrôle réel est le combobox ci-dessus ; ce miroir n'est jamais
					// manipulé directement, mais React exige un `onChange` sur un champ
					// contrôlé.
					onChange={() => {}}
				>
					<option value="" />
					{flat.map((option) => (
						<option key={option.value} value={option.value}>
							{/* Miroir natif, jamais affiché : `<option>` n'accepte que du texte brut, le
							    `<sup>`/`<a>` d'un renvoi y serait du balisage invalide. Le renvoi cliquable
							    est porté par le panneau ARIA visible (cf. `SelectItem`). */}
							{/* eslint-disable-next-line sofinco/require-footnote-text */}
							{option.label}
						</option>
					))}
				</select>
			)}
		</div>
	);
};

type SelectItemProps = {
	id: string;
	option: SelectOption;
	selected: boolean;
	active: boolean;
	onSelect: () => void;
	onHover: () => void;
};

const SelectItem = ({ id, option, selected, active, onSelect, onHover }: SelectItemProps) => {
	const OptionIcon = option.icon ? ICONS[option.icon] : null;

	return (
		<div
			id={id}
			role="option"
			aria-selected={selected}
			aria-disabled={option.disabled || undefined}
			// `data-active` couvre le survol ET la navigation clavier : une seule
			// règle CSS, là où `:hover` et un état de focus auraient divergé.
			data-active={active || undefined}
			data-selected={selected || undefined}
			data-disabled={option.disabled || undefined}
			className={styles.select__option}
			// `onMouseDown` plutôt que `onClick` : le `pointerdown` de fermeture
			// extérieure se déclenche en premier et le clic n'arriverait jamais.
			onMouseDown={(event) => {
				event.preventDefault();
				if (!option.disabled) onSelect();
			}}
			onMouseEnter={onHover}
		>
			{OptionIcon && (
				<span className={styles.select__option__icon} aria-hidden="true">
					<OptionIcon />
				</span>
			)}
			<span className={styles.select__option__body}>
				<span className={styles.select__option__label}>
					<FootnoteText>{option.label}</FootnoteText>
				</span>
				{option.description && (
					<span className={styles.select__option__description}>
						<FootnoteText>{option.description}</FootnoteText>
					</span>
				)}
			</span>
			{selected && (
				<span className={styles.select__option__check} aria-hidden="true">
					<CheckIcon />
				</span>
			)}
		</div>
	);
};

export default Select;
