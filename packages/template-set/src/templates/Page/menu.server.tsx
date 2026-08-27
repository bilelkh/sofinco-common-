import { jahiaComponent, AbsoluteArea } from "@jahia/javascript-modules-library";
import { getChildNode } from "#lib/jcr";
import { Layout } from "../Layout.jsx";

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jnt:page",
    name: "menu",
    displayName: "Menu page",
  },
  ({ "jcr:title": title }, { renderContext }) => {
    // `getChildNode` auto-déclare la dep cache — toute modif du nœud "menu"
    // (drag/drop, renommage) invalide les pages qui l'incluent.
    const menuArea = getChildNode(renderContext.getSite(), "menu");
    return (
      <Layout title={title}>
        {menuArea && (
          <AbsoluteArea name="menu" parent={menuArea} nodeType="sofnt:navMenu" />
        )}
      </Layout>
    );
  },
);
