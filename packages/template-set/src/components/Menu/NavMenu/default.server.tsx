import {
	buildNodeUrl,
	Island,
	jahiaComponent,
	RenderChild,
	RenderChildren,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import MenuJahia from "./MenuJahia.client";
import { mapNavMenuProps } from "./navMenu.mapping";
import { isMainResourceNode } from "#lib/renderContext";
import SmartPushScript from "#cms/Faq/SmartPush/views/SmartPushScript";
import classes from "./component.module.css";

interface Props {
	logo: JCRNodeWrapper;
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:navMenu",
	},
	({ logo }: Props, { renderContext, currentNode }) => {
		const isMenuPage = isMainResourceNode(renderContext, "menu");
		const { data, smartPushConfig } = mapNavMenuProps(currentNode, logo, renderContext.getSite());

		return (
			<>
				{isMenuPage ? (
					<>
						<div className={classes.tabMenu}>
							<RenderChild name="tabMenu" />
						</div>
						<div style={{ display: "flex", flexDirection: "column" }}>
							<div className={classes.headerRow}>
								{logo && (
									<div className={classes.logo}>
										<img src={buildNodeUrl(logo)} alt="Logo" />
									</div>
								)}
								<div className={classes.mySpace}>
									<RenderChild name="mySpace" />
								</div>
							</div>
							<div className={classes.navmenuedit}>
								<RenderChildren
									nodeTypes={["sofnt:navSection"]}
									filter={(n: JCRNodeWrapper) =>
										!n.isNodeType("sofnt:mySpace") && !n.isNodeType("sofnt:tabMenu")
									}
								/>
							</div>
						</div>
					</>
				) : (
					<>
						{smartPushConfig && <SmartPushScript cfg={smartPushConfig} />}
						<Island component={MenuJahia} props={data} />
					</>
				)}
			</>
		);
	},
);
