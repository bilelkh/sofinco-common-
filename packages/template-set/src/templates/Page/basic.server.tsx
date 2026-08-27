import { Area, AbsoluteArea, jahiaComponent } from "@jahia/javascript-modules-library";
import { Layout } from "../Layout.jsx";
import { getChildNode } from "#lib/jcr.js";
import { buildBreadcrumbLayoutProps } from "#lib/breadcrumb";
import { Breadcrumb } from "sofinco-react";

jahiaComponent(
	{
		componentType: "template",
		nodeType: "jnt:page",
		name: "basic",
		displayName: "Basic page",
	},
	({ "jcr:title": title }, { renderContext }) => {
		const siteNode = renderContext.getSite();
		const footer = getChildNode(siteNode, "footer");
		const reassurancePictos = getChildNode(siteNode, "reassurance-pictos");

		const breadcrumbLayout = buildBreadcrumbLayoutProps(renderContext);

		return (
			<Layout title={title} breadcrumbItems={breadcrumbLayout.items}>
				<Area name="header" nodeType="sofnt:header" />
				<main>
					{breadcrumbLayout.items.length > 1 && <Breadcrumb {...breadcrumbLayout} />}
					<Area name="main" />
				</main>
				<Area name="mentions" allowedNodeTypes={["sofnt:mentionLegal"]} numberOfItems={1} />
				{reassurancePictos && (
					<AbsoluteArea
						name="reassurance-pictos"
						parent={reassurancePictos}
						nodeType="sofnt:reassurancePictos"
					/>
				)}
				{footer && <AbsoluteArea name="footer" parent={footer} nodeType="sofnt:footer" />}
			</Layout>
		);
	},
);
