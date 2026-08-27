import { describe, it, expect, vi } from "vitest";
import { makeNode, type PropValue } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#lib/cacheDependency", () => ({
	addDirectChildrenCacheDependency: vi.fn(),
	addNodeCacheDependency: vi.fn(),
	addSubtreeCacheDependency: vi.fn(),
}));

import { buildVideoObjects } from "./videoObject";

const ORIGIN = "https://www.sofinco.fr";
const CANONICAL = "https://www.sofinco.fr/actualite-credit/video";
const INPUT = {
	origin: ORIGIN,
	fallbackDescription: "Description de la page",
	inLanguage: "fr",
	publisher: { "@id": `${ORIGIN}/#organization` },
	id: (index: number) => `${CANONICAL}#video-${index + 1}`,
};

const video = (props: Record<string, PropValue> = {}) =>
	makeNode({
		nodeTypes: ["sofnt:videoBlock"],
		props: {
			// Titre VISIBLE d'un côté, libellé lecteur d'écran de l'autre : le CND
			// autorise explicitement les deux à différer, et c'est le premier que le
			// balisage doit reprendre.
			"jcr:title": "Comment financer sa voiture",
			"videoTitle": "Vidéo : comment financer sa voiture",
			"videoUrl": "https://www.youtube.com/embed/abc123",
			// Minuit LOCAL, comme le sélecteur de date de Jahia — un `Date.UTC(...)`
			// masquerait le décalage d'un jour que `getDate().iso` doit éviter.
			"uploadDate": { __millis: new Date(2026, 2, 31).getTime() },
			"durationSeconds": 114,
			"poster": makeNode({ url: "/files/poster.jpg" }),
			"subtitle": "Nos conseils en deux minutes.",
			"transcription": "<p>Bonjour&nbsp;et bienvenue.</p>",
			...props,
		},
	});

describe("buildVideoObjects", () => {
	it("construit la vidéo avec durée ISO, vignette absolue et retranscription à plat", () => {
		expect(buildVideoObjects([video()], INPUT)).toEqual([
			{
				"@type": "VideoObject",
				"@id": `${CANONICAL}#video-1`,
				"name": "Comment financer sa voiture",
				"description": "Nos conseils en deux minutes.",
				"thumbnailUrl": "https://www.sofinco.fr/files/poster.jpg",
				"uploadDate": "2026-03-31",
				"duration": "PT1M54S",
				"embedUrl": "https://www.youtube.com/embed/abc123",
				"transcript": "Bonjour et bienvenue.",
				"inLanguage": "fr",
				"publisher": { "@id": `${ORIGIN}/#organization` },
			},
		]);
	});

	it("déduit la vignette de l'URL YouTube quand le bloc n'a pas de poster", () => {
		// `thumbnailUrl` est requis par Google : sans repli, tout bloc sans poster
		// produisait un « Missing field thumbnailUrl » en Search Console.
		expect(
			buildVideoObjects([video({ poster: undefined as unknown as PropValue })], INPUT)[0]
				.thumbnailUrl,
			// `hqdefault` et non `maxresdefault` : cette dernière rend un 404 pour toute
			// vidéo qui n'a pas été publiée en haute définition.
		).toBe("https://i.ytimg.com/vi/abc123/hqdefault.jpg");
	});

	it("préfère le poster contribué à la vignette YouTube", () => {
		expect(buildVideoObjects([video()], INPUT)[0].thumbnailUrl).toBe(
			"https://www.sofinco.fr/files/poster.jpg",
		);
	});

	it("retombe sur la description de la page quand le bloc n'a pas de sous-titre", () => {
		expect(buildVideoObjects([video({ subtitle: "" })], INPUT)[0].description).toBe(
			"Description de la page",
		);
	});

	it("omet la durée quand elle n'est pas renseignée", () => {
		expect(buildVideoObjects([video({ durationSeconds: 0 })], INPUT)[0].duration).toBeUndefined();
	});

	it("écarte un bloc sans uploadDate — Google rejette le rich result sans elle", () => {
		expect(
			buildVideoObjects([video({ uploadDate: undefined as unknown as PropValue })], INPUT),
		).toEqual([]);
	});

	it("écarte un bloc sans titre ou sans URL de lecteur", () => {
		expect(buildVideoObjects([video({ "videoTitle": "", "jcr:title": "" })], INPUT)).toEqual([]);
		expect(buildVideoObjects([video({ videoUrl: "" })], INPUT)).toEqual([]);
	});

	it("reprend le titre visible, pas le libellé lecteur d'écran", () => {
		expect(buildVideoObjects([video()], INPUT)[0].name).toBe("Comment financer sa voiture");
	});

	it("convertit en URL de lecteur l'URL YouTube que colle le contributeur", () => {
		// Forme de loin la plus courante : sans conversion, `embedUrl` ne serait pas
		// une URL de lecteur et le rich result vidéo serait rejeté.
		expect(
			buildVideoObjects([video({ videoUrl: "https://www.youtube.com/watch?v=abc123" })], INPUT)[0]
				.embedUrl,
		).toBe("https://www.youtube.com/embed/abc123");
		expect(
			buildVideoObjects([video({ videoUrl: "https://youtu.be/abc123" })], INPUT)[0].embedUrl,
		).toBe("https://www.youtube.com/embed/abc123");
	});

	it("écarte un bloc dont l'URL n'est pas une vidéo YouTube", () => {
		// Le bloc visible ne rend alors aucun lecteur : baliser la page comme portant
		// une vidéo décrirait un contenu absent.
		expect(buildVideoObjects([video({ videoUrl: "https://vimeo.com/123456" })], INPUT)).toEqual([]);
	});

	it("écarte un bloc marqué comme exclu", () => {
		expect(buildVideoObjects([video({ excludeFromStructuredData: true })], INPUT)).toEqual([]);
	});

	it("numérote les @id sur les blocs RETENUS, sans trou", () => {
		const ids = buildVideoObjects(
			[video({ uploadDate: undefined as unknown as PropValue }), video(), video()],
			INPUT,
		).map((node) => node["@id"]);
		expect(ids).toEqual([`${CANONICAL}#video-1`, `${CANONICAL}#video-2`]);
	});
});
