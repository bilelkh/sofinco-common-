import {
	Area,
	AbsoluteArea,
	AddResources,
	buildModuleFileUrl,
	jahiaComponent,
} from "@jahia/javascript-modules-library";
import { Layout } from "../Layout.jsx";
import { getChildNode } from "#lib/jcr.js";
import { buildBreadcrumbLayoutProps } from "#lib/breadcrumb";
import { Breadcrumb, WrapperLegacy } from "sofinco-react";
/*
 * Feuille de styles de l'ancien site. L'import `?url` la sort du graphe CSS du bundle :
 * elle N'EST PAS concaténée dans `dist/assets/style.css` (chargé par `Layout` sur toutes
 * les pages) mais émise comme asset autonome, dont ce specifier reçoit le chemin
 * `dist/assets/legacy-<hash>.css` (cf. `renderBuiltUrl` de `@jahia/vite-plugin`).
 * `dist/assets` est déjà déclaré dans les `static-resources` du module, donc servi tel quel.
 */
import legacyStylesheet from "sofinco-react/styles/legacy.css?url";

/**
 * Page template "legacy" — utilisé pour les pages NON incluses dans la refonte.
 *
 * Différences avec `basic.server.tsx` :
 *  - Wrapper DS `<WrapperLegacy>` (rend `<div id="legacy__content__wrapper">`
 *    avec centrage horizontal + max-width responsive via CSS module)
 *  - Breadcrumb auto au top
 *  - Conservation du header + footer Sofinco standards
 *  - Affichage du bloc ReassurancePictos avant le footer (pattern site-wide)
 *  - Lazy-loading (vanilla-lazyload) réservé aux pages legacy
 *  - Feuille `legacy.css` injectée dans le `<head>` de ces seules pages
 */
jahiaComponent(
	{
		componentType: "template",
		nodeType: "jnt:page",
		name: "legacy",
		displayName: "Legacy page",
	},
	({ "jcr:title": title }, { renderContext }) => {
		const siteNode = renderContext.getSite();
		const isEditMode = renderContext.isEditMode();
		const footer = getChildNode(siteNode, "footer");
		const reassurancePictos = getChildNode(siteNode, "reassurance-pictos");

		const breadcrumbLayout = buildBreadcrumbLayoutProps(renderContext);

		return (
			<Layout title={title} breadcrumbItems={breadcrumbLayout.items}>
				{/* `targetTag` par défaut = `head` : le <link> est ajouté au <head> rendu par `Layout`. */}
				<AddResources type="css" resources={buildModuleFileUrl(legacyStylesheet)} />

				<Area name="header" nodeType="sofnt:header" />

				<main>
					<WrapperLegacy>
						{breadcrumbLayout.items.length > 1 && <Breadcrumb {...breadcrumbLayout} />}
						<Area name="BANNIERE" />
						<Area name="main" />
					</WrapperLegacy>
				</main>

				{reassurancePictos && (
					<AbsoluteArea
						name="reassurance-pictos"
						parent={reassurancePictos}
						nodeType="sofnt:reassurancePictos"
					/>
				)}
				{footer && <AbsoluteArea name="footer" parent={footer} nodeType="sofnt:footer" />}

				{!isEditMode && (
					<AddResources
						type="javascript"
						resources="lazyload/lazyload.min.js,lazyload/lazyload-init.js"
						targetTag="body"
						defer
					/>
				)}
			</Layout>
		);
	},
);
