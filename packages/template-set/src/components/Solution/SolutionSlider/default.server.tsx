import { Island, jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import type { SolutionProps } from "sofinco-react";
import SolutionJahia from "./SolutionJahia.client";
import classes from "./component.module.css";
import { getChildNodesByType } from "#lib/jcr";
import { toSolutionItem } from "../SolutionCard/solutionCard.mapping";

interface Props {
	title: string;
	subtitle: string;
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:solutionSlider",
	},
	({ title, subtitle }: Props, { renderContext, currentNode }) => {
		const cardNodes = getChildNodesByType(currentNode, "sofnt:solutionCard");

		const data: SolutionProps = {
			title,
			subtitle,
			items: cardNodes.map(toSolutionItem),
		};

		if (renderContext.isEditMode()) {
			return (
				<div className={classes.editPreview}>
					<p className={classes.editHeading}>{title}</p>
					<p className={classes.editSubHeading}>{subtitle}</p>
					<div className={classes.editCardList}>
						<RenderChildren nodeTypes={["sofnt:solutionCard"]} view="slider" />
					</div>
				</div>
			);
		}

		return <Island component={SolutionJahia} props={data} />;
	},
);
