import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { readTitleLevel, readTitleStyle, buildTitleProps } from "./headingStyle.mapping";

describe("readTitleLevel", () => {
	it("reads titleLevel from the sofmix:headingStyle mixin", () => {
		const node = makeNode({ props: { titleLevel: "h3" } });
		expect(readTitleLevel(node)).toBe("h3");
	});

	it("accepts every allowed level (h1-h4)", () => {
		for (const level of ["h1", "h2", "h3", "h4"] as const) {
			const node = makeNode({ props: { titleLevel: level } });
			expect(readTitleLevel(node)).toBe(level);
		}
	});

	it("defaults to 'h2' when titleLevel is absent (matches CND autocreated)", () => {
		const node = makeNode({ props: {} });
		expect(readTitleLevel(node)).toBe("h2");
	});

	it("falls back to 'h2' for an out-of-range value (defensive)", () => {
		const node = makeNode({ props: { titleLevel: "h7" } });
		expect(readTitleLevel(node)).toBe("h2");
	});

	it("honors a custom fallback when the value is missing", () => {
		const node = makeNode({ props: {} });
		expect(readTitleLevel(node, "h1")).toBe("h1");
	});

	it("honors a custom fallback when the value is invalid", () => {
		const node = makeNode({ props: { titleLevel: "banana" } });
		expect(readTitleLevel(node, "h4")).toBe("h4");
	});
});

describe("readTitleStyle", () => {
	it("reads titleStyle from the sofmix:headingStyle mixin", () => {
		const node = makeNode({ props: { titleStyle: "h1" } });
		expect(readTitleStyle(node)).toBe("h1");
	});

	it("defaults to 'h2' when titleStyle is absent", () => {
		const node = makeNode({ props: {} });
		expect(readTitleStyle(node)).toBe("h2");
	});

	it("falls back to 'h2' for an invalid value", () => {
		const node = makeNode({ props: { titleStyle: "wat" } });
		expect(readTitleStyle(node)).toBe("h2");
	});

	it("honors a custom fallback when the value is missing", () => {
		const node = makeNode({ props: {} });
		expect(readTitleStyle(node, "h3")).toBe("h3");
	});

	it("is independent from titleLevel (SEO/visuel décorrélés)", () => {
		const node = makeNode({ props: { titleLevel: "h3", titleStyle: "h2" } });
		expect(readTitleLevel(node)).toBe("h3");
		expect(readTitleStyle(node)).toBe("h2");
	});
});

describe("buildTitleProps", () => {
	it("builds TitleProps from the heading mixin and the title text", () => {
		const node = makeNode({ props: { titleLevel: "h3", titleStyle: "h2" } });
		expect(buildTitleProps(node, "Mon titre")).toEqual({
			children: "Mon titre",
			as: "h3",
			visualStyle: "h2",
		});
	});

	it("defaults as/visualStyle to 'h2' when mixin fields are missing", () => {
		const node = makeNode({ props: {} });
		expect(buildTitleProps(node, "Mon titre")).toEqual({
			children: "Mon titre",
			as: "h2",
			visualStyle: "h2",
		});
	});

	it("returns undefined for an empty title (React omits the empty header)", () => {
		const node = makeNode({ props: { titleLevel: "h3" } });
		expect(buildTitleProps(node, "")).toBeUndefined();
	});

	it("applies a custom fallback to both fields when JCR values are missing", () => {
		const node = makeNode({ props: {} });
		expect(buildTitleProps(node, "T", "h1")).toEqual({
			children: "T",
			as: "h1",
			visualStyle: "h1",
		});
	});

	it("sanitizes invalid mixin values defensively (defaults to h2)", () => {
		const node = makeNode({ props: { titleLevel: "h9", titleStyle: "big" } });
		expect(buildTitleProps(node, "T")).toEqual({
			children: "T",
			as: "h2",
			visualStyle: "h2",
		});
	});
});
