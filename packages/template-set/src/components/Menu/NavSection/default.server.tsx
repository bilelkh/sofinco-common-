import {
  jahiaComponent,
  RenderChildren,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./component.module.css";

interface Props {
  "jcr:title": string;
  "sideImg"?: JCRNodeWrapper;
  "sideTitle"?: string;
  "sidePage"?: JCRNodeWrapper;
  "titleCta"?: string;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "sofnt:navSection",
  },
  ({ "jcr:title": title }: Props) => {
    return (
          <div>
            <div className={classes.edit}>{title}</div>
            <div className={classes.naveLink}>
              <nav>
                <RenderChildren nodeTypes={["sofnt:navLink"]} />
              </nav>
            </div>
          </div>
    );
  },
);
