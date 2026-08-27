import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { VideoBlockProps } from "sofinco-react";
import { str, imgUrl } from "#lib/jcr";
import type { TFunction } from "#lib/i18n";
import { buildTitleProps } from "../Shared/HeadingStyle/headingStyle.mapping";

/**
 * Pure URL normalizer. Accepts any common YouTube URL shape the contributor
 * is likely to paste and returns the canonical embed form expected by the
 * design system's <iframe>.
 *
 * Cases covered:
 *   - https://www.youtube.com/watch?v=ID[&...]   → https://www.youtube.com/embed/ID[?...]
 *   - https://youtu.be/ID[?...]                  → https://www.youtube.com/embed/ID[?...]
 *   - https://www.youtube.com/embed/ID[?...]     → unchanged (query preserved)
 *   - https://www.youtube-nocookie.com/embed/ID  → unchanged
 *   - anything else                              → "" (rejected)
 */
export function normalizeYouTubeUrl(input: string): string {
	if (!input) return "";
	const trimmed = input.trim();

	// 1. Already an /embed/ URL on a known YouTube host → keep as-is (normalize www. prefix).
	const embedMatch = trimmed.match(
		/^https?:\/\/(?:www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/([a-zA-Z0-9_-]+)(\?[^#]*)?$/,
	);
	if (embedMatch) {
		const [, domain, id, query = ""] = embedMatch;
		return `https://www.${domain}/embed/${id}${query}`;
	}

	// 2. /watch?v=ID → /embed/ID, transferring extra query params except `v`.
	const watchMatch = trimmed.match(/^https?:\/\/(?:www\.)?youtube\.com\/watch\?(.+)$/);
	if (watchMatch) {
		const queryString = watchMatch[1];
		const pairs = queryString.split("&");
		let videoId = "";
		const others: string[] = [];
		for (const pair of pairs) {
			const eq = pair.indexOf("=");
			const key = eq === -1 ? pair : pair.slice(0, eq);
			const value = eq === -1 ? "" : pair.slice(eq + 1);
			if (key === "v" && value) {
				videoId = value;
			} else if (key) {
				others.push(pair);
			}
		}
		if (!videoId) return "";
		const extra = others.length > 0 ? `?${others.join("&")}` : "";
		return `https://www.youtube.com/embed/${videoId}${extra}`;
	}

	// 3. youtu.be/ID → /embed/ID, query preserved.
	const shortMatch = trimmed.match(/^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)(\?[^#]*)?$/);
	if (shortMatch) {
		const [, id, query = ""] = shortMatch;
		return `https://www.youtube.com/embed/${id}${query}`;
	}

	// 4. Anything else (Vimeo, Dailymotion, arbitrary) → rejected.
	return "";
}

/**
 * Builds the React-side VideoBlock props from the JCR node.
 *
 * @param node - Le node JCR `sofnt:videoBlock`.
 * @param t    - Fonction i18n
 */
export function mapVideoBlockProps(node: JCRNodeWrapper, t: TFunction): VideoBlockProps {
	const headerTitle = str(node, "jcr:title");
	const previewUrl = imgUrl(node, "poster");
	const transcriptionContent = str(node, "transcription");

	return {
		title: buildTitleProps(node, headerTitle),
		subtitle: str(node, "subtitle"),
		video: {
			url: normalizeYouTubeUrl(str(node, "videoUrl")),
			title: str(node, "videoTitle"),
		},
		previewImg: previewUrl
			? {
					url: previewUrl,
					alt: str(node, "posterAlt"),
				}
			: undefined,
		transcription: {
			title: str(node, "transcriptionTitle") || t("videoBlock.transcriptionLabel"),
			content: transcriptionContent,
		},
	};
}
