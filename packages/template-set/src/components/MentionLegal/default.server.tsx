import { jahiaComponent, Island, RenderChildren } from "@jahia/javascript-modules-library";
import { isEditMode } from "#lib/renderContext";
import { str, getAsBoolean, getChildNodesByType } from "#lib/jcr";
import { footnoteKey, type FootnoteLabels } from "#lib/footnotes";
import { collectFootnoteNote } from "#lib/footnoteCollector";
import { useAppTranslation } from "#lib/i18n";
import type { MentionLegalItem } from "sofinco-react";
import MentionLegalClient from "./views/MentionLegalClient.client";
import { buildNote, footnoteNumber } from "./buildNote";
import { anchorIdOf } from "#lib/slug";
import classes from "./component.module.css";

jahiaComponent(
	{ nodeType: "sofnt:mentionLegal", displayName: "Mentions légales", componentType: "view" },
	(_, { currentNode, renderContext }) => {
		const title = str(currentNode, "jcr:title");

		// In edit mode keep the items always visible & editable — never collapse them away.
		if (isEditMode(renderContext)) {
			/*
			 * Le contrôle des mentions légales (footnoteCollector.ts) apprend d'ordinaire
			 * l'existence d'une mention en la voyant passer dans `manageFooterNote`. Or cette
			 * branche court-circuite `buildNote` : les mentions ne seraient jamais collectées et
			 * TOUS les renvois de la page seraient signalés inexistants. On les déclare donc
			 * depuis le JCR, qui en est de toute façon la source autoritaire — indépendante de
			 * la façon dont la note est rendue.
			 */
			for (const item of getChildNodesByType(currentNode, "sofnt:mentionLegalItem")) {
				const anchor = str(item, "anchor");
				/*
				 * Un paragraphe sans ancre est un TEXTE LIBRE, pas une note : `buildNote` ne lui
				 * pose ni exposant ni `id="footerN"`. L'enregistrer injecterait une clé vide dans
				 * le registre, et le contrôle afficherait « La mention () n'est citée nulle part »
				 * — une anomalie inventée, sur un contenu parfaitement valide.
				 */
				if (!footnoteNumber(anchor)) continue;
				collectFootnoteNote(footnoteKey(anchor), currentNode.getPrimaryNodeTypeName());
			}

			return (
				<section className={classes.mentionLegal}>
					{title && <h2 className={classes.mentionLegal__title}>{title}</h2>}
					<div className={classes.mentionLegal__items}>
						<RenderChildren nodeTypes={["sofnt:mentionLegalItem"]} />
					</div>
				</section>
			);
		}

		const { t } = useAppTranslation();
		const labels: FootnoteLabels = {
			note: t("a11y.noteBasDePage"),
			back: t("a11y.retourRef"),
		};
		const initiallyOpen = getAsBoolean(currentNode, "initiallyOpen", false);
		const items: MentionLegalItem[] = getChildNodesByType(
			currentNode,
			"sofnt:mentionLegalItem",
		).map((item) => ({
			/*
			 * `anchorIdOf`, pas `slugify` : une ancre qui ne désigne aucune note (`&nbsp;`,
			 * `<b></b>`, `()`) ne doit poser AUCUN id. Slugifier la valeur brute produisait
			 * `id="nbsp"` — un point d'atterrissage fantôme, sans exposant qui y mène.
			 */
			anchorId: anchorIdOf(str(item, "anchor")),
			content: buildNote(str(item, "anchor"), str(item, "content"), labels),
		}));

		return <Island component={MentionLegalClient} props={{ title, items, initiallyOpen }} />;
	},
);
