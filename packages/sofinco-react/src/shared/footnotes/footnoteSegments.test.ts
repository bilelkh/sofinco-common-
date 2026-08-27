import { describe, it, expect } from "vitest";
import { splitFootnoteText, hasFootnoteReference } from "./footnoteSegments";

describe("hasFootnoteReference", () => {
	it("detects the server-rendered form and the raw token", () => {
		expect(hasFootnoteReference("Financez ⁽³⁾ vos projets")).toBe(true);
		expect(hasFootnoteReference("Financez ((3)) vos projets")).toBe(true);
	});

	it("is false for ordinary copy", () => {
		expect(hasFootnoteReference("Selon l’article (1) du code")).toBe(false);
		expect(hasFootnoteReference("")).toBe(false);
	});
});

describe("splitFootnoteText", () => {
	it("splits around a reference and keeps the surrounding text", () => {
		expect(splitFootnoteText("Financez ⁽³⁾ vos projets")).toEqual([
			{ kind: "text", value: "Financez " },
			{ kind: "reference", number: "3", visible: "⁽³⁾" },
			{ kind: "text", value: " vos projets" },
		]);
	});

	it("normalizes the raw token to the same output", () => {
		expect(splitFootnoteText("Financez ((3)) vos projets")).toEqual(
			splitFootnoteText("Financez ⁽³⁾ vos projets"),
		);
	});

	it("handles multi-digit numbers", () => {
		expect(splitFootnoteText("⁽¹⁰⁾")).toEqual([
			{ kind: "reference", number: "10", visible: "⁽¹⁰⁾" },
		]);
	});

	it("handles several references in one string", () => {
		const segments = splitFootnoteText("a ⁽¹⁾ b ⁽²⁾ c");
		expect(segments.filter((s) => s.kind === "reference").map((s) => s.number)).toEqual(["1", "2"]);
	});

	it("returns a single text segment when there is nothing to convert", () => {
		expect(splitFootnoteText("Un titre normal")).toEqual([
			{ kind: "text", value: "Un titre normal" },
		]);
		expect(splitFootnoteText("")).toEqual([{ kind: "text", value: "" }]);
	});

	it("leaves a non-numeric key as plain text rather than half-converting it", () => {
		expect(splitFootnoteText("((*))")).toEqual([{ kind: "text", value: "((*))" }]);
	});

	it("does not touch a single (1), which is common in legal copy", () => {
		expect(splitFootnoteText("Selon l’article (1) du code")).toEqual([
			{ kind: "text", value: "Selon l’article (1) du code" },
		]);
	});

	it("is deterministic — the shared regex is never left mid-scan", () => {
		// C'est cette propriété qui garantit l'identité serveur/client, donc l'hydratation.
		expect(splitFootnoteText("a ⁽¹⁾ b")).toEqual(splitFootnoteText("a ⁽¹⁾ b"));
	});
});
