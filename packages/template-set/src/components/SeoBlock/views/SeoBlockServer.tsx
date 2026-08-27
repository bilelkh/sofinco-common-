import { SeoBlock } from "sofinco-react";
import type { SeoBlockProps } from "sofinco-react";
import MissingFieldsBanner, {
	type MissingField,
} from "../../Shared/MissingFieldsBanner/MissingFieldsBanner";
import type { SeoBlockServerProps } from "../seoBlock.type";
import classes from "./seoBlock.module.css";
import { clsx } from "clsx";

interface Props {
	/** Live-view props of the DS component, rendered underneath the banner. */
	dsProps: SeoBlockProps;
	/** Missing-required-field flags for the preview banner. */
	serverProps: SeoBlockServerProps;
}

/**
 * Edit-mode preview for `sofnt:seoBlock`. Purely presentational.
 *
 * The DS component `<SeoBlock>` is rendered as-is so the contributor sees a
 * faithful WYSIWYG of the current state. When `jcr:title` is empty (the only
 * mandatory field on the CND), a shared `<MissingFieldsBanner />` is shown
 * above pointing to the field to fill. `content` is optional — a title-only
 * block never triggers the banner.
 */
export default function SeoBlockServer({ dsProps, serverProps }: Props) {
	const { missingTitle } = serverProps;

	const missingFields: MissingField[] = [];
	if (missingTitle) {
		missingFields.push({
			label: "Titre",
			description: "renseignez le champ « Titre » du formulaire d'édition.",
		});
	}

	return (
		<div className={clsx("seoblock", classes.editPreview)}>
			{missingFields.length > 0 && (
				<MissingFieldsBanner blockName="Bloc Titre & Texte" fields={missingFields} />
			)}
			<SeoBlock {...dsProps} />
		</div>
	);
}
