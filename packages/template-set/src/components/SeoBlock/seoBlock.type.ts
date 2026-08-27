/**
 * Server-side (edit-mode preview) prop contract for `<SeoBlockServer>`.
 *
 * Minimal shape : only the flags needed by the preview banner (which
 * required fields are empty). The live DS component `<SeoBlock>` is
 * rendered separately from its own `SeoBlockProps` (mapped via
 * `mapSeoBlockProps`) so this contract does NOT duplicate the DS shape.
 *
 * Populated by `mapSeoBlockServerProps` — single source of truth for the
 * "field is empty" decisions the preview relies on.
 */
export interface SeoBlockServerProps {
	/**
	 * True when `jcr:title` is empty — the only mandatory field on the CND.
	 *
	 * `content` is deliberately absent : the rich text is optional (a
	 * title-only block is a valid contribution), so its emptiness must never
	 * raise a missing-field warning.
	 */
	missingTitle: boolean;
}
