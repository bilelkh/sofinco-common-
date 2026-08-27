import { jahiaComponent, Render, RenderChildren } from "@jahia/javascript-modules-library";
import { getChildNodesByType } from "../../../lib/jcr";
import classes from "./component.module.css";

interface Props {
	label: string;
	question: string;
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:chatBotCategory",
	},
	({ label, question }: Props, { renderContext, currentNode }) => {
		if (renderContext.isEditMode()) {
			const leaves = getChildNodesByType(currentNode, "sofnt:chatBotLeaf");
			const simulatorLeaf = getChildNodesByType(currentNode, "sofnt:chatBotSimulatorLeaf")[0];

			// Authoring rules (not expressible in the CND, enforced here):
			//  - a simulator leaf is TERMINAL: the runtime (ChatBot.tsx) renders only its
			//    amount form and discards every sibling in `step.categories`, so it must be
			//    the unique child of its category. Once one exists we therefore hide BOTH the
			//    sub-category and the plain-leaf add slots (otherwise the edit view would let
			//    an author create siblings that are silently unreachable for end users);
			//  - a plain leaf may still coexist with sub-categories (the runtime renders them
			//    together in the category grid);
			//  - the two leaf kinds are mutually exclusive (chatBotLeaf XOR chatBotSimulatorLeaf);
			//  - at most one chatBotSimulatorLeaf per category.
			// The simulator leaf, once present, is rendered directly via <Render> (no add area →
			// max one) while staying editable inline.
			const showCategorySlot = !simulatorLeaf;
			const showLeafSlot = !simulatorLeaf;

			return (
				<li key={label} className={classes.editCategoryItem}>
					{label} {" → "} {question}
					<ul className={classes.editCategoryList}>
						{showCategorySlot && (
							<RenderChildren
								nodeTypes={["sofnt:chatBotCategory"]}
								filter="sofnt:chatBotCategory"
							/>
						)}
						{showLeafSlot && (
							<RenderChildren nodeTypes={["sofnt:chatBotLeaf"]} filter="sofnt:chatBotLeaf" />
						)}
						{simulatorLeaf ? (
							<Render node={simulatorLeaf} />
						) : (
							leaves.length === 0 && (
								<RenderChildren
									nodeTypes={["sofnt:chatBotSimulatorLeaf"]}
									filter="sofnt:chatBotSimulatorLeaf"
								/>
							)
						)}
					</ul>
				</li>
			);
		}
	},
);
