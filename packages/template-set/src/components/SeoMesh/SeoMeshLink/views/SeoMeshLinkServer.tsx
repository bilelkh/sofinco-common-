import type { SeoMeshLinkPropsServer } from "../seoMeshLink.types";

export function SeoMeshLinkServer({ title, url, ariaLabel }: SeoMeshLinkPropsServer) {
	return (
		<li>
			<a href={url || "#"} aria-label={ariaLabel || undefined}>
				{title}
			</a>
		</li>
	);
}
