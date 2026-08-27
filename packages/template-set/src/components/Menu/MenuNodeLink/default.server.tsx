import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

interface Props {
	"jcr:title": string;
	"j:linknode": JCRNodeWrapper;
	"j:target": string;
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:menuNodeLink",
	},
	({ "jcr:title": title, "j:linknode": linkedNode, "j:target": target }: Props) => {
		const href = linkedNode ? buildNodeUrl(linkedNode) : "#";
		return (
			<a href={href} target={target}>
				{title}
			</a>
		);
	},
);
