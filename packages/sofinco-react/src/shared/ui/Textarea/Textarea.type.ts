import type { ComponentPropsWithRef } from "react";

import type { FieldOwnProps } from "@shared/ui/Field";

/**
 * Native props the consumer can actually drive. `defaultValue` is replaced by a
 * `string`-typed prop (see below), and `children` is dropped: a `<textarea>`
 * takes its value through `value`, never through its children.
 */
type NativeTextareaProps = Omit<
	ComponentPropsWithRef<"textarea">,
	"defaultValue" | "children" | "cols"
>;

export interface TextareaProps extends NativeTextareaProps, FieldOwnProps {
	/** Visible rows, i.e. the resting height. Defaults to 4. */
	rows?: number;
	/**
	 * Resize affordance. Defaults to `vertical` — the native corner grip, kept
	 * because it is the only way for a user to see a long answer in full.
	 * `none` locks the height for layouts that cannot absorb the growth.
	 */
	resize?: "none" | "vertical";
	/**
	 * Shows a `current / max` counter under the field. Requires `maxLength`:
	 * without an upper bound there is nothing to count against, and the counter
	 * is silently skipped.
	 */
	showCounter?: boolean;
	/** Initial value when uncontrolled. */
	defaultValue?: string;
}
