import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import Sections from "./Sections";
import type { MenuSection } from "@common/Menu/Menu.type";

// The desktop menu is server-rendered by GraalVM (Jahia Island, no `clientOnly`), where
// there is no `document`/`window`. It also has to ship its links in that server markup for
// SEO — hence `forceMount` on the panels and no Radix <Viewport> (a Viewport routes
// <Content> through a layout effect that renders nothing on the server).

const sections: Array<MenuSection> = [
	{
		id: "credits",
		title: "Crédits",
		subsections: [
			{
				id: "conso",
				title: "Consommation",
				links: [
					{ href: "/pret-perso", label: "Prêt personnel" },
					{ href: "/credit-renouvelable", label: "Crédit renouvelable" },
				],
			},
		],
	},
	{
		id: "assurances",
		title: "Assurances",
		subsections: [
			{ id: "emprunteur", title: "Emprunteur", links: [{ href: "/adi", label: "Assurance ADI" }] },
		],
	},
];

describe("Sections — server rendering", () => {
	// Rendered per test rather than in the describe body: a throw during collection reports
	// the suite as "(0 test)" with no failing test name.
	const render = () => renderToString(<Sections sections={sections} />);

	it("emits every submenu link in the server HTML", () => {
		const html = render();
		expect(html).toContain('href="/pret-perso"');
		expect(html).toContain('href="/credit-renouvelable"');
		expect(html).toContain('href="/adi"');
		expect(html).toContain("Prêt personnel");
	});

	it("force-mounts every panel closed, with no open panel at rest", () => {
		const html = render();
		// Scoped to the panels themselves — counting every `data-state="closed"` in the
		// document breaks the moment any nested component grows one.
		const panels = html.match(
			/<div[^>]*data-state="closed"[^>]*class="[^"]*menu__sections__content/g,
		);
		expect(panels).toHaveLength(sections.length);
		expect(html).not.toContain('data-state="open"');
	});

	it("leaves Radix to own the aria wiring between trigger and panel", () => {
		const html = render();
		const contentId = /<div id="([^"]+)"[^>]*aria-labelledby="([^"]+)"/.exec(html);
		expect(contentId).not.toBeNull();
		expect(html).toContain(`aria-controls="${contentId![1]}"`);
		expect(html).toContain(`id="${contentId![2]}"`);
	});

	it("keeps the subsection heading outside the <ul>", () => {
		// `ul` only permits `li`/`script`/`template`. This markup is crawled now, and a
		// malformed list gets reparented, breaking the heading↔list association.
		expect(render()).not.toMatch(/<ul[^>]*>\s*<h[1-6]/);
	});

	it("still renders the Radix list wrapper the panel layout depends on", () => {
		// `.menu__sections > div:has(> ul[data-orientation])` in Sections.module.css
		// neutralises this wrapper's inline `position: relative`. If a Radix upgrade drops
		// or reshapes it, fail here rather than silently collapsing the panel layout.
		expect(render()).toMatch(
			/<div[^>]*style="position:relative"[^>]*>\s*<ul[^>]*data-orientation=/,
		);
	});
});
