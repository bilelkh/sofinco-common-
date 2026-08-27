/**
 * Server-side (edit-mode preview) prop contract for `<InsuranceFocusServer>`.
 *
 * Minimal shape : only the flags needed by the preview banner (which
 * required fields are empty). The live DS component `<InsuranceFocus>` is
 * rendered separately from its own `InsuranceFocusProps` (mapped via
 * `mapInsuranceFocusProps`) so this contract does NOT duplicate the DS
 * shape.
 *
 * Populated by `mapInsuranceFocusServerProps` — single source of truth for
 * the "field is empty" decisions the preview relies on.
 */
export interface InsuranceFocusServerProps {
	/** True when `jcr:title` is empty (mix:title — heading of the block). */
	missingTitle: boolean;
	/** True when `description` is empty (mandatory field on the CND). */
	missingDescription: boolean;
	/** True when `image` weakreference is empty (mandatory field on the CND). */
	missingImage: boolean;
	/**
	 * True when the CTA is unusable — no `ctaLabel` contributed OR no
	 * resolvable target (neither `ctaInternalNode` nor `ctaExternalUrl` set,
	 * depending on the active `sofmix:cta` variant). The `sofmix:cta` mixin
	 * on `sofnt:insuranceFocus` makes the CTA mandatory : without it the
	 * whole block loses its call-to-action.
	 */
	missingCta: boolean;
}
