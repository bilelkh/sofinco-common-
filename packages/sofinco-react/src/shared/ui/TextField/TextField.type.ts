import type { ComponentPropsWithRef } from "react";

import type { FieldOwnProps } from "@shared/ui/Field";
import type { IconKey } from "@shared/ui/svg";
import type { MaskConfig, MaskName } from "@shared/utils/mask";

/**
 * Native props the consumer can actually drive. Removed:
 * - `size`, which collides with the HTML attribute of the same name (width in
 *   characters) — the DS does not expose it;
 * - `defaultValue`, replaced by a `string`-typed prop (see below);
 * - `children`, an `<input>` being a void element.
 */
type NativeInputProps = Omit<ComponentPropsWithRef<"input">, "size" | "defaultValue" | "children">;

export interface TextFieldProps extends NativeInputProps, FieldOwnProps {
	/** Decorative icon at the start of the field, before the input area. */
	icon?: IconKey;
	/**
	 * Decorative icon at the end of the field, for cases the component's own
	 * states do not cover. The trailing slot holds a single element at a time,
	 * in this priority order: alert (error) › clear button (filled) ›
	 * `trailingIcon`.
	 */
	trailingIcon?: IconKey;
	/**
	 * Shows a clear button as soon as the field holds a value.
	 *
	 * Uncontrolled, the component empties the value itself. Controlled (`value`
	 * provided), it is the parent's job to do so from `onClear`: the component
	 * never fabricates a synthetic `change` event.
	 */
	clearable?: boolean;
	/** Called after a click on the clear button. */
	onClear?: () => void;
	/**
	 * `aria-label` for the clear button. Defaults to "Effacer le champ" — end-user
	 * copy stays French, the language the sites ship in; only the documentation
	 * is in English.
	 */
	clearLabel?: string;
	/** Initial value when uncontrolled. */
	defaultValue?: string;
	/**
	 * Input mask applied **to the display only** — a DS preset name (`"phone"`,
	 * `"siret"`) or a template of your own (`{ mask: "__/__/____", replacement: { _: /\d/ } }`).
	 *
	 * `value`, `defaultValue` and `onValueChange` all stay bare: the separators
	 * never reach the stored value, so validation rules (`/^\d{14}$/`) and
	 * downstream services keep seeing digits only.
	 *
	 * Backed by `@react-input/mask`, which owns caret placement, backspace over a
	 * separator and paste. Two consequences worth knowing: the template already
	 * bounds the field, so a `maxLength` of your own is dropped (it would count
	 * separators), and `type` must stay one of `text`, `email`, `tel`, `search` or
	 * `url` — the library refuses to mask anything else and says so in the console.
	 */
	mask?: MaskName | MaskConfig;
	/**
	 * Receives the value to store on every keystroke: the typed text, or — on a
	 * masked field — the bare value, without the separators shown.
	 *
	 * Complements `onChange`, which stays the native event: on a masked field
	 * `event.target.value` carries the *grouped* text, not the value. Prefer this
	 * one whenever a mask is in play.
	 */
	onValueChange?: (value: string) => void;
}
