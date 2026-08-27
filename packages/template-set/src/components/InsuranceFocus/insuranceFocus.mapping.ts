import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { InsuranceFocusProps } from "sofinco-react";
import { str, imgUrl } from "#lib/jcr";
import { getRequiredCtaProps } from "#lib/cta";
import { buildTitleProps } from "../Shared/HeadingStyle/headingStyle.mapping";
import type { InsuranceFocusServerProps } from "./insuranceFocus.type";

/**
 * Maps `sofnt:insuranceFocus` JCR node to the `<InsuranceFocus>` DS props.
 */
export function mapInsuranceFocusProps(node: JCRNodeWrapper): InsuranceFocusProps {
	const titleText = str(node, "jcr:title");

	return {
		title: buildTitleProps(node, titleText, "h2") ?? {
			children: titleText,
			as: "h2",
			visualStyle: "h2",
		},
		description: str(node, "description"),
		imageSrc: imgUrl(node, "image"),
		imageAlt: str(node, "imageAlt"),
		cta: getRequiredCtaProps(node, "insurance-focus", "accent"),
	};
}

/**
 * Maps `sofnt:insuranceFocus` DS props to `<InsuranceFocusServer>` props
 * (edit-mode preview flags).
 *
 * **Full DRY** : reads exclusively from the already-computed `dsProps`, no
 * raw JCR access. The banner's "field is empty" decisions are anchored on
 * the same shape the DS renders → structural invariant : ce que voit le
 * contributeur dans le preview = ce que juge la bannière.
 *
 * **Trade-off CTA** : the label check is dropped intentionally. The
 * `getRequiredCtaProps` chain fallbacks to the internal node's title, then
 * to `"En savoir plus"`, so `dsProps.cta.label` is always truthy. `missingCta`
 * signals only the structurally broken case (no resolvable target). A label
 * left blank at contribution → visible in the preview render (`"En savoir
 * plus"` on the button) but no banner. Editorial quality is enforced by the
 * form-level `mandatory` on `ctaLabel`, not by this preview.
 */
export function mapInsuranceFocusServerProps(
	dsProps: InsuranceFocusProps,
): InsuranceFocusServerProps {
	return {
		missingTitle: !dsProps.title.children,
		missingDescription: !dsProps.description,
		missingImage: !dsProps.imageSrc,
		missingCta: !dsProps.cta.href,
	};
}
