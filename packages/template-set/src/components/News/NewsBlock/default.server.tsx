import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { NewsBlock, type NewsBlockCardProps, type NewsBlockProps } from "sofinco-react";

import classes from "./component.module.css";
import { getAncestorUrl, getDate, getPropertyAsNode, str } from "#lib/jcr";
import { jcrQuery } from "#lib/jcrQuery";

function readNewsCard(news: JCRNodeWrapper): NewsBlockCardProps {
	const image = getPropertyAsNode(news, "smallPicture");
	const { display: date, iso: dateIso } = getDate(news, "publishDate");

	return {
		img: {
			src: image ? buildNodeUrl(image) : "",
			alt: image ? image.getDisplayableName() : str(news, "title"),
		},
		tag: str(news, "tag"),
		date,
		dateIso: dateIso || undefined,
		title: str(news, "title"),
		description: str(news, "description"),
		ctaProps: {
			type: "button",
			variant: "accent",
			size: "medium",
			label: "Découvrir l'article associé",
			href: getAncestorUrl(news, "jnt:page"),
			ctaSection: "news-block-card-cta",
		},
	};
}

function findHomeNews(rootPath: string): JCRNodeWrapper[] {
	const sql =
		"SELECT * FROM [spnt:news] AS news " +
		`WHERE ISDESCENDANTNODE(news, '${rootPath}') ` +
		"AND [displayOnHome] = true " +
		"ORDER BY [publishDate] DESC";
	return jcrQuery(sql, { limit: 3 });
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:newsBlock",
		displayName: "News Block",
	},
	(_, { renderContext, currentNode }) => {
		const rootNode = getPropertyAsNode(currentNode, "rootPath");
		const rootPath = rootNode ? rootNode.getPath() : renderContext.getSite().getPath();
		const newsNodes = findHomeNews(rootPath);

		const data: NewsBlockProps = {
			header: str(currentNode, "header"),
			title: str(currentNode, "title"),
			subtitle: str(currentNode, "subtitle"),
			cards: newsNodes.map(readNewsCard),
		};

		if (renderContext.isEditMode()) {
			return (
				<div className={classes.editPreview}>
					<span className={classes.editEyebrow}>{data.header}</span>
					<h2 className={classes.editTitle}>{data.title}</h2>
					<p className={classes.editSubtitle}>{data.subtitle}</p>
					<p className={classes.editSubtitle}>
						{data.cards.length} actualité(s) trouvée(s) (spnt:news, displayOnHome=true).
					</p>
				</div>
			);
		}

		return <NewsBlock {...data} />;
	},
);
