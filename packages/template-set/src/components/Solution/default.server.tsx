import { jahiaComponent, Island, RenderChildren } from "@jahia/javascript-modules-library";
import Solution, { type SolutionData } from "./Solution.client";
import classes from "./component.module.css";
import { getChildNodesByType } from "#lib/jcr";
import { toSolutionComplementaryCardData } from "./SolutionCard/solutionCard.mapping";

interface Props {
	heading: string;
	heading2: string;
	subHeading: string;
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:solution",
	},
	({ heading, heading2, subHeading }: Props, { renderContext, currentNode }) => {
		// Le DS <SolutionComplementary> est concu pour 2 cartes cote a cote.
		const cardNodes = getChildNodesByType(currentNode, "sofnt:solutionCard").slice(0, 2);

		const data: SolutionData = {
			heading,
			heading2,
			subHeading,
			cards: cardNodes.map(toSolutionComplementaryCardData),
		};

		if (renderContext.isEditMode()) {
			return (
				<div className={classes.editPreview}>
					<p className={classes.editHeading}>
						{heading} {heading2}
					</p>
					<p className={classes.editSubHeading}>{subHeading}</p>
					<div className={classes.editCardList}>
						<RenderChildren nodeTypes={["sofnt:solutionCard"]} />
					</div>
				</div>
			);
		}

		return <Island component={Solution} props={{ data }} />;
	},
);
