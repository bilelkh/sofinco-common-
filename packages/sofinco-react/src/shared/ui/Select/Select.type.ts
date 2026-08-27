import type { ReactNode } from "react";

import type { FieldOwnProps } from "@shared/ui/Field";
import type { IconKey } from "@shared/ui/svg";

export interface SelectOption {
	value: string;
	label: string;
	disabled?: boolean;
	/** Secondary line under the label, shown in the panel only. */
	description?: ReactNode;
	/** Icon before the label, shown in the panel only. */
	icon?: IconKey;
}

export interface SelectOptionGroup {
	label: string;
	options: SelectOption[];
}

export interface SelectProps extends FieldOwnProps {
	/** Flat option list. Rendered before any `groups`. */
	options?: SelectOption[];
	/** Options split into labelled groups, rendered after any flat `options`. */
	groups?: SelectOptionGroup[];
	/**
	 * Text shown while nothing is selected. Unlike a native `<select>`, no empty
	 * option is inserted — the placeholder renders the empty state, so it can
	 * never be picked by accident.
	 */
	placeholder?: string;
	/** Decorative icon at the start of the trigger, before the value. */
	icon?: IconKey;
	/** Selected value — controlled. Pair with `onValueChange`. */
	value?: string;
	/** Initial value when uncontrolled. */
	defaultValue?: string;
	/**
	 * Called with the new value. Not a DOM event: the panel is a listbox, not an
	 * `<input>`, so there is no `event.target.value` to read.
	 */
	onValueChange?: (value: string) => void;
	/**
	 * Name of the hidden native `<select>` submitted with the form. It carries
	 * the value from the very first server render, so a plain HTML form post
	 * works before — and without — hydration.
	 */
	name?: string;
	disabled?: boolean;
	required?: boolean;
	/** Field `id`; also the `<label for>` target. Derived from `useId` if absent. */
	id?: string;
	/** Additional ids appended to the trigger's `aria-describedby`. */
	"aria-describedby"?: string;
	/** Called when the panel opens or closes. */
	onOpenChange?: (open: boolean) => void;
}
