/*
 * Contrat de rendu de `SocialProof`.
 *
 * Rendu SSR (`environment: node`) : c'est aussi la garantie que le composant est
 * consommable en Island Jahia, où GraalVM n'offre ni `document` ni `window` — Swiper
 * compris.
 *
 * Ce qui est vérifié ici échappe à tout test visuel :
 *
 *  - **l'alternance des teintes**, calculée sur l'index et non en `:nth-child` (voir
 *    `SocialProof.tsx`), et la possibilité de la forcer par item ;
 *  - **le balisage de citation** (`figure` / `blockquote` / `figcaption`), seul porteur
 *    du lien entre un propos et son auteur pour un lecteur d'écran ;
 *  - **le portrait décoratif par défaut**, qui ne doit pas doubler la signature ;
 *  - **la section vide**, qui ne rend rien plutôt qu'un fond orphelin.
 *
 * Écrit en `.ts` et non `.tsx`, comme `MultiStepForm.render.test.ts`, d'où
 * `createElement` plutôt que du JSX.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import SocialProof from "./SocialProof";
import type { SocialProofProps, SocialProofTestimonial } from "./SocialProof.type";

const item = (id: string, extra: Partial<SocialProofTestimonial> = {}): SocialProofTestimonial => ({
	id,
	quote: `Témoignage ${id}`,
	authorName: `Auteur ${id}`,
	authorRole: `Fonction ${id}`,
	avatarSrc: `/avatar-${id}.webp`,
	link: { label: "Lire le témoignage", href: `/temoignages/${id}` },
	...extra,
});

const render = (props: Partial<SocialProofProps> = {}) =>
	renderToStaticMarkup(
		createElement(SocialProof, {
			title: "Ils nous font confiance",
			subtitle: "Rejoignez les 15 000 partenaires.",
			testimonials: [item("1"), item("2"), item("3"), item("4")],
			...props,
		}),
	);

describe("SocialProof", () => {
	it("rend chaque témoignage en citation attribuée", () => {
		const html = render();

		expect(html.match(/<figure/g)).toHaveLength(4);
		expect(html.match(/<blockquote/g)).toHaveLength(4);
		expect(html.match(/<figcaption/g)).toHaveLength(4);
		expect(html).toContain("Témoignage 1");
		expect(html).toContain("Auteur 1");
		expect(html).toContain("Fonction 1");
	});

	it("alterne les teintes une carte sur deux", () => {
		const html = render();
		const tones = [...html.matchAll(/testimonial-card--(light|dark)/g)].map(([, tone]) => tone);

		expect(tones).toEqual(["light", "dark", "light", "dark"]);
	});

	it("laisse `tone` forcer la teinte d'un item", () => {
		const html = render({ testimonials: [item("1", { tone: "dark" }), item("2")] });
		const tones = [...html.matchAll(/testimonial-card--(light|dark)/g)].map(([, tone]) => tone);

		expect(tones).toEqual(["dark", "dark"]);
	});

	it("rend le portrait décoratif tant qu'aucun `avatarAlt` n'est fourni", () => {
		expect(render({ testimonials: [item("1")] })).toContain('alt="" aria-hidden="true"');

		const described = render({ testimonials: [item("1", { avatarAlt: "Portrait d'Auteur 1" })] });
		expect(described).toContain('alt="Portrait d&#x27;Auteur 1"');
		expect(described).not.toContain('aria-hidden="true" src="/avatar-1.webp"');
	});

	it("nomme la section par son titre et étiquette les deux flèches", () => {
		const html = render();
		const labelledBy = html.match(/aria-labelledby="([^"]+)"/)?.[1];

		expect(labelledBy).toBeDefined();
		expect(html).toContain(`id="${labelledBy}"`);
		expect(html).toContain('aria-label="Témoignage précédent"');
		expect(html).toContain('aria-label="Témoignage suivant"');
	});

	it("ne rend rien sans témoignage", () => {
		expect(render({ testimonials: [] })).toBe("");
	});
});
