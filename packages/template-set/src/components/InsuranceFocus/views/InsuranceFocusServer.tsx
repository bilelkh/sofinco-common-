import { InsuranceFocus } from "sofinco-react";
import type { InsuranceFocusProps } from "sofinco-react";
import MissingFieldsBanner, {
	type MissingField,
} from "../../Shared/MissingFieldsBanner/MissingFieldsBanner";
import type { InsuranceFocusServerProps } from "../insuranceFocus.type";
import classes from "./insuranceFocus.module.css";

interface Props {
	/** Live-view props of the DS component, rendered underneath the banner. */
	dsProps: InsuranceFocusProps;
	/** Missing-required-field flags for the preview banner. */
	serverProps: InsuranceFocusServerProps;
}

/**
 * Edit-mode preview for `sofnt:insuranceFocus`. Purely presentational.
 *
 * The DS component `<InsuranceFocus>` is rendered as-is so the contributor
 * sees a faithful WYSIWYG of the current state. When `jcr:title`,
 * `description`, `image` or the CTA target are empty (mandatory on the CND
 * / `sofmix:cta` mixin), a shared `<MissingFieldsBanner />` is shown above
 * pointing to the specific fields to fill.
 */
export default function InsuranceFocusServer({ dsProps, serverProps }: Props) {
	const { missingTitle, missingDescription, missingImage, missingCta } = serverProps;

	const missingFields: MissingField[] = [];
	if (missingTitle) {
		missingFields.push({
			label: "Titre",
			description: "renseignez le champ « Titre » du formulaire d'édition.",
		});
	}
	if (missingDescription) {
		missingFields.push({
			label: "Description",
			description: "renseignez le champ « Description ».",
		});
	}
	if (missingImage) {
		missingFields.push({
			label: "Image",
			description: "sélectionnez une image via le champ « Image » (picker Jahia).",
		});
	}
	if (missingCta) {
		missingFields.push({
			label: "CTA",
			description:
				"renseignez le libellé (« Libellé du bouton ») et sélectionnez une cible (interne ou externe) via le fieldset « Bouton d'action ».",
		});
	}

	return (
		<div className={classes.editPreview}>
			{missingFields.length > 0 && (
				<MissingFieldsBanner blockName="Focus assurance" fields={missingFields} />
			)}
			<InsuranceFocus {...dsProps} className="insurance-focus-block" />
		</div>
	);
}
