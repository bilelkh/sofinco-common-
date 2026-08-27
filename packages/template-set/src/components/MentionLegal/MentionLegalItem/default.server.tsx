import { jahiaComponent } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { str } from "#lib/jcr";
import { anchorIdOf } from "#lib/slug";
import { useAppTranslation } from "#lib/i18n";
import { buildNote } from "../buildNote";
import { MentionLegalItemServer } from "./views/MentionLegalItemServer";

export default jahiaComponent(
	{
		nodeType: "sofnt:mentionLegalItem",
		displayName: "Paragraphe de mention légale",
		componentType: "view",
	},
	(_, { currentNode, renderContext }) => {
		// Edit-only view: in live mode the parent sofnt:mentionLegal renders the items
		// inline (with their anchor ids), so this view is reached only via the editor.
		if (!isEditMode(renderContext)) return null;

		// Match the fragment the live page renders, so the copy button yields the exact
		// "#id" usable as a link target. MÊME fonction que le parent (`anchorIdOf`) et non
		// une seconde copie de `slugify` : l'aperçu proposerait sinon à la copie une ancre
		// (`nbsp`) que la page live ne rend pas.
		// The page URL is intentionally NOT built here: in edit mode buildNodeUrl
		// returns a "/cms/{mode}/..." path that Jahia rewrites only at preview/live
		// render time, so it can't be reproduced at copy time.
		const anchorSlug = anchorIdOf(str(currentNode, "anchor"));

		// Mirror the live render: render the note with its leading <sup> + footnote anchors
		// so the editor preview matches what visitors see.
		const { t } = useAppTranslation();
		const content = buildNote(str(currentNode, "anchor"), str(currentNode, "content"), {
			note: t("a11y.noteBasDePage"),
			back: t("a11y.retourRef"),
		});

		return <MentionLegalItemServer anchorSlug={anchorSlug} content={content} />;
	},
);
