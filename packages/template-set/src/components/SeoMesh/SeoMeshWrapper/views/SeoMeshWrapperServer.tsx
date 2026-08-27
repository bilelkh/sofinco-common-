import { RenderChildren } from "@jahia/javascript-modules-library";
import type { SeoMeshWrapperPropsServer } from "../seoMeshWrapper.types";
import classes from "./seoMeshWrapper.module.css";
import clsx from "clsx";

export function SeoMeshWrapperServer(props: SeoMeshWrapperPropsServer) {
  return (
    <div className={clsx(classes.seoBlockWrapper, classes[props.backgroundColor] || classes.cyanClair)}>
      <RenderChildren nodeTypes={["spnt:seoLinksBlock"]} filter="spnt:seoLinksBlock" />
    </div>
  );
}
