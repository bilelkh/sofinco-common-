import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
interface Props {
	"jcr:title": string;
}
jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:navLink",
	},
	({ "jcr:title": title }: Props) => {
		return (
			<div>
				<div className={classes.titleEdit}>{title}</div>
				<div className={classes.navLinkEdit}>
					<RenderChildren nodeTypes={["sofnt:menuNodeLink"]} />
				</div>
			</div>
		);
	},
);
