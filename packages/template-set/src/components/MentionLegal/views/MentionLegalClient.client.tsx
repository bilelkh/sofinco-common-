import type { MentionLegalProps } from "sofinco-react";
import { MentionLegal } from "sofinco-react";

/**
 * Island bridge: re-exports the sofinco-react `MentionLegal` as a default-exported
 * function so the Vite plugin's `__filename` tagging resolves the correct bundle URL.
 */
export default function MentionLegalClient(props: MentionLegalProps) {
	return <MentionLegal {...props} />;
}
