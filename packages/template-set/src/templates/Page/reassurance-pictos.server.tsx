import { jahiaComponent, AbsoluteArea } from "@jahia/javascript-modules-library";
import { getChildNode } from "#lib/jcr";
import { Layout } from "../Layout.jsx";

/**
 * Template dédié édition du bloc "Réassurance Pictos".
 *
 * Utilisé pour permettre au PO / marketing d'éditer le bloc réassurance
 * comme une page dans jContent (raccourci d'édition dans l'arborescence).
 * Le nœud `sofnt:reassurancePictos` est ensuite affiché sur toutes les
 * pages via les templates Page/basic.server.tsx et Page/legacy.server.tsx
 * (pattern `AbsoluteArea` — même stratégie que le footer).
 *
 * Provisioning : cf. settings/groovyScripts/gestion-reassurance-pictos.groovy
 */
jahiaComponent(
	{
		componentType: "template",
		nodeType: "jnt:page",
		name: "reassurance-pictos",
		displayName: "ReassurancePictos page",
	},
	({ "jcr:title": title }, { renderContext }) => {
		// `getChildNode` auto-déclare la dep cache — modif du bloc site-wide
		// invalide toutes les pages qui l'incluent (basic + legacy templates).
		const area = getChildNode(renderContext.getSite(), "reassurance-pictos");
		return (
			<Layout title={title}>
				{area && (
					<AbsoluteArea
						name="reassurance-pictos"
						parent={area}
						nodeType="sofnt:reassurancePictos"
					/>
				)}
			</Layout>
		);
	},
);
