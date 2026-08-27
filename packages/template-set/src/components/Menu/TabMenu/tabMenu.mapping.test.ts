import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
}));

import { mapTopBarTabs } from "./tabMenu.mapping";

const menuLink = (props: Record<string, unknown>) =>
	makeNode({ nodeTypes: ["sofnt:menuLink"], props: props as never });

describe("mapTopBarTabs", () => {
	it("returns no tabs when there are no menuLink children", () => {
		expect(mapTopBarTabs(makeNode())).toEqual([]);
	});

	it("resolves an internal link via the linked node URL and fills the tracking payload", () => {
		const tabMenu = makeNode({
			children: [
				menuLink({
					"jcr:title": "Particuliers",
					"j:linknode": makeNode({ url: "/particuliers" }),
					"j:linkTitle": "Espace particuliers",
					"j:target": "_self",
				}),
			],
		});

		expect(mapTopBarTabs(tabMenu)).toEqual([
			{
				href: "/particuliers",
				label: "Particuliers",
				target: "_self",
				ariaLabel: "Espace particuliers",
				tracking: { event: "click_tab", menu_level_1: "Particuliers" },
			},
		]);
	});

	it("falls back to j:url, then '#', and uses the title as aria-label when linkTitle is absent", () => {
		const tabMenu = makeNode({
			children: [
				menuLink({ "jcr:title": "Pros", "j:url": "https://pro.example" }),
				menuLink({ "jcr:title": "Empty" }),
			],
		});

		expect(mapTopBarTabs(tabMenu)).toEqual([
			{
				href: "https://pro.example",
				label: "Pros",
				target: undefined,
				ariaLabel: "Pros",
				tracking: { event: "click_tab", menu_level_1: "Pros" },
			},
			{
				href: "#",
				label: "Empty",
				target: undefined,
				ariaLabel: "Empty",
				tracking: { event: "click_tab", menu_level_1: "Empty" },
			},
		]);
	});

	it("caps the tabs at 2 by convention", () => {
		const tabMenu = makeNode({
			children: [
				menuLink({ "jcr:title": "A", "j:url": "/a" }),
				menuLink({ "jcr:title": "B", "j:url": "/b" }),
				menuLink({ "jcr:title": "C", "j:url": "/c" }),
			],
		});

		expect(mapTopBarTabs(tabMenu).map((t) => t.label)).toEqual(["A", "B"]);
	});
});
