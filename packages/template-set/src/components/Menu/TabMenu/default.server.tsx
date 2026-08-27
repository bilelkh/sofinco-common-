import {
	jahiaComponent,
	RenderChildren,
	Render,
	RenderChild,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { isMainResourceNode } from "#lib/renderContext";
import { getChildNodesByType } from "#lib/jcr";
import { TopBar } from "sofinco-react";
import { mapTopBarTabs } from "./tabMenu.mapping";
import classes from "./component.module.css";

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:tabMenu",
	},
	(_, { renderContext, currentNode }) => {
		const isMenuPage = isMainResourceNode(renderContext, "menu");
		const tab = getChildNodesByType(currentNode, "sofnt:menuLink");
		const search = getChildNodesByType(currentNode, "sofnt:search");

		// Dedicated "menu" editing page — full authoring layout (add-link buttons, max-2 logic).
		if (isMenuPage) {
			return (
				<div className={classes.tabMenuEdit}>
					<div className={classes.tabMenuEditLeft}>
						{tab.length === 0 && <span>Ajouter un lien pour les onglets du header</span>}
						{tab.length < 2 ? (
							<RenderChildren
								nodeTypes={["sofnt:menuLink"]}
								filter={(n: JCRNodeWrapper) => !n.isNodeType("sofnt:search")}
							/>
						) : (
							<>
								{tab.map((n: JCRNodeWrapper) => (
									<Render key={n.getIdentifier()} node={n} />
								))}
								<span>Maximum 2 Tabs atteint</span>
							</>
						)}
					</div>
					<div className={classes.tabMenuEditRight}>
						{search.length < 1 ? (
							<RenderChildren
								nodeTypes={["sofnt:search"]}
								filter={(n: JCRNodeWrapper) =>
									n.isNodeType("sofnt:search") && !n.isNodeType("sofnt:menuLink")
								}
							/>
						) : (
							<>
								{search.map((n: JCRNodeWrapper) => (
									<Render key={n.getIdentifier()} node={n} />
								))}
							</>
						)}
					</div>
				</div>
			);
		}

		// TopBar data — shared by inline edit, preview and live. The search <Island> is passed
		// in as a server-rendered slot (RenderChild), so its hydration is preserved.
		const tabs = mapTopBarTabs(currentNode);
		const slotSearch = currentNode.hasNode("search") ? <RenderChild name="search" /> : undefined;
		// Preview + live.
		return <TopBar tabs={tabs} slotSearch={slotSearch} />;
	},
);
