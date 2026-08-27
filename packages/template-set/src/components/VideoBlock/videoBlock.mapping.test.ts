import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import { mapVideoBlockProps, normalizeYouTubeUrl } from "./videoBlock.mapping";

// `t` fixture partagée : renvoie le label FR pour la clé transcription, sinon
// renvoie la clé (aide au debug de tests avec traduction manquante).
const t = (key: string): string =>
	key === "videoBlock.transcriptionLabel" ? "Retranscription vidéo" : key;

// ──────────────────────────────────────────────────────────────────────────────
// normalizeYouTubeUrl
// ──────────────────────────────────────────────────────────────────────────────

describe("normalizeYouTubeUrl", () => {
	it("converts /watch?v=ID to /embed/ID", () => {
		expect(normalizeYouTubeUrl("https://www.youtube.com/watch?v=abc123")).toBe(
			"https://www.youtube.com/embed/abc123",
		);
	});

	it("preserves extra query params when converting /watch", () => {
		expect(
			normalizeYouTubeUrl("https://www.youtube.com/watch?v=abc123&start=42&rel=0"),
		).toBe("https://www.youtube.com/embed/abc123?start=42&rel=0");
	});

	it("converts youtu.be short links to /embed/", () => {
		expect(normalizeYouTubeUrl("https://youtu.be/abc123")).toBe(
			"https://www.youtube.com/embed/abc123",
		);
	});

	it("preserves query params on youtu.be links", () => {
		expect(normalizeYouTubeUrl("https://youtu.be/abc123?t=42")).toBe(
			"https://www.youtube.com/embed/abc123?t=42",
		);
	});

	it("keeps an already-canonical /embed/ URL unchanged", () => {
		const url = "https://www.youtube.com/embed/abc123?start=10";
		expect(normalizeYouTubeUrl(url)).toBe(url);
	});

	it("accepts the privacy-enhanced youtube-nocookie.com domain", () => {
		const url = "https://www.youtube-nocookie.com/embed/abc123";
		expect(normalizeYouTubeUrl(url)).toBe(url);
	});

	it("normalizes hosts without leading www.", () => {
		expect(normalizeYouTubeUrl("https://youtube.com/watch?v=abc123")).toBe(
			"https://www.youtube.com/embed/abc123",
		);
	});

	it("returns empty string for non-YouTube hosts", () => {
		expect(normalizeYouTubeUrl("https://vimeo.com/123456")).toBe("");
		expect(normalizeYouTubeUrl("https://example.com/video.mp4")).toBe("");
	});

	it("returns empty string for malformed URLs", () => {
		expect(normalizeYouTubeUrl("not a url")).toBe("");
		expect(normalizeYouTubeUrl("")).toBe("");
	});

	it("returns empty string when /watch has no v= parameter", () => {
		expect(normalizeYouTubeUrl("https://www.youtube.com/watch")).toBe("");
	});

	it("returns empty string when youtu.be path is empty", () => {
		expect(normalizeYouTubeUrl("https://youtu.be/")).toBe("");
	});

	// Régression : URL réelle utilisée pour tester le composant en bout en bout.
	it("normalizes the production test URL (videoId=8EzRv2v3ybs)", () => {
		expect(normalizeYouTubeUrl("https://www.youtube.com/watch?v=8EzRv2v3ybs")).toBe(
			"https://www.youtube.com/embed/8EzRv2v3ybs",
		);
	});
});

// ──────────────────────────────────────────────────────────────────────────────
// mapVideoBlockProps
// ──────────────────────────────────────────────────────────────────────────────

describe("mapVideoBlockProps", () => {
	it("maps the full nominal case with title, subtitle, poster and transcription", () => {
		const node = makeNode({
			props: {
				"jcr:title": "Découvrez le prêt personnel",
				"subtitle": "Un projet financé en 3 clics",
				"titleLevel": "h2",
				"titleStyle": "h2",
				"videoUrl": "https://www.youtube.com/watch?v=abc123",
				"videoTitle": "Vidéo Sofinco : C'est quoi un prêt perso ?",
				"poster": "preview.png",
				"posterAlt": "Vignette de la vidéo",
				"transcriptionTitle": "Retranscription vidéo",
				"transcription": "<p>Bonjour, …</p>",
			},
		});

		expect(mapVideoBlockProps(node, t)).toEqual({
			title: {
				children: "Découvrez le prêt personnel",
				as: "h2",
				visualStyle: "h2",
			},
			subtitle: "Un projet financé en 3 clics",
			video: {
				url: "https://www.youtube.com/embed/abc123",
				title: "Vidéo Sofinco : C'est quoi un prêt perso ?",
			},
			previewImg: {
				url: "preview.png",
				alt: "Vignette de la vidéo",
			},
			transcription: {
				title: "Retranscription vidéo",
				content: "<p>Bonjour, …</p>",
			},
		});
	});

	it("propagates titleLevel and titleStyle from sofmix:headingStyle to TitleProps", () => {
		const node = makeNode({
			props: {
				"jcr:title": "Titre custom",
				"titleLevel": "h3",
				"titleStyle": "h2",
				"videoUrl": "https://youtu.be/abc",
				"videoTitle": "Vidéo",
			},
		});
		const result = mapVideoBlockProps(node, t);
		// `as` = H3 sémantique (SEO/a11y), `visualStyle` = H2 apparence visuelle.
		expect(result.title).toEqual({
			children: "Titre custom",
			as: "h3",
			visualStyle: "h2",
		});
	});

	it("defaults TitleProps to h2/h2 when heading mixin fields are missing", () => {
		const node = makeNode({
			props: {
				"jcr:title": "Titre",
				"videoUrl": "https://youtu.be/abc",
				"videoTitle": "Vidéo",
			},
		});
		const result = mapVideoBlockProps(node, t);
		expect(result.title).toEqual({ children: "Titre", as: "h2", visualStyle: "h2" });
	});

	it("omits title prop when jcr:title is empty (DS will skip the header)", () => {
		const node = makeNode({
			props: {
				"videoUrl": "https://youtu.be/abc",
				"videoTitle": "Vidéo",
			},
		});
		const result = mapVideoBlockProps(node, t);
		expect(result.title).toBeUndefined();
	});

	it("returns an empty subtitle string when subtitle is not contributed (DS skips the falsy header)", () => {
		const node = makeNode({
			props: {
				"jcr:title": "T",
				"videoUrl": "https://youtu.be/abc",
				"videoTitle": "Vidéo",
			},
		});
		const result = mapVideoBlockProps(node, t);
		expect(result.subtitle).toBe("");
	});

	it("omits previewImg when poster is empty", () => {
		const node = makeNode({
			props: {
				"videoUrl": "https://youtu.be/abc",
				"videoTitle": "Vidéo",
			},
		});
		const result = mapVideoBlockProps(node, t);
		expect(result.previewImg).toBeUndefined();
	});

	it("returns an empty alt string when posterAlt is empty (decorative image)", () => {
		const node = makeNode({
			props: {
				"videoUrl": "https://youtu.be/abc",
				"videoTitle": "Vidéo",
				"poster": "preview.png",
			},
		});
		expect(mapVideoBlockProps(node, t).previewImg).toEqual({
			url: "preview.png",
			alt: "",
		});
	});

	it("falls back to i18n label when transcriptionTitle is empty", () => {
		const node = makeNode({
			props: {
				"videoUrl": "https://youtu.be/abc",
				"videoTitle": "Vidéo",
				"transcription": "<p>Texte.</p>",
			},
		});
		expect(mapVideoBlockProps(node, t).transcription.title).toBe("Retranscription vidéo");
	});

	it("returns an empty content string when transcription is not contributed", () => {
		const node = makeNode({
			props: {
				"videoUrl": "https://youtu.be/abc",
				"videoTitle": "Vidéo",
			},
		});
		expect(mapVideoBlockProps(node, t).transcription.content).toBe("");
	});

	it("normalizes the video URL even when contributor pastes a watch link", () => {
		const node = makeNode({
			props: {
				"videoUrl": "https://www.youtube.com/watch?v=xyz&start=10",
				"videoTitle": "Vidéo",
			},
		});
		expect(mapVideoBlockProps(node, t).video.url).toBe(
			"https://www.youtube.com/embed/xyz?start=10",
		);
	});

	it("returns an empty video URL when contributor enters an invalid one (consumer decides)", () => {
		const node = makeNode({
			props: {
				"videoUrl": "https://vimeo.com/123",
				"videoTitle": "Vidéo",
			},
		});
		expect(mapVideoBlockProps(node, t).video.url).toBe("");
	});
});
