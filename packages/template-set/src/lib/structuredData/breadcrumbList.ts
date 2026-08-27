import type { BreadcrumbItem } from "sofinco-react";
import type { JsonLdNode } from "./types";
import { toAbsoluteUrl } from "#lib/pageUrl";

/**
 * `BreadcrumbList` dérivé du MÊME `buildBreadcrumb()` que le fil d'Ariane affiché
 * (`#lib/breadcrumb`) — c'est la garantie que balisage et rendu ne divergent jamais,
 * exigence explicite de Google et de la spécification SEO.
 *
 * Deux corrections par rapport à l'émetteur qu'il remplace (le `<script>` inline de
 * `Breadcrumb.tsx` dans le design system) : les URLs sont ABSOLUES, et l'entrée de
 * la page courante porte le canonical plutôt que son URL de nœud.
 */
export const buildBreadcrumbList = (
	items: BreadcrumbItem[],
	{ origin, canonical, id }: { origin: string; canonical: string; id: string },
): JsonLdNode | null => {
	// Les entrées `jnt:navMenuText` n'ont pas de destination : un `ListItem` sans
	// `item` est ignoré par Google, autant ne pas l'émettre. Les positions sont
	// renumérotées sur la liste retenue, pour rester contiguës à partir de 1.
	const linked = items.filter((item) => item.url || item.isCurrent);
	// Un fil à une seule entrée n'apporte rien : c'est aussi le seuil auquel les
	// templates de page cessent de rendre le composant visible.
	if (linked.length < 2) return null;

	return {
		"@type": "BreadcrumbList",
		"@id": id,
		"itemListElement": linked.map((item, index) => ({
			"@type": "ListItem",
			"position": index + 1,
			"name": item.label,
			// La page courante est désignée par son URL de référence, celle-là même
			// que porte `<link rel="canonical">`.
			"item": item.isCurrent ? canonical : toAbsoluteUrl(origin, item.url),
		})),
	};
};
