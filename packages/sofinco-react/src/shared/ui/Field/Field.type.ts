import type { ReactNode } from "react";

/**
 * Props shared by every control built on the `Field` shell — `TextField`,
 * `Textarea`, `Select`. They are declared once here so the three components
 * cannot drift apart on labelling, hint/error handling or styling hooks.
 */
export interface FieldOwnProps {
	/**
	 * Field label — required: it carries accessibility through `<label for>`.
	 * For a design with no visible label, keep the prop and pass `hideLabel`:
	 * the label stays available to screen readers.
	 */
	label: ReactNode;
	/**
	 * Hides the label visually without removing it from the accessibility tree.
	 * A `placeholder` is not a substitute: it disappears as soon as the user types.
	 */
	hideLabel?: boolean;
	/**
	 * Helper text shown below the control. Hidden while an `errorMessage` is
	 * displayed, so two competing messages never stack under the field.
	 */
	hint?: ReactNode;
	/**
	 * Error message. Its mere presence switches the field to its error state
	 * (danger fill and border, alert icon, `aria-invalid`): there is no separate
	 * `status` prop to keep in sync.
	 */
	errorMessage?: ReactNode;
	/**
	 * Switches to the error state without rendering a message below the field —
	 * for forms that collect their errors elsewhere (summary at the top of the
	 * page, tooltip). `errorMessage` already implies it: only set `invalid` when
	 * there is no message to render.
	 */
	invalid?: boolean;
	/** Class applied to the wrapper (label + box + message). */
	className?: string;
	/** Class applied to the bordered box (border, background, icons). */
	fieldClassName?: string;
	/** Class applied to the control element itself. */
	controlClassName?: string;
}
