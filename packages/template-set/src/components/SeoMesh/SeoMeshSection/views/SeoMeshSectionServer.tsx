import { RenderChildren } from "@jahia/javascript-modules-library";
import type { SeoMeshSectionPropsServer } from "../seoMeshSection.types";
import classes from "./seoMeshSection.module.css";

export function SeoMeshSectionServer(props: SeoMeshSectionPropsServer) {
	const TitleTag = props.level !== "" ? (props.level as React.ElementType) : "p";

	return (
		<div className={classes.subBlock}>
			<TitleTag className={classes.subBlockTitle}>{props.title}</TitleTag>
			<ul className={classes.subBlockList}>
				<RenderChildren
					nodeTypes={["spnt:seoLinksSubBlockLink"]}
					filter="spnt:seoLinksSubBlockLink"
				/>
			</ul>
		</div>
	);
}
