import { Area, jahiaComponent } from "@jahia/javascript-modules-library";
import { Layout } from "../Layout.jsx";

jahiaComponent(
	{
		componentType: "template",
		nodeType: "jnt:page",
		name: "simple",
		displayName: "Simple page - No header/footer",
	},
	({ "jcr:title": title }) => {
		return (
			<Layout title={title}>
				<header id="header" role="banner"></header>
				<main id="content" role="main" className="page-content hub" data-page="hub">
					<Area name="main" />
				</main>
			</Layout>
		);
	},
);
