import { jahiaComponent, buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

interface Props {
	"jcr:title": string;
	"j:linknode": JCRNodeWrapper;
	"j:url": string;
	"j:linkTitle": string;
	"j:target": string;
}

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:menuLink",
	},
	({
		"jcr:title": title,
		"j:linknode": linkedNode,
		"j:url": url,
		"j:linkTitle": linkTitle,
		"j:target": target,
	}: Props) => {
		const href = linkedNode ? buildNodeUrl(linkedNode) : url || "#";
		const alt = linkTitle || title;
		return (
			<a href={href} target={target} aria-label={alt}>
				{title}
			</a>
		);
	},
);
