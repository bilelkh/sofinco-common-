import { jahiaComponent, AbsoluteArea } from "@jahia/javascript-modules-library";
import { getChildNode } from "#lib/jcr";
import { Layout } from "../Layout.jsx";

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jnt:page",
    name: "footer",
    displayName: "Footer page",
  },
  ({ "jcr:title": title }, { renderContext }) => {
    // `getChildNode` déclare `{ node: footerArea }` en cache dep — modifier le
    // nœud "footer" du site invalide toutes les pages qui l'incluent.
    const footerArea = getChildNode(renderContext.getSite(), "footer");
    return (
      <Layout title={title}>
        {footerArea && (
          <AbsoluteArea name="footer" parent={footerArea} nodeType="sofnt:footer" />
        )}
      </Layout>
    );
  },
);
