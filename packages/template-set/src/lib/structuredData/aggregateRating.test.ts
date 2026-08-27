import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import {
	attachAggregateRating,
	buildAggregateRating,
	readRatingThresholds,
} from "./aggregateRating";
import type { JsonLdNode } from "./types";

const THRESHOLDS = { minValue: 4, minReviewCount: 100 };

describe("buildAggregateRating", () => {
	it("émet des NOMBRES, jamais des chaînes formatées", () => {
		const node = buildAggregateRating({ ratingValue: 4.23, reviewCount: 3576 }, THRESHOLDS);
		expect(node).toEqual({
			"@type": "AggregateRating",
			"ratingValue": 4.2,
			"reviewCount": 3576,
			"bestRating": 5,
			"worstRating": 1,
		});
		expect(JSON.stringify(node)).toContain('"ratingValue":4.2');
	});

	it("n'émet rien sous le seuil de note", () => {
		expect(buildAggregateRating({ ratingValue: 3.9, reviewCount: 3576 }, THRESHOLDS)).toBeNull();
	});

	it("n'émet rien sous le seuil de volume d'avis", () => {
		expect(buildAggregateRating({ ratingValue: 4.8, reviewCount: 99 }, THRESHOLDS)).toBeNull();
	});

	it("n'émet rien sans note", () => {
		expect(buildAggregateRating(null, THRESHOLDS)).toBeNull();
	});

	it("refuse un volume nul même quand le seuil est à zéro", () => {
		expect(
			buildAggregateRating({ ratingValue: 5, reviewCount: 0 }, { minValue: 0, minReviewCount: 0 }),
		).toBeNull();
	});

	it("n'émet rien pour une note hors de l'échelle 1–5", () => {
		// `bestRating`/`worstRating` sont émis en dur : hors échelle, le balisage serait
		// rejeté. Seuils permissifs pour isoler la garde d'échelle des seuils éditoriaux.
		const permissif = { minValue: 0, minReviewCount: 0 };
		expect(buildAggregateRating({ ratingValue: 0.8, reviewCount: 500 }, permissif)).toBeNull();
		expect(buildAggregateRating({ ratingValue: 5.4, reviewCount: 500 }, permissif)).toBeNull();
	});
});

describe("readRatingThresholds", () => {
	it("lit les seuils saisis sur le nœud de settings", () => {
		const settings = makeNode({ props: { ratingMinValue: 4.5, ratingMinReviewCount: 250 } });
		expect(readRatingThresholds(settings)).toEqual({ minValue: 4.5, minReviewCount: 250 });
	});

	it("retombe sur les défauts du CND sans nœud de settings", () => {
		expect(readRatingThresholds(null)).toEqual({ minValue: 4, minReviewCount: 50 });
	});

	it("retombe sur les défauts du CND quand les propriétés sont absentes", () => {
		// Cas d'un nœud antérieur à la montée de version du CND : sans repli il lirait
		// `0` et publierait n'importe quelle note.
		expect(readRatingThresholds(makeNode({ props: {} }))).toEqual({
			minValue: 4,
			minReviewCount: 50,
		});
	});

	it("conserve un seuil bas, qui n'est pas une absence", () => {
		// Le CND borne désormais `ratingMinValue` à [1,5] ; ce test porte sur le LECTEUR,
		// qui doit distinguer « seuil saisi à 1 » de « propriété absente ».
		const settings = makeNode({ props: { ratingMinValue: 1, ratingMinReviewCount: 0 } });
		expect(readRatingThresholds(settings)).toEqual({ minValue: 1, minReviewCount: 0 });
	});
});

describe("attachAggregateRating", () => {
	const rating: JsonLdNode = {
		"@type": "AggregateRating",
		"ratingValue": 4.2,
		"reviewCount": 3576,
	};
	const node = (type: string | string[]): JsonLdNode => ({ "@type": type });
	const graph = (...types: (string | string[])[]) => types.map(node);

	/** Retourne le `@type` du nœud qui porte la note, ou `undefined` si aucun ne la porte. */
	const host = (nodes: JsonLdNode[]) => nodes.find((n) => n.aggregateRating)?.["@type"];

	it("préfère LoanOrCredit à tout autre nœud", () => {
		const nodes = graph("Organization", "WebPage", "FAQPage", "Article", "LoanOrCredit");
		attachAggregateRating(nodes, rating);
		expect(host(nodes)).toBe("LoanOrCredit");
	});

	it("préfère Article à FAQPage et VideoObject", () => {
		const nodes = graph("WebPage", "VideoObject", "FAQPage", "Article");
		attachAggregateRating(nodes, rating);
		expect(host(nodes)).toBe("Article");
	});

	it("préfère FAQPage à VideoObject", () => {
		const nodes = graph("WebPage", "VideoObject", "FAQPage");
		attachAggregateRating(nodes, rating);
		expect(host(nodes)).toBe("FAQPage");
	});

	it("ne greffe la note que sur la PREMIÈRE vidéo d'une page multi-vidéos", () => {
		const nodes = graph("WebPage", "VideoObject", "VideoObject", "VideoObject");
		attachAggregateRating(nodes, rating);
		expect(nodes.filter((n) => n.aggregateRating)).toHaveLength(1);
		expect(nodes[1].aggregateRating).toEqual(rating);
	});

	it("retombe sur WebPage quand la page ne porte aucun contenu balisé", () => {
		const nodes = graph("Organization", "WebSite", "WebPage", "BreadcrumbList");
		attachAggregateRating(nodes, rating);
		expect(host(nodes)).toBe("WebPage");
	});

	it("reconnaît un nœud à typage multiple", () => {
		const nodes = graph(["WebPage", "CollectionPage"]);
		attachAggregateRating(nodes, rating);
		expect(nodes[0].aggregateRating).toEqual(rating);
	});

	it("ne touche à rien sans note", () => {
		const nodes = graph("WebPage");
		attachAggregateRating(nodes, null);
		expect(nodes[0]).not.toHaveProperty("aggregateRating");
	});

	it("ne touche à rien quand aucun nœud n'est éligible", () => {
		const nodes = graph("Organization", "WebSite");
		attachAggregateRating(nodes, rating);
		expect(nodes.some((n) => n.aggregateRating)).toBe(false);
	});
});
